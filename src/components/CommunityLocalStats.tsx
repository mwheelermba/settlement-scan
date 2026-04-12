"use client";

import { StatCard } from "@/components/StatCard";
import { getLocalMetrics } from "@/lib/local-metrics";
import { useEffect, useState } from "react";

export function CommunityLocalStats() {
  const [m, setM] = useState({ claim_clicks: 0, shares: 0, settlement_views: 0 });

  useEffect(() => {
    setM(getLocalMetrics());
  }, []);

  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Totals for <span className="font-medium text-zinc-800 dark:text-zinc-200">this browser only</span> — stored in
        local storage on your device, not on our servers.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Claim links you opened" value={m.claim_clicks} sub="This device" />
        <StatCard label="Shares you generated" value={m.shares} sub="This device" />
        <StatCard label="Settlement pages you viewed" value={m.settlement_views} sub="This device" />
      </div>
    </>
  );
}
