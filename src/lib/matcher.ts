import { matchesLoose } from "@/lib/string-match";
import type {
  MatchDimensionRow,
  MatchResult,
  Settlement,
  UserProfile,
} from "./types";

/**
 * Per-dimension outcome. `weak` is used for nationwide (no state filter) when the
 * user has a state — geographic eligibility is assumed but not a strong signal.
 */
type FieldOutcome = "match" | "weak" | "unknown" | "mismatch";

/** Minimum match % to show on the home "Your matches" list (browse shows all). */
export const MIN_HOME_MATCH_SCORE = 40;

function _shortenDetail(s: string, max = 96): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Terms used to match settlement `criteria.services` (brands often land in products or retail too). */
function servicePool(profile: UserProfile): string[] {
  return [
    ...(profile.subscriptions ?? []),
    ...(profile.financial_institutions ?? []),
    ...(profile.employers ?? []),
    ...(profile.retail_and_brands ?? []),
    ...(profile.medical_and_health ?? []),
    ...(profile.services ?? []),
    ...(profile.companies_purchased_from ?? []),
    ...profile.products,
  ];
}

/** Terms used to match settlement `criteria.products` (not only the Products textarea). */
function productMatchPool(profile: UserProfile): string[] {
  return [
    ...profile.products,
    ...(profile.retail_and_brands ?? []),
    ...(profile.subscriptions ?? []),
    ...(profile.medical_and_health ?? []),
    ...(profile.services ?? []),
    ...(profile.companies_purchased_from ?? []),
  ];
}

function hasOverlap(
  profileVals: string[],
  criteriaVals: string[] | null
): FieldOutcome {
  if (criteriaVals === null || criteriaVals.length === 0) return "unknown";
  if (profileVals.length === 0) return "unknown";
  const overlap = criteriaVals.some((c) => profileVals.some((p) => matchesLoose(p, c)));
  return overlap ? "match" : "mismatch";
}

function matchStates(profileState: string, criteriaStates: string[] | null): FieldOutcome {
  if (criteriaStates === null || criteriaStates.length === 0) {
    if (!profileState?.trim()) return "unknown";
    return "weak";
  }
  if (!profileState?.trim()) return "unknown";
  return criteriaStates.includes(profileState.toUpperCase()) ? "match" : "mismatch";
}

function matchBreach(
  profileBreaches: string[],
  criteriaBreach: string | null
): FieldOutcome {
  if (criteriaBreach === null) return "unknown";
  if (profileBreaches.length === 0) return "unknown";
  return profileBreaches.some((p) => matchesLoose(p, criteriaBreach)) ? "match" : "mismatch";
}

function vehicleMatches(
  profile: UserProfile,
  criteria: Settlement["criteria"]
): FieldOutcome {
  const cv = criteria.vehicles;
  if (cv === null || cv.length === 0) return "unknown";
  if (profile.vehicles.length === 0) return "unknown";
  for (const req of cv) {
    const hit = profile.vehicles.some((pv) => {
      if (norm(pv.make) !== norm(req.make)) return false;
      if (norm(pv.model) !== norm(req.model)) return false;
      const y = pv.year;
      if (req.yearMin !== undefined && y < req.yearMin) return false;
      if (req.yearMax !== undefined && y > req.yearMax) return false;
      return true;
    });
    if (hit) return "match";
  }
  return "mismatch";
}

