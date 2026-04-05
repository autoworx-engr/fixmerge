"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GradeBadge } from "@/components/grade-badge";
import { ScoreRing } from "@/components/score-ring";
import { IssueCard } from "@/components/issue-card";
import { AISummary } from "@/components/ai-summary";
import { PatternHistoryPanel } from "@/components/pattern-history-panel";

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

interface PatternHistory {
  recurring: unknown[];
  seenOnce: unknown[];
  brandNew: unknown[];
  markdown: string;
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
  patternHistory: PatternHistory | null;
  issues: Issue[];
}

const CATEGORIES = ["all", "bug", "security", "complexity", "quality"] as const;

const categoryConfig: Record<string, { label: string; icon: string }> = {
  all: { label: "All", icon: "⊕" },
  bug: { label: "Bugs", icon: "B" },
  security: { label: "Security", icon: "S" },
  complexity: { label: "Complexity", icon: "C" },
  quality: { label: "Quality", icon: "Q" },
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
        if (data && typeof data === "object" && !("error" in data)) {
          const a = data as Analysis;
          setAnalysis({
            ...a,
            patternHistory: a.patternHistory ?? null,
          });
        } else {
          setAnalysis(null);
        }
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
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/15">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
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
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] mb-6 font-mono">
        <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--accent-light)] transition-colors">
          dashboard
        </Link>
        <span className="text-[var(--accent)]/40">/</span>
        <span className="text-[var(--text-secondary)]">pr-{analysis.prNumber}</span>
      </div>

      {/* Report Header Card */}
      <div className="card rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Score Ring */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <ScoreRing score={analysis.score} size={130} strokeWidth={10} />
            <GradeBadge grade={analysis.grade} size="sm" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1 leading-snug">
              {analysis.prTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--text-muted)] mb-5 font-mono">
              <span className="text-[var(--accent-light)] font-semibold">#{analysis.prNumber}</span>
              <span className="text-[var(--text-muted)] text-[10px]">/</span>
              <span>{analysis.repo}</span>
              <span className="text-[var(--text-muted)] text-[10px]">/</span>
              <span>{analysis.author}</span>
              {analysis.prUrl && (
                <>
                  <span className="text-[var(--text-muted)] text-[10px]">/</span>
                  <a
                    href={analysis.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-light)] hover:underline"
                  >
                    github ↗
                  </a>
                </>
              )}
            </div>

            {/* Severity breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SeverityStat label="Critical" count={analysis.critical} color="text-red-400" borderColor="border-red-500/15" bg="bg-red-500/6" />
              <SeverityStat label="High" count={analysis.high} color="text-rose-400" borderColor="border-rose-500/15" bg="bg-rose-500/6" />
              <SeverityStat label="Medium" count={analysis.medium} color="text-amber-400" borderColor="border-amber-500/15" bg="bg-amber-500/6" />
              <SeverityStat label="Low" count={analysis.low} color="text-yellow-400" borderColor="border-yellow-500/15" bg="bg-yellow-500/6" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-6">
        <AISummary analysisId={analysis.id} />
      </div>

      <PatternHistoryPanel
        markdown={analysis.patternHistory?.markdown ?? null}
      />

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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono font-semibold transition-all cursor-pointer border ${
                    active
                      ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_16px_var(--accent-glow-strong)]"
                      : "bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {config.label}
                  {count > 0 && (
                    <span className={`text-[10px] tabular-nums ${active ? "text-white/70" : "text-[var(--text-muted)]"}`}>
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
              <div className="card rounded-2xl text-center py-12 text-[var(--text-muted)] font-mono text-[13px]">
                No {filter} issues found.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card rounded-2xl text-center py-16">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-emerald-400 text-[15px] font-semibold mb-1">
            No issues found
          </p>
          <p className="text-[13px] text-[var(--text-muted)] font-mono">
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
  borderColor,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  borderColor: string;
  bg: string;
  ring?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${bg} border ${borderColor}`}>
      <span className={`text-xl font-black tabular-nums ${color}`}>
        {count}
      </span>
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}
