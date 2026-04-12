"use client";

import { SettlementCard } from "@/components/SettlementCard";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { matchSettlement } from "@/lib/matcher";
import { defaultProfile, loadProfile, saveProfile } from "@/lib/profile";
import { getSettlements } from "@/lib/settlements";
import type { Settlement, UserProfile } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function FiledClaimRow({
  settlement: s,
  onUnmark,
}: {
  settlement: Settlement;
  onUnmark: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <Link
          href={`/s/${s.id}`}
          className="text-sm font-semibold leading-snug text-zinc-900 hover:underline [overflow-wrap:anywhere] dark:text-zinc-50"
        >
          {s.title}
        </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.defendant}</p>
        <div className="flex flex-wrap items-center gap-2">
          <DeadlineBadge deadline={s.deadline} />
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{s.estimated_payout}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <a
          href={s.claim_url}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
        >
          Claim site
        </a>
        <button
          type="button"
          onClick={onUnmark}
          className="cursor-pointer text-xs font-medium text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
        >
          Unmark
        </button>
      </div>
    </div>
  );
}

export default function SavedPage() {
  const [profile, setProfile] = useState<UserProfile>(() => defaultProfile());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadProfile() ?? defaultProfile());
      setReady(true);
    });
  }, []);

  const allSettlements = useMemo(() => getSettlements(), []);

  const savedResults = useMemo(() => {
    const p = profile ?? defaultProfile();
    const ids = new Set(p.saved_settlement_ids ?? []);
    return allSettlements
      .filter((s) => ids.has(s.id))
      .map((s) => matchSettlement(s, p));
  }, [profile, allSettlements]);

  const filedSettlements = useMemo(() => {
    const ids = new Set(profile.filed_settlements ?? []);
    return allSettlements.filter((s) => ids.has(s.id));
  }, [profile, allSettlements]);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />;
  }

  function persist(next: UserProfile) {
    setProfile(next);
    saveProfile(next);
  }

  function unmarkFiled(id: string) {
    persist({
      ...profile,
      filed_settlements: profile.filed_settlements.filter((fid) => fid !== id),
    });
  }

  return (
    <div className="space-y-10">
      {/* Filed claims section */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Filed claims</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Settlements you marked as filed. Use the link to revisit the claim site and check on progress.
          </p>
        </div>

        {filedSettlements.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
            No claims marked as filed yet. When you file a claim, tap &quot;Mark as filed&quot; on the settlement card
            to track it here.
          </p>
        ) : (
          <ul className="space-y-2">
            {filedSettlements.map((s) => (
              <li key={s.id}>
                <FiledClaimRow settlement={s} onUnmark={() => unmarkFiled(s.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Saved for later section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Saved for later</h2>
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
      </section>
    </div>
  );
}
