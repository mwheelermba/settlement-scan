"use client";

import { SettlementCard } from "@/components/SettlementCard";
import { matchSettlement } from "@/lib/matcher";
import { defaultProfile, loadProfile, saveProfile } from "@/lib/profile";
import { getSettlements } from "@/lib/settlements";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function SavedPage() {
  const [profile, setProfile] = useState<UserProfile>(() => defaultProfile());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadProfile() ?? defaultProfile());
      setReady(true);
    });
  }, []);

  const savedResults = useMemo(() => {
    const p = profile ?? defaultProfile();
    const ids = new Set(p.saved_settlement_ids ?? []);
    return getSettlements()
      .filter((s) => ids.has(s.id))
      .map((s) => matchSettlement(s, p));
  }, [profile]);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />;
  }

  function persist(next: UserProfile) {
    setProfile(next);
    saveProfile(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Saved for later</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Bookmarks live only in this browser.{" "}
          <Link href="/browse" className="font-medium text-teal-700 underline dark:text-teal-400">
            Browse settlements
          </Link>{" "}
          to add more.
        </p>
      </div>

      {savedResults.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          Nothing saved yet. On any settlement card, choose &quot;Save for later&quot; to list it here.
        </p>
      ) : (
        <ul className="space-y-4">
          {savedResults.map((r) => (
            <li key={r.settlement.id}>
              <SettlementCard result={r} profile={profile} onProfileChange={persist} linkFrom="browse" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
