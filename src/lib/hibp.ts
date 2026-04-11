"use client";

/**
 * Looks up breaches for an email via `/api/hibp` (server uses HIBP API key).
 * The email is sent over HTTPS to your route only; do not log it server-side.
 */
export async function lookupBreachesForEmail(
  email: string
): Promise<{ breachNames: string[]; disabled?: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { breachNames: [] };

  const res = await fetch("/api/hibp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalized }),
  });

  if (res.status === 503) {
    const j = (await res.json()) as { disabled?: boolean };
    return { breachNames: [], disabled: j.disabled ?? true };
  }

  if (!res.ok) {
    const text = await res.text();
    return { breachNames: [], error: text || `HTTP ${res.status}` };
  }

  const data = (await res.json()) as { breachNames?: string[] };
  return { breachNames: data.breachNames ?? [] };
}
