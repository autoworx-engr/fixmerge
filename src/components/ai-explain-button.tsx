"use client";

import { useState } from "react";

interface IssueForAI {
  title: string;
  description: string;
  severity: string;
  category: string;
  filePath: string;
  lineNumber?: number | null;
  codeSnippet: string;
  suggestion: string;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[var(--bg-root)] border border-[var(--border-default)] rounded-lg px-3 py-2 mt-2 mb-2 text-[11px] font-mono overflow-x-auto whitespace-pre text-[var(--text-primary)]">$2</pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-[var(--bg-root)] text-[10px] font-mono text-[var(--accent-light)] border border-[var(--border-default)]">$1</code>')
    .replace(/^(\d+)\.\s/gm, '<span class="text-[var(--accent-light)] font-mono font-semibold">$1.</span> ')
    .replace(/\n/g, "<br/>");
}

export function AIExplainButton({ issue }: { issue: IssueForAI }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const explain = async () => {
    if (explanation) {
      setOpen(!open);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issue),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={explain}
        className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[var(--accent)]/70 hover:text-[var(--accent-light)] transition-colors cursor-pointer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        {explanation ? (open ? "hide explanation" : "show explanation") : "explain with ai"}
      </button>

      {open && (
        <div className="mt-2 px-3.5 py-3 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/10">
          {loading && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[12px] font-mono text-[var(--text-muted)]">thinking...</span>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-red-400 font-mono">
              {error}
              <button onClick={explain} className="ml-2 text-[var(--accent-light)] hover:underline cursor-pointer">
                retry
              </button>
            </div>
          )}

          {explanation && (
            <div
              className="text-[13px] leading-relaxed text-[var(--text-secondary)] [&_strong]:block [&_strong]:mt-2.5 [&_strong]:mb-0.5 first:[&_strong]:mt-0"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
