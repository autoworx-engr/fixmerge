"use client";

import { useEffect, useState } from "react";

function getScoreColor(score: number): string {
  if (score >= 90) return "#34d399";
  if (score >= 80) return "#a3e635";
  if (score >= 70) return "#fbbf24";
  if (score >= 60) return "#fb923c";
  return "#f87171";
}

function getScoreGlow(score: number): string {
  if (score >= 90) return "rgba(52, 211, 153, 0.2)";
  if (score >= 80) return "rgba(163, 230, 53, 0.2)";
  if (score >= 70) return "rgba(251, 191, 36, 0.2)";
  if (score >= 60) return "rgba(251, 146, 60, 0.2)";
  return "rgba(248, 113, 113, 0.2)";
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getScoreColor(score);
  const glow = getScoreGlow(score);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative" style={{ width: size, height: size, filter: `drop-shadow(0 0 12px ${glow})` }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track with subtle tick marks */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(56, 189, 248, 0.04)" strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-mono tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mt-[-2px]">
          score
        </span>
      </div>
    </div>
  );
}
