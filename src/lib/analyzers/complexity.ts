import { ChangedFile, Finding } from "../types";
import { detectLanguage, isConfigFile } from "./utils";

const MAX_COMPLEXITY = parseInt(process.env.MAX_COMPLEXITY || "15", 10);
const MAX_FUNCTION_LENGTH = parseInt(process.env.MAX_FUNCTION_LENGTH || "50", 10);
const MAX_FILE_LENGTH = parseInt(process.env.MAX_FILE_LENGTH || "500", 10);
const MAX_PARAMS = 5;

const FUNCTION_PATTERNS: Record<string, RegExp> = {
  python: /^(\s*)def\s+(\w+)\s*\(/gm,
  javascript:
    /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))/gm,
  typescript:
    /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/gm,
};

const BRANCHING_KEYWORDS =
  /\b(if|else\s+if|elif|for|while|switch|case|catch|except|&&|\|\||and|or|\?)\b/g;

function countNestingDepth(lines: string[]): number {
  let maxDepth = 0;
  for (const line of lines) {
    const stripped = line.trimEnd();
    if (!stripped) continue;
    const indent = line.length - line.trimStart().length;
    const depth = Math.floor(indent / 4);
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}

function cyclomaticComplexity(body: string): number {
  const matches = body.match(BRANCHING_KEYWORDS);
  return 1 + (matches ? matches.length : 0);
}

function extractPythonBody(lines: string[], start: number): string[] {
  if (start >= lines.length) return [];
  const baseIndent = lines[start].length - lines[start].trimStart().length;
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!stripped) {
      body.push(lines[i]);
      continue;
    }
    const indent = lines[i].length - lines[i].trimStart().length;
    if (indent <= baseIndent) break;
    body.push(lines[i]);
  }
  return body;
}

function extractBraceBody(lines: string[], start: number): string[] {
  let depth = 0;
  const body: string[] = [];
  let foundOpen = false;
  for (let i = start; i < lines.length; i++) {
    body.push(lines[i]);
    depth += (lines[i].match(/{/g) || []).length;
    depth -= (lines[i].match(/}/g) || []).length;
    if (lines[i].includes("{")) foundOpen = true;
    if (foundOpen && depth <= 0) break;
  }
  return body;
}

function countParameters(funcLine: string): number {
  const match = funcLine.match(/\(([^)]*)\)/);
  if (!match || !match[1].trim()) return 0;
  return match[1].split(",").filter((p) => p.trim()).length;
}

