import { StatCard } from "@/components/StatCard";
import { deadlineUrgency } from "@/lib/matcher";
import { getActiveSettlements } from "@/lib/settlements";

export default function DashboardPage() {
  const settlements = getActiveSettlements();
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const closingThisWeek = settlements.filter((s) => {
    if (!s.deadline) return false;
    const d = new Date(s.deadline + "T12:00:00Z");
    const diff = d.getTime() - now.getTime();
    return diff >= 0 && diff <= weekMs && deadlineUrgency(s.deadline) !== "none";
  }).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community impact</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Anonymous aggregate metrics. Enable Vercel Analytics on your deployment for visitor counts. Claim clicks and
          shares will appear here once counters are wired (see README).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Settlements tracked" value={settlements.length} />
        <StatCard label="Closing this week (approx.)" value={closingThisWeek} />
        <StatCard label="Unique visitors" value="—" />
        <StatCard label="Claim links clicked" value="—" />
      </div>
    </div>
  );
}
