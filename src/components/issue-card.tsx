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
  critical: "border-l-red-500/60",
  high: "border-l-rose-500/50",
  medium: "border-l-amber-500/40",
  low: "border-l-yellow-500/30",
};

export function IssueCard({ issue }: { issue: IssueData }) {
  const leftBorder = accentBorders[issue.severity] || "border-l-zinc-500/30";

  return (
    <div className={`group card rounded-xl mb-3 border-l-2 ${leftBorder} transition-all`}>
      <div className="pl-5 pr-4 py-4">
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--text-muted)] shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <code className="text-[11px] text-[var(--text-muted)] font-mono">
              {issue.filePath}
              {issue.lineNumber ? <span className="text-[var(--accent-light)]">:{issue.lineNumber}</span> : ""}
            </code>
          </div>
        )}

        {/* Code snippet */}
        {issue.codeSnippet && (
          <pre className="bg-[var(--bg-root)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 mt-2 text-[11px] font-mono overflow-x-auto whitespace-pre text-[var(--text-primary)]">
            {issue.codeSnippet}
          </pre>
        )}

        {/* Suggestion */}
        {issue.suggestion && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
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