export function analyzeComplexity(files: ChangedFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (file.status === "removed") continue;
    if (isConfigFile(file.filename)) continue;

    if (!file.rawContent) continue;

    const lineCount = file.rawContent.split("\n").length;

    // File length
    if (lineCount > MAX_FILE_LENGTH) {
      findings.push({
        title: `Large file: ${lineCount} lines (threshold: ${MAX_FILE_LENGTH})`,
        description:
          `This file has ${lineCount} lines. Large files are a signal of accumulated responsibilities — ` +
          "the file is trying to do too many things. This hurts in several practical ways:\n\n" +
          "• **Merge conflicts**: Multiple developers editing the same large file creates frequent conflicts.\n" +
          "• **Code review**: Reviewers can't hold 500+ lines of context in their head, so bugs slip through.\n" +
          "• **Testing**: Large files with many functions are hard to test in isolation.\n" +
          "• **IDE performance**: Some tools slow down with very large files (autocomplete, linting).",
        severity: "medium",
        filePath: file.filename,
        codeSnippet: "",
        suggestion:
          "Split by responsibility: extract related functions into their own module. " +
          "Common splits: separate data-access from business logic, extract utility functions, " +
          "split large React components into smaller ones with clear props boundaries.",
        category: "complexity",
      });
    }

    // Function analysis
    const lang = detectLanguage(file.filename);
    if (!lang || !FUNCTION_PATTERNS[lang]) continue;

    const allLines = file.rawContent.split("\n");
    const regex = new RegExp(FUNCTION_PATTERNS[lang].source, FUNCTION_PATTERNS[lang].flags);
    let match;

    while ((match = regex.exec(file.rawContent)) !== null) {
      const funcName = match[1] || match[2] || "unknown";
      const startLine = file.rawContent.slice(0, match.index).split("\n").length - 1;

      const bodyLines =
        lang === "python"
          ? extractPythonBody(allLines, startLine)
          : extractBraceBody(allLines, startLine);

      const funcLength = bodyLines.length;
      const bodyText = bodyLines.join("\n");

      // Function length
      if (funcLength > MAX_FUNCTION_LENGTH) {
        const ratio = (funcLength / MAX_FUNCTION_LENGTH).toFixed(1);
        findings.push({
          title: `Long function: ${funcName}() — ${funcLength} lines (${ratio}x threshold)`,
          description:
            `Function \`${funcName}\` is ${funcLength} lines, exceeding the ${MAX_FUNCTION_LENGTH}-line threshold. ` +
            "Long functions typically mean the function is doing multiple things that should be separate operations. " +
            "The practical problems:\n\n" +
            "• **Harder to name**: If you can't describe what the function does in one sentence, it does too much.\n" +
            "• **Harder to test**: You need to set up elaborate fixtures to test one behavior buried in the middle.\n" +
            "• **Harder to reuse**: Other code can't call just the part it needs.\n" +
            "• **Bug magnet**: Studies show defect density increases super-linearly with function length.",
          severity: funcLength > MAX_FUNCTION_LENGTH * 2 ? "high" : "medium",
          filePath: file.filename,
          lineNumber: startLine + 1,
          codeSnippet: "",
          suggestion:
            "Look for natural break points: early returns that handle edge cases, sequential steps " +
            "that transform data, and loops with bodies longer than 5-10 lines. Extract each into " +
            "a well-named function. A good function does one thing and its name tells you what.",
          category: "complexity",
        });
      }

      // Cyclomatic complexity
      const complexity = cyclomaticComplexity(bodyText);
      if (complexity > MAX_COMPLEXITY) {
        const level = complexity > MAX_COMPLEXITY * 2 ? "extremely" : complexity > MAX_COMPLEXITY * 1.5 ? "very" : "";
        findings.push({
          title: `High cyclomatic complexity: ${funcName}() — ${complexity} paths (threshold: ${MAX_COMPLEXITY})`,
          description:
            `Function \`${funcName}\` has cyclomatic complexity of ${complexity}, meaning there are ${complexity} ` +
            `independent execution paths through the code. This is ${level ? level + " " : ""}high.\n\n` +
            "Cyclomatic complexity counts the number of `if`, `else`, `for`, `while`, `case`, `&&`, `||`, " +
            "and ternary `?` branches. Each branch doubles the number of scenarios you need to think about " +
            "when reading or testing the code.\n\n" +
            `With complexity ${complexity}, you'd need at least ${complexity} test cases to cover every path. ` +
            "In practice, most of these paths are never tested, which is where production bugs hide.",
          severity: complexity > MAX_COMPLEXITY * 1.5 ? "high" : "medium",
          filePath: file.filename,
          lineNumber: startLine + 1,
          codeSnippet: "",
          suggestion:
            "Reduce branching with:\n" +
            "• **Early returns**: Handle error/edge cases at the top, then the happy path needs no `else`.\n" +
            "• **Strategy pattern**: Replace `switch` on type with a lookup table or polymorphism.\n" +
            "• **Extract predicates**: `if (isEligibleForDiscount(user))` is clearer than a 4-condition `&&`.\n" +
            "• **Split function**: If it checks permissions, validates input, AND does business logic, those are 3 functions.",
          category: "complexity",
        });
      }

      // Nesting depth
      const depth = countNestingDepth(bodyLines);
      if (depth >= 5) {
        findings.push({
          title: `Deep nesting: ${funcName}() — ${depth} levels deep`,
          description:
            `Function \`${funcName}\` has nesting ${depth} levels deep (e.g., an if inside a for inside a try ` +
            "inside another if). Deep nesting forces the reader to hold multiple conditions in their head " +
            "simultaneously — by level 4-5, most developers lose track of which branch they're in.\n\n" +
            "This is the #1 predictor of buggy code changes: a study by Microsoft Research found that " +
            "nesting depth had the highest correlation with defects, more than code length or complexity.",
          severity: depth >= 7 ? "high" : "medium",
          filePath: file.filename,
          lineNumber: startLine + 1,
          codeSnippet: "",
          suggestion:
            "Flatten with:\n" +
            "• **Guard clauses**: `if (!valid) return;` at the top instead of wrapping everything in `if (valid) { ... }`\n" +
            "• **Extract inner blocks**: Pull the deeply nested logic into a named function\n" +
            "• **Early continue**: In loops, `if (!condition) continue;` instead of wrapping the body in an `if`",
          category: "complexity",
        });
      }

      // Too many parameters
      const paramCount = countParameters(allLines[startLine]);
      if (paramCount > MAX_PARAMS) {
        findings.push({
          title: `Too many parameters: ${funcName}() — ${paramCount} params`,
          description:
            `Function \`${funcName}\` takes ${paramCount} parameters. Functions with many parameters ` +
            "are hard to call correctly — callers constantly mix up the order or forget optional ones. " +
            "It also suggests the function is doing too much or the parameters represent a concept " +
            "that should be its own object.\n\n" +
            "Consider: can you call this function from memory without looking up the signature?",
          severity: "medium",
          filePath: file.filename,
          lineNumber: startLine + 1,
          codeSnippet: allLines[startLine].trim(),
          suggestion:
            "Group related parameters into an options object:\n" +
            "```\n// Before: createUser(name, email, role, team, notify, language)\n" +
            "// After:  createUser({ name, email, role, team, notify, language })\n```\n" +
            "This makes call sites self-documenting and order-independent.",
          category: "complexity",
        });
      }
    }
  }

  return findings;
}
