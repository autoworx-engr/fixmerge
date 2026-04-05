/** Max file paths stored per incident (extra paths dropped). */
export const RISK_MAX_PATHS_PER_INCIDENT = 50;

/** Max characters per path segment string after normalization. */
export const RISK_MAX_PATH_LEN = 512;

export const RISK_MAX_EXTERNAL_ID_LEN = 256;

export const RISK_MAX_TITLE_LEN = 500;

export const RISK_MAX_SOURCE_LEN = 64;

/** Reject ingest bodies larger than this (bytes). */
export const RISK_MAX_BODY_BYTES = 256_000;

/** Max incidents loaded when correlating a PR (performance guard). */
export const RISK_CORRELATION_INCIDENT_CAP = 500;

export function getRiskLookbackMs(): number {
  const raw = process.env.RISK_INCIDENT_LOOKBACK_DAYS;
  const n = raw === undefined ? 90 : parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 90 * 86_400_000;
  if (n > 3650) return 3650 * 86_400_000;
  return n * 86_400_000;
}

export function getRiskLookbackDate(): Date {
  return new Date(Date.now() - getRiskLookbackMs());
}
