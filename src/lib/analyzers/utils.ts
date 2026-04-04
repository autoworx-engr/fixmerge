/**
 * Parse a unified diff patch to extract added lines with their line numbers.
 */
export function extractAddedLines(
  patch: string
): { lineNumber: number; content: string }[] {
  const lines: { lineNumber: number; content: string }[] = [];
  let currentLine = 0;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("@@")) {
      const match = raw.match(/\+(\d+)/);
      if (match) currentLine = parseInt(match[1], 10);
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      lines.push({ lineNumber: currentLine, content: raw.slice(1) });
      currentLine++;
    } else if (raw.startsWith("-")) {
      continue;
    } else {
      currentLine++;
    }
  }
  return lines;
}

const EXT_MAP: Record<string, string> = {
  ".py": "python",
  ".pyw": "python",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".go": "go",
  ".rb": "ruby",
  ".java": "java",
  ".rs": "rust",
  ".php": "php",
  ".sh": "shell",
  ".bash": "shell",
};

export function detectLanguage(filename: string): string | null {
  for (const [ext, lang] of Object.entries(EXT_MAP)) {
    if (filename.endsWith(ext)) return lang;
  }
  return null;
}

export function isJSLike(filename: string): boolean {
  const lang = detectLanguage(filename);
  return lang === "javascript" || lang === "typescript";
}

export function isPython(filename: string): boolean {
  return detectLanguage(filename) === "python";
}

export function isTestFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.includes("__tests__") ||
    lower.includes("/test/") ||
    lower.includes("/tests/") ||
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.includes("_test.") ||
    lower.includes("test_") ||
    lower.endsWith("_test.py") ||
    lower.endsWith("_test.go")
  );
}

export function isConfigFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  const base = lower.split("/").pop() || "";
  return (
    base.startsWith(".") ||
    base.includes("config") ||
    base.includes("rc.") ||
    base.endsWith(".json") ||
    base.endsWith(".yaml") ||
    base.endsWith(".yml") ||
    base.endsWith(".toml") ||
    base.endsWith(".lock") ||
    base === "makefile" ||
    base === "dockerfile"
  );
}

/**
 * Returns true if the line is predominantly a comment (not inline code with a trailing comment).
 * Handles JS/TS/Go/Java/Rust single-line comments and Python/Ruby/Shell hash comments.
 */
export function isCommentLine(content: string, filename: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  if (isJSLike(filename) || /\.(go|java|rs|php|c|cpp|swift)$/.test(filename)) {
    return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
  }
  if (isPython(filename) || /\.(rb|sh|bash|yaml|yml)$/.test(filename)) {
    return trimmed.startsWith("#");
  }
  return false;
}

/**
 * Returns true if the match appears to be inside a string literal.
 * Simple heuristic: check if the match position has an odd number of quotes before it.
 */
export function isInsideString(content: string, matchIndex: number): boolean {
  const before = content.slice(0, matchIndex);
  const singleQuotes = (before.match(/'/g) || []).length;
  const doubleQuotes = (before.match(/"/g) || []).length;
  const backticks = (before.match(/`/g) || []).length;
  return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0) || (backticks % 2 !== 0);
}

/**
 * Strip inline comments from a line to get just the code portion.
 */
export function stripComment(content: string, filename: string): string {
  if (isJSLike(filename) || /\.(go|java|rs|php)$/.test(filename)) {
    const match = content.match(/^(.*?)\/\//);
    if (match) return match[1];
  }
  if (isPython(filename) || /\.(rb|sh|bash)$/.test(filename)) {
    const match = content.match(/^(.*?)#/);
    if (match) return match[1];
  }
  return content;
}
