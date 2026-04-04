"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GradeBadge } from "@/components/grade-badge";
import { ScoreRing } from "@/components/score-ring";
import { IssueCard } from "@/components/issue-card";
import { AISummary } from "@/components/ai-summary";

interface Issue {
  id: number;
  category: string;
  severity: string;
  title: string;
  description: string;
  filePath: string;
  lineNumber: number | null;
  codeSnippet: string;
  suggestion: string;
}

interface Analysis {
  id: number;
  repo: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  author: string;
  status: string;
  score: number;
  grade: string;
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  mergedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  issues: Issue[];
}

const CATEGORIES = ["all", "bug", "security", "complexity", "quality"] as const;

const categoryConfig: Record<string, { icon: string; label: string }> = {
  all: { icon: "A", label: "All" },
  bug: { icon: "B", label: "Bugs" },
  security: { icon: "S", label: "Security" },
  complexity: { icon: "C", label: "Complexity" },
  quality: { icon: "Q", label: "Quality" },
};

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analyses/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto">
        <div className="skeleton h-5 w-32 mb-6" />
        <div className="skeleton h-48 rounded-2xl mb-6" />
        <div className="skeleton h-32 rounded-2xl mb-4" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-[960px] mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" className="text-red-400">
            <path d="M2.343 13.657A8 8 0 1 1 13.66 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold mb-2">Analysis not found</h1>
        <Link href="/" className="text-[var(--accent-light)] hover:underline text-[14px]">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const filteredIssues =
    filter === "all"
      ? analysis.issues
      : analysis.issues.filter((i) => i.category === filter);

  const categoryCounts: Record<string, number> = { all: analysis.issues.length };
  for (const i of analysis.issues) {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  }

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] mb-6">
        <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--accent-light)] transition-colors">
          Dashboard
        </Link>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/>
        </svg>
        <span className="text-[var(--text-secondary)]">PR #{analysis.prNumber}</span>
      </div>

      {/* Report Header Card */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Score Ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ScoreRing score={analysis.score} size={130} strokeWidth={10} />
            <GradeBadge grade={analysis.grade} size="sm" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1 leading-snug">
              {analysis.prTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--text-muted)] mb-5">
              <span className="text-[var(--text-secondary)] font-medium">#{analysis.prNumber}</span>
              <span>&middot;</span>
              <span>{analysis.repo}</span>
              <span>&middot;</span>
              <span>by {analysis.author}</span>
              {analysis.prUrl && (
                <>
                  <span>&middot;</span>
                  <a
                    href={analysis.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-light)] hover:underline"
                  >
                    GitHub
                  </a>
                </>
              )}
            </div>

            {/* Severity breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SeverityStat label="Critical" count={analysis.critical} color="text-red-400" bg="bg-red-500/8" ring="ring-red-500/15" />
              <SeverityStat label="High" count={analysis.high} color="text-rose-400" bg="bg-rose-500/8" ring="ring-rose-500/15" />
              <SeverityStat label="Medium" count={analysis.medium} color="text-amber-400" bg="bg-amber-500/8" ring="ring-amber-500/15" />
              <SeverityStat label="Low" count={analysis.low} color="text-yellow-400" bg="bg-yellow-500/8" ring="ring-yellow-500/15" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-6">
        <AISummary analysisId={analysis.id} />
      </div>

      {/* Issues */}
      {analysis.issues.length > 0 ? (
        <>
          {/* Category filters */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const active = filter === cat;
              const config = categoryConfig[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer border ${
                    active
                      ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_12px_var(--accent-glow-strong)]"
                      : "bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {config.label}
                  {count > 0 && (
                    <span className={`text-[11px] tabular-nums ${active ? "text-white/70" : "text-[var(--text-muted)]"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Issue cards */}
          <div>
            {filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
            {filteredIssues.length === 0 && (
              <div className="glass rounded-2xl text-center py-12 text-[var(--text-muted)]">
                No {filter} issues found.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl text-center py-16">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-400">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
            </svg>
          </div>
          <p className="text-emerald-400 text-[15px] font-semibold mb-1">
            No issues found
          </p>
          <p className="text-[13px] text-[var(--text-muted)]">
            This PR passed all checks cleanly.
          </p>
        </div>
      )}
    </div>
  );
}

function SeverityStat({
  label,
  count,
  color,
  bg,
  ring,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
  ring: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${bg} ring-1 ${ring}`}>
      <span className={`text-xl font-black tabular-nums ${color}`}>
        {count}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}
