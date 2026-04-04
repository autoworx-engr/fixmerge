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
  languages?: ("javascript" | "typescript" | "python" | "any")[];
  skipTests?: boolean;
  skipConfigs?: boolean;
}

const RULES: Rule[] = [
  {
    id: "line-too-long",
    pattern: /^.{200,}$/,
    title: "Line exceeds 200 characters",
    description:
      "Lines over 200 characters force horizontal scrolling in code review, " +
      "make diffs unreadable (GitHub truncates at ~180 chars), and are usually a signal " +
      "that the line is doing too much — a complex expression, a chain of method calls, or " +
      "an inline object that should be extracted.",
    severity: "low",
    suggestion:
      "Break long expressions into named variables:\n" +
      "```\n// Before: one 250-char line\n" +
      "const result = users.filter(u => u.active && u.role === 'admin').map(u => ({ id: u.id, name: u.fullName }));\n\n" +
      "// After: clear intent at each step\n" +
      "const admins = users.filter(u => u.active && u.role === 'admin');\n" +
      "const result = admins.map(u => ({ id: u.id, name: u.fullName }));\n```",
    skipConfigs: true,
  },
  {
    id: "eslint-disable",
    pattern: /\/\/\s*eslint-disable(?:-next-line)?\b/,
    title: "ESLint rule disabled — lint warning suppressed instead of fixed",
    description:
      "An ESLint rule was suppressed with a disable comment. While sometimes necessary, " +
      "this often means the developer hit a warning they didn't want to deal with and silenced " +
      "it instead of fixing the root cause. Over time, disable comments accumulate and the " +
      "linter becomes useless — it's configured to catch issues but the actual issues are all ignored.",
    severity: "medium",
    suggestion:
      "Fix the underlying issue. If the rule is genuinely wrong for this case, add a justification " +
      "comment: `// eslint-disable-next-line no-unused-vars -- used via reflection`. " +
      "If you're disabling the same rule repeatedly, consider adjusting the rule config instead.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "ts-ignore",
    pattern: /\/\/\s*@ts-ignore\b|\/\/\s*@ts-expect-error\b/,
    title: "TypeScript type checking suppressed",
    description:
      "`@ts-ignore` tells TypeScript to skip type-checking the next line. This means if the " +
      "types change later (someone renames a property, changes a return type), TypeScript " +
      "won't catch the breakage — the error is hidden until runtime.\n\n" +
      "`@ts-expect-error` is slightly better (it fails if there's no error to suppress) " +
      "but still hides type issues.",
    severity: "medium",
    suggestion:
      "Fix the type error properly. Common fixes:\n" +
      "• Add a type assertion: `(value as ExpectedType).prop`\n" +
      "• Narrow with a type guard: `if ('prop' in obj) { ... }`\n" +
      "• Fix the type definition if it's wrong\n" +
      "If suppression is truly needed, use `@ts-expect-error` with a comment explaining why.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "noqa",
    pattern: /#\s*noqa\b|#\s*type:\s*ignore\b/,
    title: "Python linter/type-checker suppressed",
    description:
      "`# noqa` tells flake8/ruff to ignore the line, and `# type: ignore` tells mypy to skip " +
      "type checking. Like `eslint-disable`, this hides real issues. Each suppression makes " +
      "the linter/type-checker less effective and creates a hidden assumption that may break later.",
    severity: "medium",
    suggestion:
      "Fix the underlying issue. If suppression is necessary, add a specific code: " +
      "`# noqa: E501` (specific rule) instead of blanket `# noqa` (all rules). " +
      "For type errors, use `cast()` or fix the type annotation.",
    languages: ["python"],
  },
  {
    id: "any-type",
    pattern: /:\s*any\b|<any>|as\s+any\b/,
    title: "TypeScript 'any' type — disables type safety for this value",
    description:
      "`any` is TypeScript's escape hatch — it disables ALL type checking for that value. " +
      "Code that touches an `any` value loses every guarantee TypeScript provides: no typo " +
      "detection on property names, no wrong-argument-count errors, no null checks. " +
      "The `any` type is contagious — it spreads to anything the value touches.\n\n" +
      "Every `any` is a place where a runtime `TypeError` can hide undetected.",
    severity: "medium",
    suggestion:
      "Replace with the actual type. Common alternatives:\n" +
      "• `unknown` — safe version of any, requires type narrowing before use\n" +
      "• `Record<string, unknown>` — for arbitrary objects\n" +
      "• Generics — `function parse<T>(input: string): T` for flexible but type-safe functions\n" +
      "• Declare the actual shape: `interface ApiResponse { data: User[]; total: number; }`",
    languages: ["typescript"],
    skipTests: true,
  },
  {
    id: "wildcard-import-js",
    pattern: /import\s+\*\s+as\s+\w+\s+from/,
    title: "Wildcard import — imports entire module namespace",
    description:
      "Importing everything from a module with `import * as X from '...'` pulls in every " +
      "export. This defeats tree-shaking (bundlers can't determine which exports you actually " +
      "use), increases bundle size, and makes it unclear which specific functions/classes " +
      "are being used — `X.something()` hides the dependency.",
    severity: "low",
    suggestion:
      "Import only what you need: `import { specificFunction, SpecificClass } from '...'`. " +
      "This enables tree-shaking and makes dependencies explicit.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "wildcard-import-python",
    pattern: /^\s*from\s+\S+\s+import\s+\*/,
    title: "Python wildcard import — pollutes namespace",
    description:
      "`from module import *` dumps all public names from a module into the current namespace. " +
      "This causes name collisions (two modules defining the same name), makes it impossible " +
      "to know where a name came from when reading code, and breaks static analysis tools " +
      "that track imports.",
    severity: "medium",
    suggestion:
      "Import specific names: `from module import ClassName, helper_function`. " +
      "For large imports, use the module namespace: `import module` and reference as `module.func()`.",
    languages: ["python"],
  },
  {
    id: "empty-catch-python",
    pattern: /except\s+\w+.*:\s*$/,
    title: "Exception handler may be empty (pass-only or bare)",
    description:
      "An except clause that only contains `pass` silently swallows the error. The operation " +
      "fails but the calling code has no idea. Data may be partially written, resources may " +
      "not be cleaned up, and the user sees a success response for a failed operation.",
    severity: "high",
    suggestion:
      "At minimum, log the error with its traceback:\n" +
      "```python\nexcept ValueError as e:\n    logger.exception('Failed to process item: %s', e)\n    raise\n```\n" +
      "If you intentionally want to ignore certain errors, add a comment explaining why it's safe.",
    languages: ["python"],
  },
  {
    id: "magic-number",
    pattern: /(?:===?|!==?|[<>]=?|return|=)\s+(?:[2-9]\d{2,}|[1-9]\d{3,})(?!\s*[,;)\]}\w])/,
    title: "Magic number — unnamed numeric constant",
    description:
      "A large numeric literal is used directly in logic without explanation. When someone reads " +
      "`if (retries > 3)` or `timeout: 30000`, the number's meaning is unclear — is 30000 " +
      "milliseconds? bytes? pixels? Magic numbers make the code harder to understand and " +
      "dangerous to change (the same number might be hardcoded in multiple places).",
    severity: "low",
    suggestion:
      "Extract to a named constant:\n" +
      "```\nconst MAX_RETRIES = 3;\nconst REQUEST_TIMEOUT_MS = 30_000;\nconst MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;\n```\n" +
      "The name documents the intent, and changing the value updates it everywhere.",
    skipTests: true,
    skipConfigs: true,
  },
  {
    id: "no-return-type",
    pattern: /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{/,
    title: "Exported function without explicit return type",
    description:
      "This function doesn't declare its return type, relying on TypeScript inference. " +
      "For internal helpers this is fine, but for exported functions the inferred type " +
      "becomes part of the public API. If someone changes the function body and accidentally " +
      "changes the return type, TypeScript won't warn — the new type just propagates to all callers.",
    severity: "low",
    suggestion:
      "Add an explicit return type: `function fetchUsers(): Promise<User[]>`. " +
      "This catches accidental return-type changes at the source, not at every call site.",
    languages: ["typescript"],
    skipTests: true,
  },
];

