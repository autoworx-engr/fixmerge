import { prisma } from "./db";
import { Finding } from "./types";
import {
  getPRFiles,
  enrichFilesWithContent,
  postPRComment,
} from "./github";
import {
  analyzeBugs,
  analyzeSecurity,
  analyzeComplexity,
  analyzeQuality,
  analyzeWithAI,
} from "./analyzers";
import { buildPatternHistory } from "./history-patterns";

const SEVERITY_PENALTY: Record<string, number> = {
  critical: 15,
  high: 8,
  medium: 3,
  low: 1,
  info: 0,
};

function computeScore(findings: Finding[]): number {
  const penalty = findings.reduce(
    (sum, f) => sum + (SEVERITY_PENALTY[f.severity] || 0),
    0
  );
  return Math.max(0, 100 - penalty);
}

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function formatPRComment(
  score: number,
  findings: Finding[],
  patternHistoryMarkdown: string
): string {
  const grade = getGrade(score);
  const emoji: Record<string, string> = {
    A: "🟢",
    B: "🟡",
    C: "🟠",
    D: "🔴",
    F: "⛔",
  };

  const lines = [
    `## ${emoji[grade] || "⚪"} FixMerge Analysis — Grade: **${grade}** (Score: ${score}/100)`,
    "",
  ];

  if (findings.length === 0) {
    lines.push("**No issues found.** Looking clean — safe to merge ✅");
    return lines.join("\n");
  }

  const summary: Record<string, Record<string, number>> = {};
  for (const f of findings) {
    if (!summary[f.category]) {
      summary[f.category] = { critical: 0, high: 0, medium: 0, low: 0 };
    }
    if (f.severity in summary[f.category]) {
      summary[f.category][f.severity]++;
    }
  }

  lines.push("| Category | Critical | High | Medium | Low |");
  lines.push("|----------|----------|------|--------|-----|");
  for (const [cat, counts] of Object.entries(summary)) {
    lines.push(
      `| ${cat.charAt(0).toUpperCase() + cat.slice(1)} | ${counts.critical} | ${counts.high} | ${counts.medium} | ${counts.low} |`
    );
  }
  lines.push("");

  const topIssues = findings.filter(
    (f) => f.severity === "critical" || f.severity === "high"
  );
  if (topIssues.length > 0) {
    lines.push("### Top Issues");
    lines.push("");
    for (const f of topIssues.slice(0, 10)) {
      const badge = f.severity === "critical" ? "🔴" : "🟠";
      let loc = `\`${f.filePath}`;
      if (f.lineNumber) loc += `:${f.lineNumber}`;
      loc += "`";
      lines.push(`- ${badge} **${f.title}** — ${loc}`);
      if (f.suggestion) {
        lines.push(`  > 💡 ${f.suggestion}`);
      }
    }
    lines.push("");
  }

  if (patternHistoryMarkdown) {
    lines.push("### Historical pattern review");
    lines.push("");
    lines.push(patternHistoryMarkdown);
    lines.push("");
  }

  lines.push(
    `<sub>Analyzed by <b>FixMerge</b> • ${findings.length} issues found</sub>`
  );
  return lines.join("\n");
}

export async function runAnalysis(
  analysisId: number,
  repo: string,
  prNumber: number,
  headSha: string
): Promise<void> {
  await prisma.pRAnalysis.update({
    where: { id: analysisId },
    data: { status: "running" },
  });

  try {
    let files = await getPRFiles(repo, prNumber);
    files = await enrichFilesWithContent(repo, headSha, files);

    const regexFindings: Finding[] = [
      ...analyzeBugs(files),
      ...analyzeSecurity(files),
      ...analyzeComplexity(files),
      ...analyzeQuality(files),
    ];

    let aiFindings: Finding[] = [];
    try {
      aiFindings = await analyzeWithAI(files);
    } catch (err) {
      console.warn("AI review failed, continuing with regex findings:", err);
    }

    const allFindings: Finding[] = [...regexFindings, ...aiFindings];

    const score = computeScore(allFindings);

    await prisma.$transaction(async (tx) => {
      await tx.pRAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "completed",
          score,
          totalIssues: allFindings.length,
          criticalCount: allFindings.filter((f) => f.severity === "critical")
            .length,
          highCount: allFindings.filter((f) => f.severity === "high").length,
          mediumCount: allFindings.filter((f) => f.severity === "medium")
            .length,
          lowCount: allFindings.filter((f) => f.severity === "low").length,
          completedAt: new Date(),
          riskIncidentCount: 0,
          issues: {
            create: allFindings.map((f) => ({
              category: f.category,
              severity: f.severity,
              title: f.title,
              description: f.description,
              filePath: f.filePath,
              lineNumber: f.lineNumber,
              codeSnippet: f.codeSnippet,
              suggestion: f.suggestion,
            })),
          },
        },
      });
    });

    let patternHistoryMarkdown = "";
    try {
      const ph = await buildPatternHistory(repo, analysisId, allFindings);
      patternHistoryMarkdown = ph.markdown;
    } catch (err) {
      console.warn("Pattern history failed, PR comment will omit it:", err);
    }

    // Post comment back on the PR
    try {
      const comment = formatPRComment(score, allFindings, patternHistoryMarkdown);
      await postPRComment(repo, prNumber, comment);
    } catch {
      console.warn(`Could not post PR comment for ${repo}#${prNumber}`);
    }

    console.log(
      `Analysis complete: ${repo}#${prNumber} — score=${score}, issues=${allFindings.length}`
    );
  } catch (error) {
    console.error(`Analysis failed for ${repo}#${prNumber}:`, error);
    await prisma.pRAnalysis.update({
      where: { id: analysisId },
      data: { status: "failed" },
    });
  }
}
