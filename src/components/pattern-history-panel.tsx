"use client";

import { renderMarkdownLite } from "@/lib/markdown-lite";

export function PatternHistoryPanel({ markdown }: { markdown: string | null }) {
  if (!markdown?.trim()) return null;

  return (
    <div className="card rounded-2xl overflow-hidden mb-6 border border-violet-500/15 bg-violet-500/[0.04]">
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-[var(--border-default)] bg-gradient-to-r from-violet-500/10 to-transparent">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-[13px]">
          🔁
        </div>
        <span className="text-[13px] font-bold text-violet-200/95">
          Historical pattern review
        </span>
        <span className="text-[10px] font-mono text-[var(--text-muted)] ml-1">
          repo history
        </span>
      </div>
      <div
        className="px-5 py-4 text-[13px] leading-relaxed text-[var(--text-secondary)] [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: renderMarkdownLite(markdown) }}
      />
    </div>
  );
}
