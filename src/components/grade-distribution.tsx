"use client";

import { useEffect, useState } from "react";

interface Props {
  distribution: { A: number; B: number; C: number; D: number; F: number };
  total: number;
}

const gradeConfig: Record<
  string,
  { color: string; bg: string; fill: string; label: string }
> = {
  A: { color: "text-emerald-400", bg: "bg-emerald-500/6", fill: "bg-emerald-500", label: "Excellent" },
  B: { color: "text-lime-400", bg: "bg-lime-500/6", fill: "bg-lime-500", label: "Good" },
  C: { color: "text-amber-400", bg: "bg-amber-500/6", fill: "bg-amber-500", label: "Fair" },
  D: { color: "text-orange-400", bg: "bg-orange-500/6", fill: "bg-orange-500", label: "Poor" },
  F: { color: "text-red-400", bg: "bg-red-500/6", fill: "bg-red-500", label: "Failing" },
};

const donutColors: Record<string, string> = {
  A: "#34d399",
  B: "#a3e635",
  C: "#fbbf24",
  D: "#fb923c",
  F: "#f87171",
};

export function GradeDistribution({ distribution, total }: Props) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const entries = Object.entries(distribution) as [string, number][];
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);

  const donutRadius = 50;
  const donutStroke = 10;
  const circumference = 2 * Math.PI * donutRadius;
  let cumulativeOffset = 0;
  const segments = entries
    .filter(([, count]) => count > 0)
    .map(([grade, count]) => {
      const pct = count / total;
      const length = pct * circumference;
      const offset = cumulativeOffset;
      cumulativeOffset += length;
      return { grade, count, pct, length, offset };
    });

  return (
    <div className="card rounded-2xl p-6 mb-8 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Grade Distribution
          </h2>
          <div className="h-px w-12 bg-gradient-to-r from-[var(--border-default)] to-transparent" />
        </div>
        <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
          {total} {total === 1 ? "analysis" : "analyses"}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Donut chart */}
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" className="-rotate-90">
            <circle
              cx="70" cy="70" r={donutRadius}
              fill="none" stroke="rgba(56, 189, 248, 0.04)" strokeWidth={donutStroke}
            />
            {segments.map((seg) => (
              <circle
                key={seg.grade}
                cx="70" cy="70" r={donutRadius}
                fill="none"
                stroke={donutColors[seg.grade]}
                strokeWidth={donutStroke}
                strokeLinecap="round"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={-seg.offset}
                style={{ transition: "stroke-dasharray 0.8s ease-out" }}
                opacity={0.8}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-gradient tabular-nums">
              {total}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
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
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} border border-white/[0.04] flex items-center justify-center shrink-0`}>
                  <span className={`text-[13px] font-black font-mono ${cfg.color}`}>
                    {grade}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[12px] font-bold tabular-nums ${cfg.color}`}>
                        {count}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.fill} transition-all duration-700 ease-out`}
                      style={{ width: animate ? `${barWidth}%` : "0%", opacity: 0.7 }}
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
