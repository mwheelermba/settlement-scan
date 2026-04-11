"use client";

export type AnalyticsEvent =
  | { type: "claim_click"; settlementId: string }
  | { type: "share"; settlementId: string };

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
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
