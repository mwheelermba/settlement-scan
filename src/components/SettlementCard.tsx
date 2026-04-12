"use client";

import type { MatchDimensionOutcome, MatchResult, UserProfile } from "@/lib/types";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { mergeSettlementIntoProfile } from "@/lib/settlement-to-profile";
import { DeadlineBadge } from "./DeadlineBadge";
import { MatchScoreRing } from "./MatchScoreRing";
import { ProofBadge } from "./ProofBadge";
import { QualifyingQuestions } from "./QualifyingQuestions";
import { useEffect, useState } from "react";

function OutcomePill({ outcome }: { outcome: MatchDimensionOutcome }) {
  const label =
    outcome === "match"
      ? "Strong"
      : outcome === "weak"
        ? "Partial"
        : outcome === "unknown"
          ? "Unknown"
          : "No match";
  const cls =
    outcome === "match"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
      : outcome === "weak"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
        : outcome === "unknown"
          ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
          : "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
  );
}

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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [termsAddedFlash, setTermsAddedFlash] = useState(false);
  const filed = profile.filed_settlements.includes(s.id);
  const saved = (profile.saved_settlement_ids ?? []).includes(s.id);
  const detailHref = linkFrom ? `/s/${s.id}?from=${linkFrom}` : `/s/${s.id}`;

  useEffect(() => {
    if (!termsAddedFlash) return;
    const id = window.setTimeout(() => setTermsAddedFlash(false), 2800);
    return () => window.clearTimeout(id);
  }, [termsAddedFlash]);

  function toggleFiled() {
    if (filed) {
      onProfileChange({
        ...profile,
        filed_settlements: profile.filed_settlements.filter((id) => id !== s.id),
      });
    } else {
      onProfileChange({
        ...profile,
        filed_settlements: [...profile.filed_settlements, s.id],
      });
    }
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
    setTermsAddedFlash(true);
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <MatchScoreRing score={score} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 max-w-full flex-1">
              <h2 className="text-lg font-semibold leading-snug text-zinc-900 [overflow-wrap:anywhere] dark:text-zinc-50">
                <Link href={detailHref} className="hover:underline">
                  {s.title}
                </Link>
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.defendant}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <DeadlineBadge deadline={s.deadline} />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.estimated_payout}</p>
              <ProofBadge proofRequired={s.proof_required} />
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {s.type.replace("_", " ")}
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {result.matchCount} strong
            {result.weakMatchCount > 0 ? ` · ${result.weakMatchCount} partial (e.g. nationwide)` : ""} ·{" "}
            {result.needsInputCount} unknown · {result.mismatchCount} mismatches (of {result.evaluableCount} dimensions)
          </p>
          <div
            className={`rounded-lg border border-zinc-100 dark:border-zinc-800 ${
              breakdownOpen ? "bg-zinc-100/90 dark:bg-zinc-900/60" : "bg-zinc-50/60 dark:bg-zinc-900/30"
            }`}
          >
            <button
              type="button"
              aria-expanded={breakdownOpen}
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            >
              <span>Match criteria</span>
              <span className="text-zinc-400">{breakdownOpen ? "−" : "+"}</span>
            </button>
            {breakdownOpen && (
              <ul className="space-y-2 border-t border-zinc-200/80 px-3 pb-3 pt-2 dark:border-zinc-700/80">
                {result.breakdown.map((row) => (
                  <li key={row.key} className="text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{row.label}</span>
                      <OutcomePill outcome={row.outcome} />
                    </div>
                    <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">Settlement data: {row.settlementSide}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="cursor-pointer text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  {open ? "Hide details" : "Show details"}
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={toggleSaved}
                  className={`cursor-pointer text-sm font-medium hover:underline ${
                    saved
                      ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {saved ? "Remove from saved" : "Save for later"}
                </button>
                <span className="text-zinc-300 dark:text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={addTermsToProfile}
                  className="cursor-pointer text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Add match terms to profile
                </button>
              </div>
              {linkFrom === "matches" && (
                <button
                  type="button"
                  onClick={dismiss}
                  title="Hide from Your matches. You can still open it from Browse."
                  className="cursor-pointer self-start text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:underline sm:self-auto dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Remove from matches
                </button>
              )}
            </div>
            <p
              className={`text-xs font-medium text-emerald-700 transition-opacity duration-200 dark:text-emerald-400 ${
                termsAddedFlash ? "opacity-100" : "opacity-0"
              }`}
              aria-live="polite"
            >
              Match terms merged into your profile — open Your profile to review or edit.
            </p>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-zinc-200/90 bg-zinc-50/95 p-4 dark:border-zinc-700/90 dark:bg-zinc-900/55">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{s.description}</p>
            <QualifyingQuestions
              settlementId={s.id}
              questions={s.criteria.qualifying_questions}
              profile={profile}
              onChange={onProfileChange}
            />

            {/* Primary CTA */}
            <a
              href={s.claim_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void trackEvent({ type: "claim_click", settlementId: s.id })}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 sm:w-auto sm:min-w-[200px]"
            >
              File claim
            </a>

            {/* Secondary actions row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={toggleFiled}
                title={filed ? "Remove this reminder" : "Remember that you submitted a claim"}
                className={`cursor-pointer text-xs font-medium hover:underline ${
                  filed
                    ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {filed ? "Unmark as filed" : "Mark as filed"}
              </button>
              {linkFrom !== "matches" && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
                >
                  Dismiss
                </button>
              )}
            </div>

            {/* Share row — visually separated */}
            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-700/80">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Share this page</span>
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${s.id}` : `/s/${s.id}`;
                  void navigator.clipboard.writeText(url);
                  void trackEvent({ type: "share", settlementId: s.id });
                }}
                className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  void trackEvent({ type: "share", settlementId: s.id });
                  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${s.id}` : `/s/${s.id}`;
                  if (navigator.share) {
                    void navigator.share({ title: s.title, text: s.title, url });
                  } else {
                    void navigator.clipboard.writeText(url);
                  }
                }}
                className="cursor-pointer rounded-md border border-teal-300/80 bg-teal-50/80 px-2 py-0.5 text-[11px] font-medium text-teal-800 hover:bg-teal-100 dark:border-teal-800/80 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
