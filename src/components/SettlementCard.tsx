"use client";

import type { MatchResult } from "@/lib/types";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { mergeSettlementIntoProfile } from "@/lib/settlement-to-profile";
import { DeadlineBadge } from "./DeadlineBadge";
import { MatchScoreRing } from "./MatchScoreRing";
import { ProofBadge } from "./ProofBadge";
import { QualifyingQuestions } from "./QualifyingQuestions";
import { ShareButton } from "./ShareButton";
import { useState } from "react";

export function SettlementCard({
  result,
  profile,
  onProfileChange,
  linkFrom,
}: {
  result: MatchResult;
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  linkFrom?: "matches" | "browse";
}) {
  const { settlement: s, score } = result;
  const [open, setOpen] = useState(false);
  const filed = profile.filed_settlements.includes(s.id);
  const saved = (profile.saved_settlement_ids ?? []).includes(s.id);
  const detailHref = linkFrom ? `/s/${s.id}?from=${linkFrom}` : `/s/${s.id}`;

  function markFiled() {
    if (filed) return;
    onProfileChange({
      ...profile,
      filed_settlements: [...profile.filed_settlements, s.id],
    });
  }

  function dismiss() {
    onProfileChange({
      ...profile,
      dismissed_settlements: [...new Set([...profile.dismissed_settlements, s.id])],
    });
  }

  function toggleSaved() {
    const cur = new Set(profile.saved_settlement_ids ?? []);
    if (cur.has(s.id)) cur.delete(s.id);
    else cur.add(s.id);
    onProfileChange({ ...profile, saved_settlement_ids: [...cur] });
  }

  function addTermsToProfile() {
    onProfileChange(mergeSettlementIntoProfile(profile, s));
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <MatchScoreRing score={score} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                <Link href={detailHref} className="hover:underline">
                  {s.title}
                </Link>
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.defendant}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DeadlineBadge deadline={s.deadline} />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.estimated_payout}</p>
              <ProofBadge proofRequired={s.proof_required} />
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {s.type.replace("_", " ")}
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {result.matchCount} of {result.evaluableCount} criteria matched · {result.needsInputCount} need your input
            · {result.mismatchCount} mismatches
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              {open ? "Hide details" : "Show details"}
            </button>
            <span className="text-zinc-300 dark:text-zinc-600">|</span>
            <button
              type="button"
              onClick={toggleSaved}
              className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              {saved ? "Saved for later" : "Save for later"}
            </button>
            <button
              type="button"
              onClick={addTermsToProfile}
              className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              Add match terms to profile
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{s.description}</p>
          <QualifyingQuestions
            settlementId={s.id}
            questions={s.criteria.qualifying_questions}
            profile={profile}
            onChange={onProfileChange}
          />
          <div className="flex flex-wrap gap-3">
            <a
              href={s.claim_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void trackEvent({ type: "claim_click", settlementId: s.id })}
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              File claim
            </a>
            <button
              type="button"
              onClick={markFiled}
              disabled={filed}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
            >
              {filed ? "Marked filed" : "Mark as filed"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Dismiss
            </button>
          </div>
          <ShareButton settlementId={s.id} title={s.title} />
        </div>
      )}
    </article>
  );
}
