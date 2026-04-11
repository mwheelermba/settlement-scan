"use client";

export function MatchScoreRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const stroke =
    pct >= 100
      ? "stroke-emerald-500"
      : pct >= 75
        ? "stroke-teal-500"
        : pct >= 50
          ? "stroke-amber-500"
          : "stroke-zinc-400";

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="-rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} className="fill-none stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className={`fill-none ${stroke} transition-[stroke-dashoffset] duration-500`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-900 dark:text-zinc-50">
        {pct}%
      </span>
    </div>
  );
}
