"use client";

import { SettlementCard } from "@/components/SettlementCard";
import { getActiveSettlements } from "@/lib/settlements";
import { hasMinimumProfile, loadProfile, saveProfile } from "@/lib/profile";
import { rankMatches } from "@/lib/matcher";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const settlements = getActiveSettlements();

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadProfile());
      setReady(true);
    });
  }, []);

  function persist(p: UserProfile) {
    setProfile(p);
    saveProfile(p);
  }

  const ranked = useMemo(() => {
    if (!profile || !hasMinimumProfile(profile)) return [];
    const dismissed = new Set(profile.dismissed_settlements);
    return rankMatches(settlements, profile).filter(
      (r) => !dismissed.has(r.settlement.id) && r.score > 0
    );
  }, [profile]);

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!profile || !hasMinimumProfile(profile)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to SettlementScan</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Add your state and a few details — we match you to open class action settlements. Nothing is uploaded; your
            profile lives only on this device.
          </p>
        </div>
        <Link
          href="/profile"
          className="inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Build your profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your matches</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Ranked by fit and deadline. Update your{" "}
            <Link href="/profile" className="font-medium text-teal-700 underline dark:text-teal-400">
              profile
            </Link>{" "}
            anytime.
          </p>
        </div>
        <Link href="/browse" className="text-sm font-medium text-teal-700 dark:text-teal-400">
          Browse all settlements →
        </Link>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          No strong matches yet. Try adding services, products, or breach names on your profile, or browse all active
          settlements.
        </p>
      ) : (
        <ul className="space-y-4">
          {ranked.map((r) => (
            <li key={r.settlement.id}>
              <SettlementCard result={r} profile={profile} onProfileChange={persist} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
