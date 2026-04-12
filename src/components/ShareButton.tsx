"use client";

import { trackEvent } from "@/lib/analytics";

export function ShareButton({
  settlementId,
  title,
}: {
  settlementId: string;
  title: string;
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
        className={`${btnBase} border-2 border-amber-500/90 bg-transparent text-amber-800 hover:bg-amber-50 dark:border-amber-400/80 dark:text-amber-200 dark:hover:bg-amber-950/40`}
      >
        Share
      </button>
    </div>
  );
}
