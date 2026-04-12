"use client";

import { bumpLocalClaimClick, bumpLocalShare } from "@/lib/local-metrics";

export type AnalyticsEvent =
  | { type: "claim_click"; settlementId: string }
  | { type: "share"; settlementId: string }
  | { type: "profile_build" }
  | { type: "visitor_session" };

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  if (event.type === "claim_click") bumpLocalClaimClick();
  if (event.type === "share") bumpLocalShare();
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    /* non-blocking */
  }
}
