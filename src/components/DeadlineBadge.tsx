import { deadlineUrgency } from "@/lib/matcher";
import { todayIsoUtc } from "@/lib/settlements";

export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        Deadline varies
      </span>
    );
  }
  if (deadline < todayIsoUtc()) {
    return (
      <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
        Claim period ended ({deadline})
      </span>
    );
  }
  const u = deadlineUrgency(deadline);
  const color =
    u === "red"
      ? "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-100"
      : u === "yellow"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
        : u === "green"
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      Due {deadline}
    </span>
  );
}
