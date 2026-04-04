import { SeverityPill, CategoryPill } from "./severity-pill";
import { AIExplainButton } from "./ai-explain-button";

interface IssueData {
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

const accentBorders: Record<string, string> = {
  critical: "from-red-500/60 to-red-500/0",
  high: "from-rose-500/50 to-rose-500/0",
  medium: "from-amber-500/40 to-amber-500/0",
  low: "from-yellow-500/30 to-yellow-500/0",
};

export function IssueCard({ issue }: { issue: IssueData }) {
  const gradient = accentBorders[issue.severity] || "from-zinc-500/30 to-zinc-500/0";

  return (
    <div className="group relative rounded-xl overflow-hidden mb-3">
      {/* Left gradient accent */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${gradient}`}
      />

      <div className="glass rounded-xl pl-5 pr-4 py-4 transition-all group-hover:border-[var(--border-hover)]">
        {/* Header */}
        <div className="flex items-start gap-2 flex-wrap mb-2.5">
          <SeverityPill severity={issue.severity} />
          <CategoryPill category={issue.category} />
          <h3 className="font-semibold text-[14px] text-[var(--text-primary)] leading-snug">
            {issue.title}
          </h3>
        </div>

        {/* Description */}
        {issue.description && (
          <p className="text-[13px] text-[var(--text-secondary)] mb-2 leading-relaxed">
            {issue.description}
          </p>
        )}

        {/* File location */}
        {issue.filePath && (
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--text-muted)] shrink-0">
              <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/>
            </svg>
            <code className="text-[12px] text-[var(--text-muted)] font-mono">
              {issue.filePath}
              {issue.lineNumber ? <span className="text-[var(--accent-light)]">:{issue.lineNumber}</span> : ""}
            </code>
          </div>
        )}

        {/* Code snippet */}
        {issue.codeSnippet && (
          <pre className="bg-black/30 border border-[var(--border-default)] rounded-lg px-3 py-2.5 mt-2 text-[12px] font-mono overflow-x-auto whitespace-pre text-[var(--text-primary)]">
            {issue.codeSnippet}
          </pre>
        )}

        {/* Suggestion */}
        {issue.suggestion && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-400 shrink-0 mt-0.5">
              <path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863.5 8 .5s5.5 1.81 5.5 4.75c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/>
            </svg>
            <p className="text-[13px] text-emerald-400/90 leading-relaxed">
              {issue.suggestion}
            </p>
          </div>
        )}

        {/* AI Explain */}
        <AIExplainButton issue={issue} />
      </div>
    </div>
  );
}
