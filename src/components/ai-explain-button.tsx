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
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/30 border border-[var(--border-default)] rounded-lg px-3 py-2 mt-2 mb-2 text-[12px] font-mono overflow-x-auto whitespace-pre text-[var(--text-primary)]">$2</pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/30 text-[11px] font-mono text-[var(--accent-light)]">$1</code>')
    .replace(/^(\d+)\.\s/gm, '<span class="text-[var(--accent-light)] font-semibold">$1.</span> ')
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
        className="flex items-center gap-1.5 text-[12px] font-medium text-violet-400/80 hover:text-violet-300 transition-colors cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.53 1.282a.5.5 0 0 1 .94 0l1.478 4.03a.5.5 0 0 0 .311.297l4.03 1.281a.5.5 0 0 1 0 .942l-4.03 1.281a.5.5 0 0 0-.311.297L8.47 13.64a.5.5 0 0 1-.94 0L6.052 9.61a.5.5 0 0 0-.311-.297L1.711 8.032a.5.5 0 0 1 0-.942l4.03-1.281a.5.5 0 0 0 .311-.297L7.53 1.282Z"/>
        </svg>
        {explanation ? (open ? "Hide AI explanation" : "Show AI explanation") : "Explain with AI"}
      </button>

      {open && (
        <div className="mt-2 px-3.5 py-3 rounded-xl bg-violet-500/[0.04] border border-violet-500/10">
          {loading && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[12px] text-[var(--text-muted)]">Thinking...</span>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-red-400">
              {error}
              <button onClick={explain} className="ml-2 text-violet-400 hover:underline cursor-pointer">
                Retry
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
