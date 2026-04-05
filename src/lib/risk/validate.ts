import {
  RISK_MAX_EXTERNAL_ID_LEN,
  RISK_MAX_TITLE_LEN,
} from "./constants";

const REPO_FULL_NAME = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function parseRepoFullName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length < 3 || s.length > 200) return null;
  if (!REPO_FULL_NAME.test(s)) return null;
  return s;
}

export function parseExternalId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (s.length > RISK_MAX_EXTERNAL_ID_LEN) return null;
  // Avoid control characters / newlines in keys
  if (/[\x00-\x1f\x7f]/.test(s)) return null;
  return s;
}

export function parseTitle(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t.length <= RISK_MAX_TITLE_LEN) return t;
  return t.slice(0, RISK_MAX_TITLE_LEN);
}

export function parseSource(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

export function parseEventCount(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 1;
  const n = Math.floor(v);
  if (n < 1) return 1;
  if (n > 1_000_000) return 1_000_000;
  return n;
}

export function parseOccurredAt(v: unknown): Date | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const min = new Date("2000-01-01T00:00:00.000Z");
  const max = new Date(Date.now() + 86_400_000); // allow 1 day clock skew forward
  if (d < min || d > max) return null;
  return d;
}

export function parsePathsField(v: unknown): unknown[] {
  if (!Array.isArray(v)) return [];
  return v;
}
