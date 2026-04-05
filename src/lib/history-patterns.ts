import { prisma } from "./db";

export type FindingPatternInput = {
  title: string;
  category: string;
  filePath: string;
  severity: string;
};

export type RecurringPattern = {
  title: string;
  category: string;
  filePath: string;
  severity: string;
  priorOccurrences: number;
  lastPrNumber: number;
  riskNote: string;
};

export type NewPatternItem = {
  title: string;
  category: string;
  filePath: string;
  severity: string;
  note?: string;
};

export type PatternHistoryResult = {
  recurring: RecurringPattern[];
  seenOnce: NewPatternItem[];
  brandNew: NewPatternItem[];
  markdown: string;
};

const HISTORY_ROW_CAP = 15_000;

export function patternKey(f: FindingPatternInput): string {
  const title = f.title.trim().toLowerCase().replace(/\s+/g, " ");
  const path = (f.filePath || "").trim();
  return `${f.category}\n${title}\n${path}`;
}

function recurringRiskNote(category: string, severity: string): string {
  if (category === "security") {
    return "A repeating security signal usually means exposure has persisted across multiple changes—treat as systemic and verify fixes with tests or review.";
  }
  if (severity === "critical" || severity === "high") {
    return "High-severity repeats suggest the underlying fix did not stick or the same mistake is being reintroduced—pause and address root cause before merging more of the same.";
  }
  return "Recurring findings point to a stubborn anti-pattern or missing guardrails (lint/tests/docs)—worth a focused cleanup so the team stops paying the same tax.";
}

/**
 * Load historical FixMerge issues for the same repo (excluding this analysis),
 * then classify current findings into recurring (≥2 prior hits), seen once, or new.
 */
export async function buildPatternHistory(
  repoFullName: string,
  currentAnalysisId: number,
  findings: FindingPatternInput[]
): Promise<PatternHistoryResult> {
  const empty: PatternHistoryResult = {
    recurring: [],
    seenOnce: [],
    brandNew: [],
    markdown: "",
  };

  if (findings.length === 0) {
    return empty;
  }

  const pastRows = await prisma.issue.findMany({
    where: {
      analysis: {
        repoFullName,
        id: { not: currentAnalysisId },
        status: "completed",
      },
    },
    select: {
      title: true,
      category: true,
      filePath: true,
      analysis: {
        select: { prNumber: true, completedAt: true },
      },
    },
    orderBy: { id: "desc" },
    take: HISTORY_ROW_CAP,
  });

  type Agg = { count: number; lastPr: number; lastAt: Date };
  const agg = new Map<string, Agg>();

  for (const row of pastRows) {
    const key = patternKey({
      title: row.title,
      category: row.category,
      filePath: row.filePath || "",
      severity: "info",
    });
    const pr = row.analysis.prNumber;
    const at = row.analysis.completedAt ?? new Date(0);
    const cur = agg.get(key);
    if (!cur) {
      agg.set(key, { count: 1, lastPr: pr, lastAt: at });
    } else {
      cur.count += 1;
      if (at.getTime() >= cur.lastAt.getTime()) {
        cur.lastAt = at;
        cur.lastPr = pr;
      }
    }
  }

  const recurring: RecurringPattern[] = [];
  const seenOnce: NewPatternItem[] = [];
  const brandNew: NewPatternItem[] = [];
  const seenKeys = new Set<string>();

  for (const f of findings) {
    const key = patternKey(f);
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    const a = agg.get(key);
    const prior = a?.count ?? 0;

    if (prior >= 2) {
      recurring.push({
        title: f.title,
        category: f.category,
        filePath: f.filePath || "(unknown file)",
        severity: f.severity,
        priorOccurrences: prior,
        lastPrNumber: a!.lastPr,
        riskNote: recurringRiskNote(f.category, f.severity),
      });
    } else if (prior === 1) {
      seenOnce.push({
        title: f.title,
        category: f.category,
        filePath: f.filePath || "(unknown file)",
        severity: f.severity,
        note: `Also flagged once before in PR #${a!.lastPr}.`,
      });
    } else {
      brandNew.push({
        title: f.title,
        category: f.category,
        filePath: f.filePath || "(unknown file)",
        severity: f.severity,
      });
    }
  }

  const markdown = formatPatternHistoryMarkdown({
    recurring,
    seenOnce,
    brandNew,
  });

  return { recurring, seenOnce, brandNew, markdown };
}

const MAX_RECURRING_IN_MARKDOWN = 12;
const MAX_OTHER_IN_MARKDOWN = 24;

export function formatPatternHistoryMarkdown(parts: {
  recurring: RecurringPattern[];
  seenOnce: NewPatternItem[];
  brandNew: NewPatternItem[];
}): string {
  const lines: string[] = [];

  const rec = parts.recurring.slice(0, MAX_RECURRING_IN_MARKDOWN);
  const recOmit = parts.recurring.length - rec.length;

  lines.push(
    "_Compared against prior FixMerge analyses on this repository (same rule + path)._"
  );
  lines.push("");

  lines.push("1. 🔁 Recurring Issues");
  lines.push("");

  if (parts.recurring.length === 0) {
    lines.push("_None — no finding matched **2+** previous occurrences in this repo._");
    lines.push("");
  } else {
    for (const r of rec) {
      const loc = r.filePath ? `\`${r.filePath}\`` : "unknown path";
      lines.push(`- **${r.title}** in ${loc}`);
      lines.push(`  → Seen **${r.priorOccurrences}** times before`);
      lines.push(`  → Last seen in **PR #${r.lastPrNumber}**`);
      lines.push(`  → ${r.riskNote}`);
      lines.push("");
    }
    if (recOmit > 0) {
      lines.push(`_…and **${recOmit}** more recurring patterns (see FixMerge report)._`);
      lines.push("");
    }
  }

  lines.push("2. 🆕 New & other issues");
  lines.push("");

  if (parts.brandNew.length === 0 && parts.seenOnce.length === 0) {
    lines.push("_No additional items in this bucket._");
  } else {
    let budget = MAX_OTHER_IN_MARKDOWN;
    let shown = 0;
    const totalOther = parts.brandNew.length + parts.seenOnce.length;
    for (const n of parts.brandNew) {
      if (budget <= 0) break;
      const loc = n.filePath ? `\`${n.filePath}\`` : "unknown path";
      lines.push(
        `- **${n.title}** in ${loc} _(first time this pattern appears in history)_`
      );
      budget -= 1;
      shown += 1;
    }
    for (const n of parts.seenOnce) {
      if (budget <= 0) break;
      const loc = n.filePath ? `\`${n.filePath}\`` : "unknown path";
      lines.push(
        `- **${n.title}** in ${loc}${n.note ? ` _(${n.note})_` : ""}`
      );
      budget -= 1;
      shown += 1;
    }
    const restOmit = totalOther - shown;
    if (restOmit > 0) {
      lines.push(`_…and **${restOmit}** more (see FixMerge report)._`);
    }
  }

  return lines.join("\n").trim();
}
