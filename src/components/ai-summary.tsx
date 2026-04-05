"use client";

import { useState } from "react";
import { renderMarkdownLite } from "@/lib/markdown-lite";

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
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
        className="w-full card rounded-2xl p-5 flex items-center gap-3 cursor-pointer transition-all hover:border-[var(--accent)]/20 group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-glow)] to-indigo-500/10 border border-[var(--accent)]/15 flex items-center justify-center shrink-0">
          <SparkleIcon className="text-[var(--accent-light)] w-4 h-4" />
        </div>
        <div className="text-left flex-1">
          <div className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors">
            AI Analysis Summary
          </div>
          <div className="text-[12px] text-[var(--text-muted)] font-mono">
            Get an AI-powered overview of this PR&apos;s issues
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] text-[12px] font-bold text-white shrink-0">
          Generate
        </div>
      </button>
    );
  }

  return (
    <div className="card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--accent-glow)] to-transparent">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent)]/15 flex items-center justify-center">
          <SparkleIcon className="text-[var(--accent-light)] w-3.5 h-3.5" />
        </div>
        <span className="text-[13px] font-bold text-[var(--accent-light)]">
          AI Analysis Summary
        </span>
        {summary && (
          <button
            onClick={generate}
            className="ml-auto text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--accent-light)] transition-colors cursor-pointer"
          >
            regenerate
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {loading && (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-[13px] font-mono text-[var(--text-muted)]">analyzing...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-[13px]">
            <span className="text-red-400 shrink-0 mt-0.5">&#10005;</span>
            <div>
              <span className="text-red-400">{error}</span>
              <button
                onClick={generate}
                className="ml-2 text-[var(--accent-light)] hover:underline cursor-pointer font-mono"
              >
                retry
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div
            className="text-[13px] leading-relaxed text-[var(--text-secondary)] [&_strong]:block [&_strong]:mt-3 [&_strong]:mb-1 first:[&_strong]:mt-0"
            dangerouslySetInnerHTML={{ __html: renderMarkdownLite(summary) }}
          />
        )}
      </div>
    </div>
  );
}
