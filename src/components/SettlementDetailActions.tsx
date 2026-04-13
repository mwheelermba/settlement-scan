"use client";

import { applyProfileUpdate, defaultProfile, loadProfile, saveProfile, type ProfileUpdater } from "@/lib/profile";
import { mergeSettlementIntoProfile } from "@/lib/settlement-to-profile";
import type { Settlement, UserProfile } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SettlementDetailActions({ settlement: s }: { settlement: Settlement }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadProfile() ?? defaultProfile());
      setReady(true);
    });
  }, []);

  const saved = (profile.saved_settlement_ids ?? []).includes(s.id);

  function persist(update: ProfileUpdater, msg?: string) {
    setProfile((prev) => {
      const next = applyProfileUpdate(prev, update);
      saveProfile(next);
      return next;
    });
    setFlash(msg ?? "Saved to this browser.");
    window.setTimeout(() => setFlash(null), 2400);
  }

  function toggleSaved() {
    const wasSaved = (profile.saved_settlement_ids ?? []).includes(s.id);
    persist((prev) => {
      const cur = new Set(prev.saved_settlement_ids ?? []);
      if (cur.has(s.id)) cur.delete(s.id);
      else cur.add(s.id);
      return { ...prev, saved_settlement_ids: [...cur] };
    }, wasSaved ? "Removed from saved." : undefined);
  }

  function addTerms() {
    persist((prev) => mergeSettlementIntoProfile(prev, s), "Match terms merged into your profile.");
  }

  if (!ready) return null;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Save for later</span> bookmarks this case on
        this device. You can also{" "}
        <button
          type="button"
          onClick={addTerms}
          className="cursor-pointer font-medium text-zinc-600 underline decoration-zinc-400/80 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          add match terms to your profile
        </button>{" "}
        so similar cases can surface under Matches.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleSaved}
          className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            saved
              ? "border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/30"
              : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          {saved ? "Remove from saved" : "Save for later"}
        </button>
        <Link href="/profile" className="text-sm font-medium text-teal-700 underline dark:text-teal-400">
          Edit profile
        </Link>
        <Link href="/saved" className="text-sm font-medium text-teal-700 underline dark:text-teal-400">
          View saved
        </Link>
      </div>
      {flash && (
        <p className="text-xs font-medium text-teal-800 dark:text-teal-300" role="status">
          {flash}
        </p>
      )}
    </div>
  );
}