const LARGE_DIFF_THRESHOLD = 500;

export function analyzeQuality(files: ChangedFile[]): Finding[] {
  const findings: Finding[] = [];
  let totalAdditions = 0;

  for (const file of files) {
    if (file.status === "removed") continue;
    totalAdditions += file.additions;

    const isTest = isTestFile(file.filename);
    const isConf = isConfigFile(file.filename);

    if (file.patch) {
      const addedLines = extractAddedLines(file.patch);
      for (const { lineNumber, content } of addedLines) {
        if (isCommentLine(content, file.filename)) continue;
        if (!content.trim()) continue;

        const codePortion = stripComment(content, file.filename);

        for (const rule of RULES) {
          if (rule.skipTests && isTest) continue;
          if (rule.skipConfigs && isConf) continue;

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
              category: "quality",
            });
          }
        }
      }
    }

    // Large single-file change
    if (file.additions > LARGE_DIFF_THRESHOLD) {
      findings.push({
        title: `Large file change: ${file.additions} lines added to one file`,
        description:
          `${file.filename} has ${file.additions} lines added in this PR. Large single-file changes are ` +
          "a code review blind spot — reviewers tend to skim or rubber-stamp files with hundreds " +
          "of new lines because it's cognitively exhausting to review them carefully. " +
          "Studies show review quality drops sharply after ~200 lines of diff.",
        severity: "medium",
        filePath: file.filename,
        codeSnippet: "",
        suggestion:
          "If this is a new file, consider if it could be multiple smaller modules. " +
          "If modifying an existing file, try splitting the change across focused PRs.",
        category: "quality",
      });
    }
  }

  // PR-level checks
  if (totalAdditions > 1000) {
    findings.push({
      title: `Very large PR: ${totalAdditions} lines added across ${files.length} files`,
      description:
        "This PR adds over 1,000 lines. Research by SmartBear (based on Cisco's code review data) " +
        "found that review effectiveness drops to near-zero above 400 lines of change — reviewers " +
        "approve without catching defects. A 1,000+ line PR is essentially unreviewed no matter " +
        "how many approvals it gets.\n\n" +
        "Large PRs also have higher revert rates and are more likely to introduce regressions.",
      severity: "high",
      filePath: "(entire PR)",
      codeSnippet: "",
      suggestion:
        "Split into incremental PRs, each with a clear scope:\n" +
        "• PR 1: Add the data model / schema\n" +
        "• PR 2: Add the business logic\n" +
        "• PR 3: Add the API endpoints\n" +
        "• PR 4: Add the UI\n\n" +
        "Each PR should be reviewable in 15-20 minutes.",
      category: "quality",
    });
  }

  if (files.length > 20) {
    findings.push({
      title: `PR touches ${files.length} files — high blast radius`,
      description:
        `This PR modifies ${files.length} files. Wide-reaching changes increase the risk of:\n\n` +
        "• **Merge conflicts**: Other developers' in-flight PRs are likely to conflict.\n" +
        "• **Incomplete rollback**: If something breaks, reverting this PR may have cascading effects.\n" +
        "• **Review fatigue**: Reviewers can't hold the full context of changes across 20+ files.\n" +
        "• **Testing gaps**: It's hard to verify all affected code paths.",
      severity: "medium",
      filePath: "(entire PR)",
      codeSnippet: "",
      suggestion:
        "Group changes by concern: all changes to the auth system in one PR, all changes " +
        "to the payments module in another. Cross-cutting changes (like a rename) are fine " +
        "as long as they're mechanical and reviewable.",
      category: "quality",
    });
  }

  return findings;
}
