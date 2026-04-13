"use client";

import { SettlementCard } from "@/components/SettlementCard";
import { getOpenSettlements } from "@/lib/settlements";
import { applyProfileUpdate, hasMinimumProfile, loadProfile, saveProfile, type ProfileUpdater } from "@/lib/profile";
import { MIN_HOME_MATCH_SCORE, rankMatches } from "@/lib/matcher";
import type { UserProfile } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const settlements = getOpenSettlements();

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadProfile());
      setReady(true);
    });
  }, []);

  function persist(update: ProfileUpdater) {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = applyProfileUpdate(prev, update);
      saveProfile(next);
      return next;
    });
  }

  const ranked = useMemo(() => {
    if (!profile || !hasMinimumProfile(profile)) return [];
    const dismissed = new Set(profile.dismissed_settlements);
    return rankMatches(settlements, profile).filter(
      (r) => !dismissed.has(r.settlement.id) && r.score >= MIN_HOME_MATCH_SCORE
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
          onClick={() => void trackEvent({ type: "profile_build" })}
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
            Ranked by fit and deadline.{" "}
            <Link href="/profile" className="font-medium text-teal-700 underline dark:text-teal-400">
              Update your profile
            </Link>{" "}
            anytime.
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {ranked.length} match{ranked.length === 1 ? "" : "es"}
          </p>
        </div>
        <Link href="/browse" className="text-sm font-medium text-teal-700 dark:text-teal-400">
          Browse all settlements →
        </Link>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          No matches at or above {MIN_HOME_MATCH_SCORE}% yet. Add or adjust details on your profile, or browse all
          settlements with scores.
        </p>
      ) : (
        <ul className="space-y-4">
          {ranked.map((r) => (
            <li key={r.settlement.id}>
              <SettlementCard result={r} profile={profile} onProfileChange={persist} linkFrom="matches" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
