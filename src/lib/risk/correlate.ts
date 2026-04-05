import { prisma } from "../db";
import {
  getRiskLookbackDate,
  RISK_CORRELATION_INCIDENT_CAP,
} from "./constants";
import { normalizePrFilenames, riskPathMatchesPrFile } from "./paths";

export interface RiskMatchRow {
  incidentId: number;
  matchedPaths: string[];
}

/**
 * Find historical incidents whose stored paths overlap this PR's changed files.
 * Incidents with empty paths never match (avoids noisy "whole repo" signals).
 */
export async function computeRiskMatchesForPr(
  repoFullName: string,
  prFilenames: string[]
): Promise<RiskMatchRow[]> {
  const prNorm = normalizePrFilenames(prFilenames);
  if (prNorm.length === 0) return [];

  const since = getRiskLookbackDate();
  const incidents = await prisma.productionIncident.findMany({
    where: {
      repoFullName,
      lastSeenAt: { gte: since },
    },
    orderBy: { lastSeenAt: "desc" },
    take: RISK_CORRELATION_INCIDENT_CAP,
  });

  const rows: RiskMatchRow[] = [];

  for (const inc of incidents) {
    if (inc.paths.length === 0) continue;
    const matched = new Set<string>();
    for (const incPath of inc.paths) {
      for (const prFile of prNorm) {
        if (riskPathMatchesPrFile(prFile, incPath)) {
          matched.add(prFile);
        }
      }
    }
    if (matched.size > 0) {
      rows.push({
        incidentId: inc.id,
        matchedPaths: [...matched],
      });
    }
  }

  return rows;
}
