import { prisma } from "../db";
import { normalizeRiskPathList } from "./paths";
import {
  RISK_MAX_PATHS_PER_INCIDENT,
  RISK_MAX_SOURCE_LEN,
} from "./constants";
import { parseTitle } from "./validate";

export interface UpsertIncidentInput {
  repoFullName: string;
  projectId: number | null;
  externalId: string;
  source?: string;
  title?: string;
  paths?: unknown[];
  eventCount?: number;
  occurredAt?: Date | null;
}

function clampSource(raw: string | undefined): string {
  const s = (raw ?? "generic").trim() || "generic";
  if (s.length <= RISK_MAX_SOURCE_LEN) return s;
  return s.slice(0, RISK_MAX_SOURCE_LEN);
}

function mergePathLists(
  existing: string[],
  incoming: string[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of existing) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= RISK_MAX_PATHS_PER_INCIDENT) return out;
  }
  for (const p of incoming) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= RISK_MAX_PATHS_PER_INCIDENT) return out;
  }
  return out;
}

/**
 * Idempotent upsert keyed by (repoFullName, externalId).
 */
export async function upsertProductionIncident(
  input: UpsertIncidentInput
) {
  const paths = normalizeRiskPathList(input.paths ?? []);
  const source = clampSource(input.source);
  const title = parseTitle(input.title ?? "");
  const addCount =
    typeof input.eventCount === "number" &&
    Number.isFinite(input.eventCount) &&
    input.eventCount >= 1
      ? Math.min(Math.floor(input.eventCount), 1_000_000)
      : 1;

  const now = new Date();
  let occurredAt = input.occurredAt;
  if (
    occurredAt &&
    (Number.isNaN(occurredAt.getTime()) || occurredAt > now)
  ) {
    occurredAt = now;
  }

  const existing = await prisma.productionIncident.findUnique({
    where: {
      repoFullName_externalId: {
        repoFullName: input.repoFullName,
        externalId: input.externalId,
      },
    },
  });

  if (!existing) {
    const firstSeen = occurredAt && occurredAt <= now ? occurredAt : now;
    const lastSeen = now >= firstSeen ? now : firstSeen;
    return prisma.productionIncident.create({
      data: {
        repoFullName: input.repoFullName,
        projectId: input.projectId ?? undefined,
        externalId: input.externalId,
        source,
        title,
        paths,
        eventCount: addCount,
        firstSeenAt: firstSeen,
        lastSeenAt: lastSeen,
      },
    });
  }

  const mergedPaths = mergePathLists(existing.paths, paths);
  const nextTitle = title || existing.title;
  const nextLast = (() => {
    const candidate = occurredAt ?? now;
    return candidate > existing.lastSeenAt ? candidate : existing.lastSeenAt;
  })();

  return prisma.productionIncident.update({
    where: { id: existing.id },
    data: {
      eventCount: { increment: addCount },
      lastSeenAt: nextLast,
      paths: mergedPaths,
      title: nextTitle,
      ...(input.projectId != null ? { projectId: input.projectId } : {}),
    },
  });
}
