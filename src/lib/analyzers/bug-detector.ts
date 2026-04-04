import { ChangedFile, Finding } from "../types";
import {
  extractAddedLines,
  isCommentLine,
  isJSLike,
  isPython,
  isTestFile,
  isConfigFile,
  stripComment,
} from "./utils";

interface Rule {
  id: string;
  pattern: RegExp;
  title: string;
  description: string;
  severity: Finding["severity"];
  suggestion: string;
  /** Only fire in files matching these languages. undefined = all code files. */
  languages?: ("javascript" | "typescript" | "python" | "any")[];
  /** Skip this rule in test files. */
  skipTests?: boolean;
}

const RULES: Rule[] = [
  // ──────────────── JS/TS specific ────────────────
  {
    id: "loose-null",
    pattern: /[^=!]=\s*null\b|[^=!]!=\s*null\b/,
    title: "Loose null comparison (== null / != null)",
    description:
      "In JavaScript, `== null` matches both `null` and `undefined` due to type coercion. " +
      "While sometimes intentional, this often catches developers off guard — " +
      "`0 == null` is false but `undefined == null` is true. In a codebase where " +
      "strict equality is the norm, a loose check signals the author may not have intended the coercion.",
    severity: "medium",
    suggestion:
      "Use `=== null` or `=== undefined` explicitly. If you intentionally want to match both, add a comment: `// intentionally loose — matches null | undefined`.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "async-foreach",
    pattern: /\.forEach\s*\(\s*(async\b|[^)]*=>\s*\{?\s*await)/,
    title: "Async callback inside .forEach() — promises are silently dropped",
    description:
      "Array.forEach() ignores the return value of its callback. When you pass an async function, " +
      "each iteration returns a Promise that nobody awaits. This means errors inside the callback " +
      "are silently swallowed, and the code after forEach runs before the async work finishes. " +
      "In production, this causes race conditions, missing data, and phantom 'success' responses " +
      "where the actual work failed.",
    severity: "high",
    suggestion:
      "Use `for...of` with `await` for sequential execution:\n" +
      "```\nfor (const item of items) { await process(item); }\n```\n" +
      "Or `Promise.all()` for parallel execution:\n" +
      "```\nawait Promise.all(items.map(item => process(item)));\n```",
    languages: ["javascript", "typescript"],
  },
  {
    id: "eval",
    pattern: /\beval\s*\(/,
    title: "eval() executes arbitrary strings as code",
    description:
      "eval() compiles and runs any string as code in the current scope. If the string comes " +
      "from user input, URL parameters, or any external source, an attacker can execute " +
      "arbitrary JavaScript — steal cookies, exfiltrate data, or take over the session. " +
      "Even with trusted input, eval blocks engine optimizations and creates scope-chain bugs " +
      "that are nearly impossible to debug.",
    severity: "critical",
    suggestion:
      "Almost every use of eval has a safer alternative:\n" +
      "• Parsing data → `JSON.parse()`\n" +
      "• Dynamic property access → bracket notation `obj[key]`\n" +
      "• Math expressions → a safe expression parser library\n" +
      "• Template rendering → a template engine",
    languages: ["javascript", "typescript"],
  },
  {
    id: "debugger",
    pattern: /^\s*debugger\s*;?\s*$/,
    title: "debugger statement left in code",
    description:
      "A `debugger` statement pauses execution when DevTools is open. If this reaches production, " +
      "it will freeze the browser for any user who happens to have DevTools open (common among " +
      "developers and power users). It also signals the code may not have gone through proper review.",
    severity: "high",
    suggestion: "Remove the debugger statement. Use conditional breakpoints in DevTools instead.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "var-keyword",
    pattern: /\bvar\s+\w+\s*=/,
    title: "'var' declaration — function-scoped, not block-scoped",
    description:
      "Unlike `let` and `const`, `var` is scoped to the nearest function, not the nearest block. " +
      "This means a `var` inside an `if` or `for` leaks into the surrounding function. " +
      "Classic bugs: loop variables shared across closures, accidental redeclaration, " +
      "and hoisting where the variable exists before its declaration line (as `undefined`).",
    severity: "low",
    suggestion:
      "Use `const` for values that don't change, `let` for values that do. Both are block-scoped and predictable.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "promise-no-catch",
    pattern: /\.then\s*\([^)]*\)\s*;?\s*$/,
    title: "Promise .then() without .catch() — errors silently vanish",
    description:
      "A `.then()` chain without a `.catch()` means any rejection in the chain becomes an " +
      "unhandled promise rejection. In Node.js, this used to silently disappear; now it crashes " +
      "the process. In browsers, it logs to console but the calling code has no idea the " +
      "operation failed — the UI may show a success state while the data was never saved.",
    severity: "medium",
    suggestion:
      "Add `.catch(err => handleError(err))` at the end of the chain, or refactor to `async/await` " +
      "with try/catch for clearer error flow.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "array-index-of-boolean",
    pattern: /if\s*\(.*\.indexOf\s*\([^)]+\)\s*\)/,
    title: "indexOf() used as boolean — 0 is a valid match but falsy",
    description:
      "`.indexOf()` returns -1 for no match and the index (0, 1, 2, ...) for a match. " +
      "Using it directly in an `if` condition treats index 0 as false, meaning the first " +
      "element is never matched. This is a common source of 'works with most data but breaks " +
      "with the first item' bugs.",
    severity: "medium",
    suggestion:
      "Use `.includes()` for boolean checks, or compare explicitly: `if (arr.indexOf(x) !== -1)`. " +
      "For modern code: `if (arr.includes(x))`.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "delete-array",
    pattern: /\bdelete\s+\w+\[\d+\]/,
    title: "Using 'delete' on array element creates a sparse hole",
    description:
      "`delete arr[i]` removes the value but keeps the slot — the array length doesn't change " +
      "and the index becomes `undefined`. Iterating later with `.map()` or `.forEach()` skips " +
      "the hole, while a `for` loop sees `undefined`. This inconsistency causes subtle data " +
      "corruption bugs.",
    severity: "medium",
    suggestion: "Use `arr.splice(i, 1)` to remove and shift elements, or `arr.filter()` to create a new array.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "new-date-string",
    pattern: /new Date\s*\(\s*['"][^'"]*['"]\s*\)/,
    title: "Parsing date from string — format varies across engines",
    description:
      "`new Date('...')` parses date strings differently across browsers and Node versions. " +
      "For example, `new Date('2024-01-15')` is midnight UTC in V8 but midnight local in Safari. " +
      "`new Date('01/15/2024')` is US-format in Chrome but invalid in some engines. " +
      "This causes dates to be off by one day depending on the user's timezone and browser.",
    severity: "medium",
    suggestion:
      "Use a date library (date-fns, dayjs, luxon) for parsing, or construct with explicit parts: " +
      "`new Date(2024, 0, 15)` (month is 0-indexed).",
    languages: ["javascript", "typescript"],
  },
  {
    id: "float-equality",
    pattern: /===?\s*0\.\d+|\b0\.\d+\s*===?/,
    title: "Exact equality check on floating-point number",
    description:
      "Floating-point arithmetic in JavaScript (and most languages) has precision limits. " +
      "`0.1 + 0.2 === 0.3` is `false` because the result is actually 0.30000000000000004. " +
      "Direct equality checks on decimal numbers will intermittently fail depending on " +
      "the specific computation path.",
    severity: "medium",
    suggestion:
      "Compare with a tolerance: `Math.abs(a - b) < Number.EPSILON` or use integer arithmetic " +
      "(e.g., cents instead of dollars).",
    languages: ["javascript", "typescript"],
  },

  // ──────────────── Python specific ────────────────
  {
    id: "bare-except",
    pattern: /except\s*:/,
    title: "Bare except: catches everything including KeyboardInterrupt and SystemExit",
    description:
      "A bare `except:` catches ALL exceptions — including `KeyboardInterrupt` (Ctrl+C), " +
      "`SystemExit` (process shutdown), and `GeneratorExit`. This means your code can prevent " +
      "the process from stopping, silently swallow `MemoryError`, and make debugging impossible " +
      "because every error is hidden. In production, this turns bugs into mystery failures " +
      "where the app keeps running but produces wrong results.",
    severity: "high",
    suggestion:
      "Catch specific exceptions: `except ValueError:`, `except (KeyError, TypeError):`. " +
      "If you truly need a broad catch, use `except Exception:` which still lets `SystemExit` " +
      "and `KeyboardInterrupt` propagate.",
    languages: ["python"],
  },
  {
    id: "broad-exception",
    pattern: /except\s+Exception\s*(?:as\s+\w+\s*)?:/,
    title: "Catching Exception is too broad — hides bugs in the call chain",
    description:
      "`except Exception:` catches everything that's not a system-exit signal. While better " +
      "than bare `except:`, it still swallows `AttributeError`, `TypeError`, `NameError` — errors " +
      "that almost always indicate a bug in YOUR code, not a recoverable situation. When you " +
      "catch these, the bug still exists but now it's silent and the function returns wrong data.",
    severity: "medium",
    suggestion:
      "Narrow the catch to what you expect: `except (ConnectionError, TimeoutError):` for network " +
      "calls, `except json.JSONDecodeError:` for parsing. Log unexpected exceptions with full tracebacks.",
    languages: ["python"],
  },
  {
    id: "print-statement",
    pattern: /^\s*print\s*\(/,
    title: "print() statement — not appropriate for production logging",
    description:
      "print() writes to stdout with no timestamp, severity level, or structured format. " +
      "In production, these messages pollute logs, can't be filtered by level, aren't " +
      "captured by monitoring tools, and in web frameworks they often end up nowhere " +
      "because stdout isn't connected to the log collector.",
    severity: "low",
    suggestion:
      "Use the `logging` module: `logging.info()` for operational info, `logging.debug()` " +
      "for development, `logging.warning()` for issues. Configure formatters and handlers for your deployment.",
    languages: ["python"],
    skipTests: true,
  },

  // ──────────────── Cross-language ────────────────
  {
    id: "hardcoded-password",
    pattern: /(?:password|passwd|pwd)\s*=\s*['"][^'"]{3,}['"]/i,
    title: "Hardcoded password in source code",
    description:
      "A password is embedded directly in the source code. Anyone with read access to the repo " +
      "(current devs, former employees, compromised CI, public mirrors) can see it. Passwords " +
      "in source code can't be rotated without a code deploy, appear in git history forever " +
      "(even after deletion), and often end up in logs and error messages.",
    severity: "critical",
    suggestion:
      "Move to environment variables (`process.env.DB_PASSWORD`) or a secrets manager " +
      "(AWS Secrets Manager, HashiCorp Vault, Doppler). Never commit credentials — use " +
      "`.env` files locally and inject secrets in CI/CD.",
  },
  {
    id: "hardcoded-secret",
    pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)\s*=\s*['"][^'"]{8,}['"]/i,
    title: "Hardcoded API key / secret token in source code",
    description:
      "An API key or secret token is hardcoded in the source. API keys in source code get " +
      "leaked through git history, CI logs, error reports, and public forks. Automated " +
      "bots scan GitHub for leaked AWS keys, Stripe keys, and similar — exploitation can " +
      "happen within minutes of a push.",
    severity: "critical",
    suggestion:
      "Store secrets in environment variables or a secrets manager. For local dev, use a `.env` file " +
      "(gitignored). For CI/CD, use the platform's secret storage (GitHub Actions secrets, Vercel env vars).",
  },
  {
    id: "console-log",
    pattern: /console\.(log|debug|info)\s*\(/,
    title: "console.log/debug/info left in code",
    description:
      "Console statements are fine during development but problematic in production: " +
      "they expose internal state (including potentially sensitive data) to anyone who opens " +
      "DevTools, they clutter browser console making real debugging harder, and in " +
      "high-throughput Node.js code, synchronous console.log can actually cause performance issues.",
    severity: "low",
    suggestion:
      "Remove before merging, or replace with a structured logging library that can be " +
      "silenced in production (winston, pino, loglevel).",
    languages: ["javascript", "typescript"],
    skipTests: true,
  },
  {
    id: "todo-fixme",
    pattern: /\b(TODO|FIXME|HACK|XXX)\b(?!.*\b(issue|ticket|jira|linear|#\d+)\b)/i,
    title: "Unresolved TODO/FIXME merged without a tracking reference",
    description:
      "A TODO/FIXME marker was merged without linking to a ticket or issue. Untracked TODOs " +
      "accumulate as hidden tech debt — the knowledge of what needs fixing exists only in the " +
      "original author's head. After a few months, nobody remembers the context and the TODO " +
      "becomes permanent dead weight.",
    severity: "low",
    suggestion:
      "Either resolve it in this PR, or add a tracking reference: `TODO(#1234): handle edge case` " +
      "or `FIXME(PROJ-567): optimize query`. This makes it searchable and accountable.",
  },
  {
    id: "hardcoded-sleep",
    pattern: /(?:sleep|setTimeout|delay)\s*\(\s*\d{3,}\s*\)/,
    title: "Hardcoded sleep/delay — likely a flaky timing hack",
    description:
      "Large hardcoded sleep values (like `sleep(5000)`) suggest the code is waiting for " +
      "something to finish but has no way to know when it's actually done. This is the #1 " +
      "cause of flaky tests and intermittent production bugs — it works on the developer's " +
      "fast machine but fails under load or on slower CI runners.",
    severity: "medium",
    suggestion:
      "Replace with event-based waiting: poll for a condition, use a callback/promise, " +
      "subscribe to an event, or use a library's built-in retry/wait mechanism.",
  },
  {
    id: "catch-and-ignore",
    pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/,
    title: "Empty catch block — errors silently swallowed",
    description:
      "An empty `catch {}` block means the code throws an error but nobody ever sees it. " +
      "The operation fails silently, downstream code assumes it succeeded, and the user sees " +
      "stale data or incomplete results with no error message. This is one of the hardest " +
      "bugs to diagnose because there's no log, no stack trace, no indication anything went wrong.",
    severity: "high",
    suggestion:
      "At minimum, log the error: `catch (err) { console.error('Context:', err); }`. " +
      "Better: re-throw if you can't handle it, or return an error result the caller can check.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "typeof-undefined-string",
    pattern: /typeof\s+\w+\s*===?\s*['"]undefined['"]/,
    title: "typeof check for 'undefined' — may mask variable name typos",
    description:
      "`typeof x === 'undefined'` returns true both when x is genuinely undefined AND when x " +
      "was never declared (typo in variable name). In modern code where variables are always " +
      "declared with let/const, a direct `x === undefined` check is safer because it will " +
      "throw a ReferenceError for typos instead of silently returning true.",
    severity: "low",
    suggestion:
      "In modern code, prefer `x === undefined` or optional chaining `x?.prop`. The typeof " +
      "idiom is only needed when checking globals that may not exist (e.g., `typeof window`).",
    languages: ["javascript", "typescript"],
  },
  {
    id: "assignment-in-condition",
    pattern: /if\s*\([^=]*[^=!<>]=\s*[^=]/,
    title: "Possible assignment (=) in if condition instead of comparison (===)",
    description:
      "Using `=` inside an `if()` condition assigns a value instead of comparing. " +
      "`if (x = 5)` sets x to 5 and always evaluates as truthy. This is almost always " +
      "a typo where `===` was intended. The condition silently corrupts the variable " +
      "and the branch always executes.",
    severity: "high",
    suggestion:
      "Use `===` for comparison. If assignment in a condition is intentional (e.g., `while (line = reader.read())`), " +
      "wrap it in extra parens to signal intent: `if ((x = getValue()))` — but prefer a separate line.",
    languages: ["javascript", "typescript"],
  },
];

const PYTHON_MUTABLE_DEFAULT = /def\s+\w+\s*\([^)]*=\s*(\[\s*]|\{\s*}|set\s*\(\s*\))/;

export function analyzeBugs(files: ChangedFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (file.status === "removed") continue;
    if (isConfigFile(file.filename)) continue;

    const isTest = isTestFile(file.filename);

    if (file.patch) {
      const addedLines = extractAddedLines(file.patch);
      for (const { lineNumber, content } of addedLines) {
        if (isCommentLine(content, file.filename)) continue;
        if (!content.trim()) continue;

        const codePortion = stripComment(content, file.filename);

        for (const rule of RULES) {
          if (rule.skipTests && isTest) continue;

          if (rule.languages && !rule.languages.includes("any")) {
            const jsLike = isJSLike(file.filename);
            const py = isPython(file.filename);
            const langMatch = rule.languages.some(
              (l) =>
                l === "any" ||
                (l === "javascript" && jsLike) ||
                (l === "typescript" && jsLike) ||
                (l === "python" && py)
            );
            if (!langMatch) continue;
          }

          if (rule.pattern.test(codePortion)) {
            findings.push({
              title: rule.title,
              description: rule.description,
              severity: rule.severity,
              filePath: file.filename,
              lineNumber,
              codeSnippet: content.trim(),
              suggestion: rule.suggestion,
              category: "bug",
            });
          }
        }
      }
    }

    // Full file: Python mutable defaults
    if (file.rawContent && isPython(file.filename)) {
      const lines = file.rawContent.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (PYTHON_MUTABLE_DEFAULT.test(lines[i])) {
          findings.push({
            title: "Mutable default argument — shared state across function calls",
            description:
              "Python evaluates default arguments ONCE when the function is defined, not each time " +
              "it's called. A default `[]` or `{}` is shared across all calls. If any call mutates it " +
              "(append, setdefault, etc.), the mutation persists into the next call. This causes " +
              "'haunted' behavior where a function's output depends on how many times it was called before.\n\n" +
              "Example: `def add_item(item, items=[]):` — calling `add_item('a')` then `add_item('b')` " +
              "returns `['a', 'b']` on the second call, not `['b']`.",
            severity: "high",
            filePath: file.filename,
            lineNumber: i + 1,
            codeSnippet: lines[i].trim(),
            suggestion:
              "Use `None` as the default and create a new container inside:\n" +
              "```python\ndef add_item(item, items=None):\n    if items is None:\n        items = []\n    items.append(item)\n    return items\n```",
            category: "bug",
          });
        }
      }
    }
  }

  return findings;
}
