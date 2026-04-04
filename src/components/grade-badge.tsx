const gradeConfig: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-500/8", text: "text-emerald-400", border: "border-emerald-500/20" },
  B: { bg: "bg-lime-500/8", text: "text-lime-400", border: "border-lime-500/20" },
  C: { bg: "bg-amber-500/8", text: "text-amber-400", border: "border-amber-500/20" },
  D: { bg: "bg-orange-500/8", text: "text-orange-400", border: "border-orange-500/20" },
  F: { bg: "bg-red-500/8", text: "text-red-400", border: "border-red-500/20" },
};

export function GradeBadge({
  grade,
  size = "sm",
}: {
  grade: string;
  size?: "sm" | "lg";
}) {
  const config = gradeConfig[grade] || {
    bg: "bg-zinc-500/8",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
  };

  if (size === "lg") {
    return (
      <div
        className={`relative w-[72px] h-[72px] rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center`}
      >
        <span className={`text-3xl font-black font-mono ${config.text}`}>{grade}</span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-black font-mono border ${config.bg} ${config.text} ${config.border}`}
    >
      {grade}
    </span>
  );
}
