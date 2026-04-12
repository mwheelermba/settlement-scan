"use client";

import { trackEvent } from "@/lib/analytics";

export function ShareButton({
  settlementId,
  title,
  variant = "default",
}: {
  settlementId: string;
  title: string;
  /** `compact` — small inline actions for secondary placement (e.g. under primary CTAs). */
  variant?: "default" | "compact";
}) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${settlementId}`
      : `/s/${settlementId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      void trackEvent({ type: "share", settlementId });
    } catch {
      /* ignore */
    }
  }

  async function share() {
    void trackEvent({ type: "share", settlementId });
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch {
        /* fallback */
      }
    }
    await copy();
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-700/80">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Share this page</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Share
        </button>
      </div>
    );
  }

  const btnBase =
    "inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => void copy()}
        className={`${btnBase} border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`}
      >
        Copy link
      </button>
      <button
        type="button"
        onClick={() => void share()}
        className={`${btnBase} border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`}
      >
        Share
      </button>
    </div>
  );
}
