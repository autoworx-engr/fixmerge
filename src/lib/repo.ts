const REPO_FULL_NAME = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

/**
 * Strip GitHub URL prefixes / .git / trailing slash (same rules as registration).
 */
export function normalizeRepoFullName(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");
}

/** Returns `owner/repo` or null if invalid. */
export function parseOwnerRepo(input: string): string | null {
  const s = normalizeRepoFullName(input);
  if (s.length < 3 || s.length > 200) return null;
  if (!REPO_FULL_NAME.test(s)) return null;
  return s;
}
