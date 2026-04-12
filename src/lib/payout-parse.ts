/**
 * Best-effort parse of `estimated_payout` strings for sorting (not legal/financial truth).
 * Handles $5.85, $117.5M, ranges (uses largest number), "Varies" → 0.
 */
export function parseEstimatedPayoutUsd(raw: string | undefined | null): number {
  if (raw == null || typeof raw !== "string") return 0;
  const s = raw.trim().toLowerCase();
  if (!s || /^(varies|n\/a|tbd|unknown|—|--)$/.test(s)) return 0;

  let best = 0;

  const withSuffix = s.match(/\$?\s*([\d,.]+)\s*([kmb])\b/gi);
  if (withSuffix) {
    for (const chunk of withSuffix) {
      const m = chunk.match(/\$?\s*([\d,.]+)\s*([kmb])\b/i);
      if (!m) continue;
      let n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isFinite(n)) continue;
      const suf = m[2].toLowerCase();
      if (suf === "k") n *= 1e3;
      else if (suf === "m") n *= 1e6;
      else if (suf === "b") n *= 1e9;
      if (n > best) best = n;
    }
  }

  const millionWord = s.match(/([\d,.]+)\s*million/i);
  if (millionWord) {
    const n = parseFloat(millionWord[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n * 1e6 > best) best = n * 1e6;
  }

  const plainDollars = [...s.matchAll(/\$\s*([\d,.]+)(?!\s*[kmb])\b/gi)];
  for (const m of plainDollars) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > best) best = n;
  }

  return best;
}
