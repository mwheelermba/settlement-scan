import { CommunityLocalStats } from "@/components/CommunityLocalStats";
import { StatCard } from "@/components/StatCard";
import { deadlineUrgency } from "@/lib/matcher";
import { getCommunityStats } from "@/lib/kv-stats";
import { getActiveSettlements, getOpenSettlements } from "@/lib/settlements";

export const revalidate = 15;

export default async function DashboardPage() {
  const settlements = getActiveSettlements();
  const openSettlements = getOpenSettlements();
  const stats = await getCommunityStats();
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const closingThisWeek = openSettlements.filter((s) => {
    if (!s.deadline) return false;
    const d = new Date(s.deadline + "T12:00:00Z");
    const diff = d.getTime() - now.getTime();
    return diff >= 0 && diff <= weekMs && deadlineUrgency(s.deadline) !== "none";
  }).length;

  const claimLabel = stats.kvEnabled ? stats.claims : "—";
  const shareLabel = stats.kvEnabled ? stats.shares : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Community</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          A snapshot of what the app tracks in the database (when configured) plus your own activity on this device.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Your activity</h2>
        <CommunityLocalStats />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Everyone</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Anonymous totals from all users.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Settlements in the list" value={settlements.length} />
          <StatCard label="Closing this week (approx.)" value={closingThisWeek} />
          <StatCard label="Claim links opened (all users)" value={claimLabel} />
          <StatCard label="Shares generated (all users)" value={shareLabel} />
        </div>
      </section>
    </div>
  );
}
