import { ChangedFile } from "./types";
import crypto from "crypto";

const GITHUB_API = "https://api.github.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

export async function getPRFiles(
  repo: string,
  prNumber: number
): Promise<ChangedFile[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  const data = await res.json();

  return data.map(
    (f: {
      filename: string;
      status: string;
      patch?: string;
      additions?: number;
      deletions?: number;
    }) => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch || "",
      additions: f.additions || 0,
      deletions: f.deletions || 0,
    })
  );
}

export async function getFileContent(
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${ref}`,
    { headers: headers() }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content || "";
}

export async function postPRComment(
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/issues/${prNumber}/comments`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok) throw new Error(`GitHub comment error: ${res.status}`);
}

export async function enrichFilesWithContent(
  repo: string,
  ref: string,
  files: ChangedFile[]
): Promise<ChangedFile[]> {
  const enriched = await Promise.all(
    files.map(async (f) => {
      if (f.status === "removed") return f;
      try {
        const content = await getFileContent(repo, f.filename, ref);
        return { ...f, rawContent: content ?? undefined };
      } catch {
        return f;
      }
    })
  );
  return enriched;
}

/** When `secret` is omitted or empty, verification is skipped (dev / open webhooks). */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret?: string | null
): boolean {
  if (!secret) return true;
  if (!signature) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  if (expected.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
