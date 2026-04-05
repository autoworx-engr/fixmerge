import {
  RISK_MAX_PATH_LEN,
  RISK_MAX_PATHS_PER_INCIDENT,
} from "./constants";

/**
 * Normalize a path from stack traces / URLs into a repo-relative comparable form.
 * Returns empty string when the path should be discarded (unsafe or useless).
 */
export function normalizeRiskPath(raw: string): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim().replace(/\\/g, "/");
  if (!s) return "";

  // Strip query/hash from accidental URLs
  const q = s.indexOf("?");
  if (q !== -1) s = s.slice(0, q);
  const h = s.indexOf("#");
  if (h !== -1) s = s.slice(0, h);

  // webpack-internal:///./src/foo.tsx → src/foo.tsx
  const webpack = s.match(/webpack-internal:\/\/\/\.?\/?(.+)$/i);
  if (webpack?.[1]) s = webpack[1];

  // file:///path or file://path
  if (s.toLowerCase().startsWith("file://")) {
    s = s.replace(/^file:\/\//i, "");
    // file:///C:/... on Windows
    s = s.replace(/^[a-zA-Z]:\//, "");
  }

  // Keep last path-like segment after schemes (e.g. https://cdn/.../pkg/file.ts)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    const last = s.lastIndexOf("/");
    s = last >= 0 ? s.slice(last + 1) : s;
  }

  while (s.startsWith("./")) s = s.slice(2);
  s = s.replace(/^\/+/, "");

  const segments = s.split("/").filter(Boolean);
  if (segments.some((seg) => seg === ".." || seg === ".")) {
    return "";
  }

  const joined = segments.join("/");
  if (!joined) return "";
  if (joined.length > RISK_MAX_PATH_LEN) return "";
  return joined;
}

export function normalizeRiskPathList(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of paths) {
    if (out.length >= RISK_MAX_PATHS_PER_INCIDENT) break;
    const n = normalizeRiskPath(String(p));
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/**
 * True if a production path signal overlaps a PR-changed file path.
 */
export function riskPathMatchesPrFile(
  prFileNormalized: string,
  incidentPathNormalized: string
): boolean {
  if (!prFileNormalized || !incidentPathNormalized) return false;
  if (prFileNormalized === incidentPathNormalized) return true;
  if (prFileNormalized.endsWith("/" + incidentPathNormalized)) return true;
  if (incidentPathNormalized.endsWith("/" + prFileNormalized)) return true;
  return false;
}

export function normalizePrFilenames(filenames: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of filenames) {
    const n = normalizeRiskPath(f);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
