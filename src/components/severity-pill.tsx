const severityConfig: Record<string, string> = {
  critical: "bg-red-500/8 text-red-400 border-red-500/15",
  high: "bg-rose-500/8 text-rose-400 border-rose-500/15",
  medium: "bg-amber-500/8 text-amber-400 border-amber-500/15",
  low: "bg-yellow-500/8 text-yellow-400 border-yellow-500/15",
  info: "bg-zinc-500/8 text-zinc-400 border-zinc-500/15",
};

const dotColors: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-yellow-400",
  info: "bg-zinc-400",
};

export function SeverityPill({ severity, count }: { severity: string; count?: number }) {
  const style = severityConfig[severity] || "bg-zinc-500/8 text-zinc-400 border-zinc-500/15";
  const dot = dotColors[severity] || "bg-zinc-400";
  const label = count !== undefined ? `${count} ${severity}` : severity;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded text-[10px] font-mono font-bold uppercase tracking-wide border ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

const categoryIcons: Record<string, string> = {
  bug: "B",
  security: "S",
  complexity: "C",
  quality: "Q",
};

export function CategoryPill({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded text-[10px] font-mono font-bold bg-[var(--accent-glow)] text-[var(--accent-light)] border border-[var(--accent)]/12 uppercase tracking-wide">
      <span className="w-4 h-4 rounded bg-[var(--accent)]/15 flex items-center justify-center text-[9px] font-bold">
        {categoryIcons[category] || "?"}
      </span>
      {category}
    </span>
  );
}
