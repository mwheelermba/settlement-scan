"use client";

import { trackEvent } from "@/lib/analytics";
import { defaultProfile, loadProfile, saveProfile } from "@/lib/profile";
import type { Settlement, UserProfile } from "@/lib/types";
import { useEffect, useState } from "react";

/** Open claim site + Mark as filed — mirrors the card “Show details” layout. */
export function SettlementDetailClaimActions({ settlement: s }: { settlement: Settlement }) {
  const [profile, setProfile] = useState<UserProfile>(() => defaultProfile());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(loadProfile() ?? defaultProfile());
      setReady(true);
    });
  }, []);

  const filed = profile.filed_settlements.includes(s.id);

  function toggleFiled() {
    const next = filed
      ? { ...profile, filed_settlements: profile.filed_settlements.filter((id) => id !== s.id) }
      : { ...profile, filed_settlements: [...profile.filed_settlements, s.id] };
    setProfile(next);
    saveProfile(next);
  }

  if (!ready) {
    return (
      <div className="space-y-2">
        <div className="h-11 max-w-md animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <a
        href={s.claim_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void trackEvent({ type: "claim_click", settlementId: s.id })}
        className="inline-flex w-full max-w-md cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
      >
        Open claim site
      </a>
      <div>
        <button
          type="button"
          onClick={toggleFiled}
          title={filed ? "Remove from your filed list" : "Remember that you submitted a claim (this device only)"}
          className={`cursor-pointer text-left text-sm font-medium hover:underline ${
            filed
              ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          {filed ? "Unmark as filed" : "Mark as filed"}
        </button>
      </div>
    </div>
  );
}