function collectBreakdownRows(
  settlement: Settlement,
  profile: UserProfile
): MatchDimensionRow[] {
  const c = settlement.criteria;

  const stateOutcome = matchStates(profile.state, c.states);
  const stateSide = !c.states?.length
    ? "Nationwide"
    : _shortenDetail(c.states.join(", "));

  const svcOutcome = hasOverlap(servicePool(profile), c.services);
  const svcSide = !c.services?.length ? "Not specified" : _shortenDetail(c.services.join(", "));

  const prodOutcome = hasOverlap(productMatchPool(profile), c.products);
  const prodSide = !c.products?.length ? "Not specified" : _shortenDetail(c.products.join(", "));

  const vehOutcome = vehicleMatches(profile, c);
  let vehSide = "Not specified";
  if (c.vehicles?.length) {
    vehSide = _shortenDetail(
      c.vehicles
        .map((v) => {
          const yr =
            v.yearMin !== undefined && v.yearMax !== undefined
              ? `${v.yearMin}–${v.yearMax}`
              : "";
          return [v.make, v.model, yr].filter(Boolean).join(" ");
        })
        .join("; ")
    );
  }

  const breachOutcome = matchBreach(profile.breach_names, c.breach_name);
  const breachSide = c.breach_name ? _shortenDetail(c.breach_name) : "Not specified";

  return [
    { key: "state", label: "State", outcome: stateOutcome, settlementSide: stateSide },
    {
      key: "services",
      label: "Services & brands",
      outcome: svcOutcome,
      settlementSide: svcSide,
    },
    { key: "products", label: "Products", outcome: prodOutcome, settlementSide: prodSide },
    { key: "vehicles", label: "Vehicles", outcome: vehOutcome, settlementSide: vehSide },
    { key: "breach", label: "Data breach", outcome: breachOutcome, settlementSide: breachSide },
  ];
}

function scoreFromOutcomes(outcomes: FieldOutcome[]): {
  score: number;
  matchCount: number;
  weakMatchCount: number;
  evaluableCount: number;
  needsInputCount: number;
  mismatchCount: number;
} {
  const W = { match: 1, weak: 0.28, unknown: 0.32, mismatch: 0 } as const;

  let matchCount = 0;
  let weakMatchCount = 0;
  let needsInputCount = 0;
  let mismatchCount = 0;
  let weighted = 0;
  let totalWeight = 0;

  for (const o of outcomes) {
    totalWeight += 1;
    if (o === "match") {
      matchCount += 1;
      weighted += W.match;
    } else if (o === "weak") {
      weakMatchCount += 1;
      weighted += W.weak;
    } else if (o === "unknown") {
      needsInputCount += 1;
      weighted += W.unknown;
    } else {
      mismatchCount += 1;
      weighted += W.mismatch;
    }
  }

  const evaluableCount = outcomes.length;
  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;

  return { score, matchCount, weakMatchCount, evaluableCount, needsInputCount, mismatchCount };
}

function applyQualifyingQuestions(
  settlement: Settlement,
  profile: UserProfile,
  base: ReturnType<typeof scoreFromOutcomes>
): number {
  const qs = settlement.criteria.qualifying_questions;
  if (!qs.length) return base.score;

  let adj = 0;
  let required = 0;
  for (const q of qs) {
    if (!q.required) continue;
    required += 1;
    const ans = profile.qualifying_answers[q.id];
    if (ans === true) adj += 1;
    else if (ans === false) adj -= 0.5;
  }
  if (required === 0) return base.score;
  const bump = (adj / required) * 15;
  return Math.max(0, Math.min(100, Math.round(base.score + bump)));
}

export function matchSettlement(
  settlement: Settlement,
  profile: UserProfile
): MatchResult {
  const breakdown = collectBreakdownRows(settlement, profile);
  const outcomes = breakdown.map((b) => b.outcome) as FieldOutcome[];
  const base = scoreFromOutcomes(outcomes);
  const score = applyQualifyingQuestions(settlement, profile, base);
  return {
    settlement,
    score,
    matchCount: base.matchCount,
    weakMatchCount: base.weakMatchCount,
    evaluableCount: base.evaluableCount,
    needsInputCount: base.needsInputCount,
    mismatchCount: base.mismatchCount,
    breakdown,
  };
}

export function rankMatches(
  settlements: Settlement[],
  profile: UserProfile
): MatchResult[] {
  const withScores = settlements.map((s) => matchSettlement(s, profile));
  return withScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.settlement.deadline ?? "9999";
    const db = b.settlement.deadline ?? "9999";
    return da.localeCompare(db);
  });
}

export function deadlineUrgency(
  deadline: string | null
): "none" | "green" | "yellow" | "red" {
  if (!deadline) return "none";
  const d = new Date(deadline + "T12:00:00Z");
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "none";
  if (diff < 7) return "red";
  if (diff < 30) return "yellow";
  return "green";
}
