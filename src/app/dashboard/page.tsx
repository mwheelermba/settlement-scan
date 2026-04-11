import { StatCard } from "@/components/StatCard";
import { deadlineUrgency } from "@/lib/matcher";
import { getCommunityStats } from "@/lib/kv-stats";
import { getActiveSettlements } from "@/lib/settlements";

export const revalidate = 15;

export default async function DashboardPage() {
  const settlements = getActiveSettlements();
  const stats = await getCommunityStats();
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const closingThisWeek = settlements.filter((s) => {
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
        <h1 className="text-2xl font-semibold tracking-tight">Community impact</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Anonymous aggregate metrics. Visitor counts live in{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Vercel Analytics</span>. Claim and share totals
          use{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Redis</span> when{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">REDIS_URL</code> or{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">KV_REST_API_*</code> is set.
        </p>
        {!stats.kvEnabled && (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
            Redis is not configured — claim/share numbers show “—”. Set <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">REDIS_URL</code> (Serverless Redis) or REST keys in Vercel and redeploy (see README).
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Settlements tracked" value={settlements.length} />
        <StatCard label="Closing this week (approx.)" value={closingThisWeek} />
        <StatCard
          label="Unique visitors"
          value="See Vercel Analytics"
          sub="Not stored in this app"
        />
        <StatCard label="Claim links clicked (all time)" value={claimLabel} />
        <StatCard label="Shares generated (all time)" value={shareLabel} />
      </div>
    </div>
  );
}
