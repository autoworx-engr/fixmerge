"use client";

import { useEffect, useState } from "react";

interface Props {
  distribution: { A: number; B: number; C: number; D: number; F: number };
  total: number;
}

const gradeConfig: Record<
  string,
  { color: string; bg: string; fill: string; glow: string; label: string }
> = {
  A: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    fill: "bg-emerald-500",
    glow: "shadow-emerald-500/30",
    label: "Excellent",
  },
  B: {
    color: "text-lime-400",
    bg: "bg-lime-500/8",
    fill: "bg-lime-500",
    glow: "shadow-lime-500/30",
    label: "Good",
  },
  C: {
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    fill: "bg-amber-500",
    glow: "shadow-amber-500/30",
    label: "Fair",
  },
  D: {
    color: "text-orange-400",
    bg: "bg-orange-500/8",
    fill: "bg-orange-500",
    glow: "shadow-orange-500/30",
    label: "Poor",
  },
  F: {
    color: "text-red-400",
    bg: "bg-red-500/8",
    fill: "bg-red-500",
    glow: "shadow-red-500/30",
    label: "Failing",
  },
};

export function GradeDistribution({ distribution, total }: Props) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const entries = Object.entries(distribution) as [string, number][];
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);

  // Donut segments
  const donutRadius = 52;
  const donutStroke = 12;
  const circumference = 2 * Math.PI * donutRadius;
  let cumulativeOffset = 0;
  const segments = entries
    .filter(([, count]) => count > 0)
    .map(([grade, count]) => {
      const pct = count / total;
      const length = pct * circumference;
      const offset = cumulativeOffset;
      cumulativeOffset += length;
      const cfg = gradeConfig[grade];
      return { grade, count, pct, length, offset, color: cfg.fill.replace("bg-", "") };
    });

  const donutColors: Record<string, string> = {
    A: "#34d399",
    B: "#a3e635",
    C: "#fbbf24",
    D: "#fb923c",
    F: "#f87171",
  };

  return (
    <div className="glass rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Grade Distribution
        </h2>
        <span className="text-[12px] text-[var(--text-muted)] tabular-nums">
          {total} {total === 1 ? "analysis" : "analyses"}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Donut chart */}
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" className="-rotate-90">
            {/* Track */}
            <circle
              cx="70"
              cy="70"
              r={donutRadius}
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={donutStroke}
            />
            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.grade}
                cx="70"
                cy="70"
                r={donutRadius}
                fill="none"
                stroke={donutColors[seg.grade]}
                strokeWidth={donutStroke}
                strokeLinecap="round"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={-seg.offset}
                style={{ transition: "stroke-dasharray 0.8s ease-out" }}
                opacity={0.85}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-[var(--text-primary)] tabular-nums">
              {total}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
              total
            </span>
          </div>
        </div>

        {/* Bars */}
        <div className="flex-1 w-full space-y-2.5">
          {entries.map(([grade, count]) => {
            const cfg = gradeConfig[grade];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const barWidth = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 4 : 0) : 0;

            return (
              <div key={grade} className="flex items-center gap-3">
                {/* Grade label */}
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} ring-1 ring-white/[0.04] flex items-center justify-center shrink-0`}>
                  <span className={`text-[13px] font-extrabold ${cfg.color}`}>
                    {grade}
                  </span>
                </div>

                {/* Bar + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] font-bold tabular-nums ${cfg.color}`}>
                        {count}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.fill} shadow-sm ${cfg.glow} transition-all duration-700 ease-out`}
                      style={{ width: animate ? `${barWidth}%` : "0%", opacity: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
