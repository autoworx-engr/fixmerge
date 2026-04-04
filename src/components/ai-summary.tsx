"use client";

import { useState } from "react";

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M7.53 1.282a.5.5 0 0 1 .94 0l1.478 4.03a.5.5 0 0 0 .311.297l4.03 1.281a.5.5 0 0 1 0 .942l-4.03 1.281a.5.5 0 0 0-.311.297L8.47 13.64a.5.5 0 0 1-.94 0L6.052 9.61a.5.5 0 0 0-.311-.297L1.711 8.032a.5.5 0 0 1 0-.942l4.03-1.281a.5.5 0 0 0 .311-.297L7.53 1.282Z"/>
      <path d="M13.042.95a.25.25 0 0 1 .47 0l.592 1.614a.25.25 0 0 0 .156.149l1.614.592a.25.25 0 0 1 0 .47l-1.614.593a.25.25 0 0 0-.156.148l-.592 1.614a.25.25 0 0 1-.47 0l-.593-1.614a.25.25 0 0 0-.148-.156L10.687 3.8a.25.25 0 0 1 0-.47l1.614-.593a.25.25 0 0 0 .148-.156L13.042.95Z"/>
    </svg>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-black/30 text-[12px] font-mono text-[var(--accent-light)]">$1</code>')
    .replace(/^(\d+)\.\s/gm, '<span class="text-[var(--accent-light)] font-semibold">$1.</span> ')
    .replace(/\n/g, "<br/>");
}

export function AISummary({ analysisId }: { analysisId: number }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/summary?id=${analysisId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate summary");
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!summary && !loading && !error) {
    return (
      <button
        onClick={generate}
        className="w-full glass rounded-2xl p-5 flex items-center gap-3 cursor-pointer transition-all hover:border-[var(--accent)]/20 group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
          <SparkleIcon className="text-violet-400" />
        </div>
        <div className="text-left flex-1">
          <div className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-violet-300 transition-colors">
            AI Analysis Summary
          </div>
          <div className="text-[12px] text-[var(--text-muted)]">
            Get an AI-powered overview of this PR&apos;s issues and recommendations
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-[12px] font-semibold text-white shrink-0 shadow-lg shadow-violet-500/20">
          Generate
        </div>
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-[var(--border-default)] bg-gradient-to-r from-violet-500/[0.06] to-indigo-500/[0.03]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/25 to-indigo-500/25 flex items-center justify-center">
          <SparkleIcon className="text-violet-400 w-3.5 h-3.5" />
        </div>
        <span className="text-[13px] font-semibold text-violet-300">
          AI Analysis Summary
        </span>
        {summary && (
          <button
            onClick={generate}
            className="ml-auto text-[11px] text-[var(--text-muted)] hover:text-violet-400 transition-colors cursor-pointer"
          >
            Regenerate
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {loading && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[13px] text-[var(--text-muted)]">Analyzing with AI...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-[13px]">
            <span className="text-red-400 shrink-0 mt-0.5">&#10005;</span>
            <div>
              <span className="text-red-400">{error}</span>
              <button
                onClick={generate}
                className="ml-2 text-[var(--accent-light)] hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div
            className="text-[13px] leading-relaxed text-[var(--text-secondary)] [&_strong]:block [&_strong]:mt-3 [&_strong]:mb-1 first:[&_strong]:mt-0"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
          />
        )}
      </div>
    </div>
  );
}
