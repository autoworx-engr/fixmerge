import Link from "next/link";
import { prisma } from "@/lib/db";
import { GradeBadge } from "@/components/grade-badge";
import { GradeDistribution } from "@/components/grade-distribution";

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const analyses = await prisma.pRAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const total = await prisma.pRAnalysis.count();
  const completed = analyses.filter((a) => a.status === "completed");
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((s, a) => s + a.score, 0) / completed.length)
      : 0;
  const cleanCount = completed.filter((a) => a.totalIssues === 0).length;
  const totalIssues = completed.reduce((s, a) => s + a.totalIssues, 0);

  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const a of completed) {
    const g = getGrade(a.score) as keyof typeof gradeDistribution;
    gradeDistribution[g]++;
  }

  return (
    <>
      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Scans"
          value={total.toString()}
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--accent-light)]">
              <path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/>
            </svg>
          }
        />
        <StatCard
          label="Avg Score"
          value={`${avgScore}`}
          suffix="/100"
          highlight
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-400">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
            </svg>
          }
        />
        <StatCard
          label="Clean Merges"
          value={cleanCount.toString()}
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-400">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
            </svg>
          }
        />
        <StatCard
          label="Issues Found"
          value={totalIssues.toString()}
          icon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" className="text-amber-400">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707L2.138 13.132a.25.25 0 0 0 .22.368h12.284a.25.25 0 0 0 .22-.368L8.78 1.754a.25.25 0 0 0-.44 0ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
            </svg>
          }
        />
      </div>

      {/* Grade distribution */}
      {completed.length > 0 && (
        <GradeDistribution distribution={gradeDistribution} total={completed.length} />
      )}

      {/* PR List */}
      <div className="mb-4">
        <h2 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Recent Analyses
        </h2>
      </div>

      {analyses.length > 0 ? (
        <div className="space-y-2">
          {analyses.map((a) => {
            const grade = getGrade(a.score);
            return (
              <Link
                key={a.id}
                href={`/report/${a.id}`}
                className="group glass rounded-xl p-4 flex items-center gap-4 transition-all hover:border-[var(--accent)]/20 hover:bg-[var(--accent-glow)] block"
              >
                {/* Grade */}
                <GradeBadge grade={grade} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors">
                      #{a.prNumber}
                    </span>
                    <span className="text-[13px] text-[var(--text-secondary)] truncate">
                      {a.prTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {a.repoFullName}
                    </span>
                    <span className="text-[var(--text-muted)]">&middot;</span>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {a.author}
                    </span>
                    <span className="text-[var(--text-muted)]">&middot;</span>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Score pill */}
                <div className="hidden sm:flex items-center gap-3">
                  {a.totalIssues > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {a.criticalCount > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-[2px] rounded-md text-[11px] font-semibold bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {a.criticalCount}
                        </span>
                      )}
                      {a.highCount > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-[2px] rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          {a.highCount}
                        </span>
                      )}
                      {a.mediumCount > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-[2px] rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {a.mediumCount}
                        </span>
                      )}
                      {a.lowCount > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-[2px] rounded-md text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          {a.lowCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="px-2 py-[2px] rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                      Clean
                    </span>
                  )}
                </div>

                {/* Status + Arrow */}
                <div className="flex items-center gap-2">
                  <StatusDot status={a.status} />
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--text-muted)] group-hover:text-[var(--accent-light)] transition-colors">
                    <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/>
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--accent-light)]">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            No analyses yet
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] max-w-sm mx-auto mb-5">
            Point a GitHub webhook at this server and merge a PR to start scanning.
          </p>
          <code className="inline-block px-4 py-2 rounded-lg bg-black/30 border border-[var(--border-default)] text-[13px] font-mono text-[var(--accent-light)]">
            POST /api/webhook/github
          </code>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-5 ${highlight ? "ring-1 ring-[var(--accent)]/15" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black tabular-nums ${highlight ? "text-emerald-400" : "text-[var(--text-primary)]"}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-[13px] font-medium text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-400",
    running: "bg-blue-400 animate-pulse",
    pending: "bg-zinc-500",
    failed: "bg-red-500",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full ${colors[status] || colors.pending}`}
      title={status}
    />
  );
}
