import { ChangedFile, Finding } from "../types";
import { isConfigFile } from "./utils";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";

function getApiKey(): string | null {
  return process.env.AI_API_KEY || process.env.OPENAI_API_KEY || null;
}

const AI_TIMEOUT_MS = 25_000;

async function chat(
  messages: { role: string; content: string }[]
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("AI API key not configured");

  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const baseUrl = process.env.AI_BASE_URL || OPENAI_API;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You are FixMerge, an expert code reviewer. Analyze the provided code diff and find REAL bugs — logic errors, semantic mistakes, and issues that regex-based linters cannot catch.

Focus on:
- Wrong operators (+/- , ==/===, </<=, &&/||)
- Off-by-one errors in loops/slices
- Null/undefined not handled (division by zero, empty arrays, missing properties)
- Logic that's always true/false or unreachable
- Race conditions, async/await mistakes
- Wrong return values or types
- Security issues (injection, XSS, auth bypass)
- Resource leaks (unclosed connections, event listeners)
- API misuse (wrong argument order, deprecated methods)

Do NOT flag:
- Style issues (naming, formatting)
- Missing comments or docs
- console.log statements (already caught by linter)
- Import order
- Things that are clearly intentional

Respond ONLY with a JSON array. Each item must have exactly these fields:
{
  "title": "Short title (under 80 chars)",
  "description": "2-3 sentence explanation of WHY this is a bug and what happens at runtime",
  "severity": "critical" | "high" | "medium" | "low",
  "filePath": "exact filename from the diff",
  "lineNumber": number or null,
  "codeSnippet": "the problematic line(s)",
  "suggestion": "Concrete fix — show the corrected code"
}

If there are no real bugs, return an empty array: []
Return ONLY valid JSON, no markdown fences, no explanation outside the array.`;

function buildDiffContext(files: ChangedFile[]): string {
  const chunks: string[] = [];
  let totalChars = 0;
  const MAX_CHARS = 12000;

  for (const file of files) {
    if (file.status === "removed") continue;
    if (isConfigFile(file.filename)) continue;
    if (!file.patch && !file.rawContent) continue;

    let fileBlock = `--- ${file.filename} ---\n`;

    if (file.patch) {
      fileBlock += file.patch;
    } else if (file.rawContent) {
      fileBlock += file.rawContent.slice(0, 3000);
    }

    if (totalChars + fileBlock.length > MAX_CHARS) {
      if (chunks.length === 0) {
        chunks.push(fileBlock.slice(0, MAX_CHARS));
      }
      break;
    }

    chunks.push(fileBlock);
    totalChars += fileBlock.length;
  }

  return chunks.join("\n\n");
}

function parseAIResponse(raw: string): Finding[] {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];
  cleaned = arrayMatch[0];

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    const VALID_SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          item &&
          typeof item.title === "string" &&
          typeof item.description === "string" &&
          typeof item.severity === "string" &&
          VALID_SEVERITIES.has(item.severity as string)
      )
      .map((item: Record<string, unknown>) => ({
        title: String(item.title).slice(0, 120),
        description: String(item.description),
        severity: item.severity as Finding["severity"],
        filePath: String(item.filePath || ""),
        lineNumber:
          typeof item.lineNumber === "number" ? item.lineNumber : undefined,
        codeSnippet: String(item.codeSnippet || ""),
        suggestion: String(item.suggestion || ""),
        category: "bug" as const,
      }));
  } catch {
    console.warn("Failed to parse AI review response:", cleaned.slice(0, 200));
    return [];
  }
}

export async function analyzeWithAI(
  files: ChangedFile[]
): Promise<Finding[]> {
  if (!getApiKey()) return [];

  const diff = buildDiffContext(files);
  if (!diff.trim()) return [];

  try {
    const response = await chat([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Review this code diff for bugs:\n\n${diff}`,
      },
    ]);

    return parseAIResponse(response);
  } catch (err) {
    console.warn("AI review failed (non-fatal):", err);
    return [];
  }
}
