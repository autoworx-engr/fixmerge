import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, clearSession } from "@/lib/auth";
import { GradeBadge } from "@/components/grade-badge";
import { GradeDistribution } from "@/components/grade-distribution";
import { ProjectSetup } from "@/components/project-setup";

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
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    include: {
      projects: {
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      },
    },
  });

  if (!company) {
    await clearSession();
    redirect("/login");
  }

  const project = company.projects[0];
  const analyses = project?.analyses ?? [];

  const total = analyses.length;
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
      {/* Hero section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">
            Dashboard
          </h1>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-default)] to-transparent" />
          <span className="mono-label">
            {company.name}
          </span>
        </div>
      </div>

      {/* Project setup card — show when no analyses yet */}
      {project && total === 0 && (
        <ProjectSetup
          repoFullName={project.repoFullName}
          webhookSecret={project.webhookSecret}
          apiKey={company.apiKey}
        />
      )}

      {/* Project info bar */}
      {project && total > 0 && (
        <div className="card rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--text-muted)]">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            <span className="font-mono text-[13px] text-[var(--accent-light)]">{project.repoFullName}</span>
          </div>
          <div className="h-px flex-1 bg-[var(--border-default)] hidden sm:block" />
          <span className="mono-label">
            {total} {total === 1 ? "scan" : "scans"} total
          </span>
        </div>
      )}

      {/* Bento stats grid */}
      {total > 0 && (
        <>
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-3 mb-8">
            <div className="col-span-6 bento bento-featured rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mono-label mb-3">avg quality score</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tabular-nums text-gradient">
                      {avgScore}
                    </span>
                    <span className="text-lg font-medium text-[var(--text-muted)]">/100</span>
                  </div>
                  <div className="mt-3 status-bar w-full max-w-[200px]">
                    <div
                      className="status-bar-fill"
                      style={{
                        width: `${avgScore}%`,
                        background: `linear-gradient(90deg, ${avgScore >= 80 ? '#34d399' : avgScore >= 60 ? '#fbbf24' : '#f87171'}, ${avgScore >= 80 ? '#0ea5e9' : avgScore >= 60 ? '#fb923c' : '#ef4444'})`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent-light)]">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="col-span-3 lg:col-span-2 bento rounded-2xl p-5 relative overflow-hidden">
              <div className="mono-label mb-2">scans</div>
              <span className="text-2xl font-black tabular-nums text-[var(--text-primary)]">
                {total}
              </span>
              <div className="absolute top-4 right-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--text-muted)]">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
            </div>

            <div className="col-span-3 lg:col-span-2 bento rounded-2xl p-5 relative overflow-hidden">
              <div className="mono-label mb-2">clean</div>
              <span className="text-2xl font-black tabular-nums text-emerald-400">
                {cleanCount}
              </span>
              <div className="absolute top-4 right-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/40">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-2 bento rounded-2xl p-5 relative overflow-hidden">
              <div className="mono-label mb-2">issues found</div>
              <span className={`text-2xl font-black tabular-nums ${totalIssues > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                {totalIssues}
              </span>
              <div className="absolute top-4 right-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/40">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </div>
          </div>

          {completed.length > 0 && (
            <GradeDistribution distribution={gradeDistribution} total={completed.length} />
          )}
        </>
      )}

      {/* PR Feed */}
      {total > 0 && (
        <>
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Recent Analyses
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-default)] to-transparent" />
            </div>
          </div>

          <div className="space-y-0">
            {analyses.map((a, idx) => {
              const grade = getGrade(a.score);
              return (
                <div key={a.id} className="merge-connector">
                  <Link
                    href={`/report/${a.id}`}
                    className="group terminal-row rounded-xl p-4 flex items-center gap-4 transition-all block"
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 w-8">
                      <div className={`w-3 h-3 rounded-full border-2 transition-colors ${
                        a.status === 'completed'
                          ? a.totalIssues === 0
                            ? 'border-emerald-400 bg-emerald-400/20'
                            : a.score >= 70
                              ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                              : 'border-amber-400 bg-amber-400/20'
                          : a.status === 'running'
                            ? 'border-blue-400 bg-blue-400/20 animate-pulse'
                            : a.status === 'failed'
                              ? 'border-red-400 bg-red-400/20'
                              : 'border-[var(--text-muted)] bg-transparent'
                      }`} />
                      {idx < analyses.length - 1 && (
                        <div className="w-px h-2 bg-[var(--border-default)]" />
                      )}
                    </div>

                    <GradeBadge grade={grade} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-[var(--accent-light)] group-hover:text-white transition-colors">
                          #{a.prNumber}
                        </span>
                        <span className={`px-1.5 py-[1px] rounded text-[9px] font-mono font-bold uppercase border ${
                          a.trigger === 'merged'
                            ? 'text-violet-400 bg-violet-500/8 border-violet-500/15'
                            : 'text-[var(--accent)] bg-[var(--accent-glow)] border-[var(--accent)]/15'
                        }`}>
                          {a.trigger === 'merged' ? 'merged' : a.trigger === 'synchronize' ? 'updated' : 'review'}
                        </span>
                        <span className="text-[13px] text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)] transition-colors">
                          {a.prTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          {a.repoFullName}
                        </span>
                        <span className="text-[var(--text-muted)] text-[10px]">/</span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {a.author}
                        </span>
                        <span className="text-[var(--text-muted)] text-[10px]">/</span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5">
                      {a.totalIssues > 0 ? (
                        <>
                          {a.criticalCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/15">
                              {a.criticalCount} crit
                            </span>
                          )}
                          {a.highCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/15">
                              {a.highCount} high
                            </span>
                          )}
                          {a.mediumCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/15">
                              {a.mediumCount} med
                            </span>
                          )}
                          {a.lowCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/15">
                              {a.lowCount} low
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-[2px] rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                          clean
                        </span>
                      )}
                    </div>

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] group-hover:text-[var(--accent-light)] group-hover:translate-x-0.5 transition-all shrink-0">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
