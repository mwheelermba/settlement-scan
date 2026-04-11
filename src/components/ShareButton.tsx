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

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Copy link
      </button>
      <button
        type="button"
        onClick={() => void share()}
        className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
      >
        Share
      </button>
    </div>
  );
}
