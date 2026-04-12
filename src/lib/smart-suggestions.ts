import type { Settlement } from "./types";
import { isClaimDeadlineOpen } from "./settlements";

export type ProfileQuickCategory =
  | "subscriptions"
  | "financial"
  | "employers"
  | "retail"
  | "medical"
  | "products"
  | "breach";

function uniquePush(out: string[], seen: Set<string>, t: string) {
  const k = t.trim();
  if (k.length < 2) return;
  const low = k.toLowerCase();
  if (seen.has(low)) return;
  seen.add(low);
  out.push(k);
}

function collectFromSettlement(s: Settlement, out: string[], seen: Set<string>) {
  const c = s.criteria;
  for (const x of c.services ?? []) uniquePush(out, seen, x);
  for (const x of c.products ?? []) uniquePush(out, seen, x);
  if (c.breach_name) uniquePush(out, seen, c.breach_name);
  const def = s.defendant.replace(/,?\s*(Inc\.?|LLC|Corp\.?|Ltd\.?|LP\.?|Co\.|PLC)$/i, "").trim();
  if (def.length > 1 && def.length < 72) uniquePush(out, seen, def);
}

function matchesCategory(s: Settlement, cat: ProfileQuickCategory): boolean {
  const blob = `${s.title} ${s.defendant}`.toLowerCase();
  switch (cat) {
    case "financial":
      return (
        s.type === "financial" ||
        /plaid|visa|mastercard|affirm|paypal|coinbase|fintech|credit|bank|crypto|interchange|fee/i.test(blob)
      );
    case "subscriptions":
      return (
        s.type === "consumer" &&
        (Boolean(s.criteria.date_range) ||
          /subscription|streaming|play store|app store|netflix|spotify|hulu|prime/i.test(blob))
      );
    case "employers":
      return s.type === "employment" || /gig|driver|delivery|employee|wage/i.test(blob);
    case "medical":
      return s.type === "health" || /health|hipaa|medical|pharma|hospital|mychart|fitness|biometric/i.test(blob);
    case "breach":
      return s.type === "data_breach" || Boolean(s.criteria.breach_name);
    case "products":
      return Boolean(s.criteria.products?.length);
    case "retail":
      return (
        s.type === "consumer" ||
        s.type === "data_breach" ||
        (s.type !== "financial" && s.type !== "employment" && /ebay|airbnb|instagram|tinder|bumble|yahoo|meta|google|apple/i.test(blob))
      );
    default:
      return false;
  }
}

/**
 * Terms from settlements (open first, then closed) merged with static fallbacks — for profile quick-add row.
 */
export function getSmartQuickAddTerms(
  cat: ProfileQuickCategory,
  settlements: Settlement[],
  staticFallback: string[],
  opts?: { limit?: number }
): string[] {
  const limit = opts?.limit ?? 8;
  const active = settlements.filter((s) => s.active);
  const open = active.filter((s) => isClaimDeadlineOpen(s));
  const closed = active.filter((s) => !isClaimDeadlineOpen(s));

  const seen = new Set<string>();
  const out: string[] = [];

  const drain = (list: Settlement[]) => {
    for (const s of list) {
      if (!matchesCategory(s, cat)) continue;
      collectFromSettlement(s, out, seen);
      if (out.length >= limit * 3) return;
    }
  };

  drain(open);
  drain(closed);

  for (const t of staticFallback) uniquePush(out, seen, t);

  return out.slice(0, limit);
}
