import type { MatchResult, Settlement, UserProfile } from "./types";

type FieldOutcome = "match" | "unknown" | "mismatch";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function hasOverlap(
  profileVals: string[],
  criteriaVals: string[] | null
): FieldOutcome {
  if (criteriaVals === null || criteriaVals.length === 0) return "match";
  if (profileVals.length === 0) return "unknown";
  const p = new Set(profileVals.map(norm));
  const overlap = criteriaVals.some((c) => p.has(norm(c)));
  return overlap ? "match" : "mismatch";
}

function matchStates(profileState: string, criteriaStates: string[] | null): FieldOutcome {
  if (criteriaStates === null || criteriaStates.length === 0) return "match";
  if (!profileState?.trim()) return "unknown";
  return criteriaStates.includes(profileState.toUpperCase()) ? "match" : "mismatch";
}

function matchBreach(
  profileBreaches: string[],
  criteriaBreach: string | null
): FieldOutcome {
  if (criteriaBreach === null) return "match";
  if (profileBreaches.length === 0) return "unknown";
  const p = new Set(profileBreaches.map(norm));
  return p.has(norm(criteriaBreach)) ? "match" : "mismatch";
}

function vehicleMatches(
  profile: UserProfile,
  criteria: Settlement["criteria"]
): FieldOutcome {
  const cv = criteria.vehicles;
  if (cv === null || cv.length === 0) return "match";
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

function collectOutcomes(
  settlement: Settlement,
  profile: UserProfile
): FieldOutcome[] {
  const c = settlement.criteria;
  const outcomes: FieldOutcome[] = [];

  outcomes.push(matchStates(profile.state, c.states));

  const servicePool = [...profile.services, ...profile.companies_purchased_from];
  outcomes.push(hasOverlap(servicePool, c.services));

  outcomes.push(hasOverlap(profile.products, c.products));

  outcomes.push(vehicleMatches(profile, c));

  outcomes.push(matchBreach(profile.breach_names, c.breach_name));

  return outcomes;
}

function scoreFromOutcomes(outcomes: FieldOutcome[]): {
  score: number;
  matchCount: number;
  evaluableCount: number;
  needsInputCount: number;
  mismatchCount: number;
} {
  let matchCount = 0;
  let needsInputCount = 0;
  let mismatchCount = 0;
  let weighted = 0;
  let totalWeight = 0;

  for (const o of outcomes) {
    totalWeight += 1;
    if (o === "match") {
      matchCount += 1;
      weighted += 1;
    } else if (o === "unknown") {
      needsInputCount += 1;
      weighted += 0.5;
    } else {
      mismatchCount += 1;
      weighted += 0;
    }
  }

  const evaluableCount = outcomes.length;
  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;

  return { score, matchCount, evaluableCount, needsInputCount, mismatchCount };
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
  const outcomes = collectOutcomes(settlement, profile);
  const base = scoreFromOutcomes(outcomes);
  const score = applyQualifyingQuestions(settlement, profile, base);
  return {
    settlement,
    score,
    matchCount: base.matchCount,
    evaluableCount: base.evaluableCount,
    needsInputCount: base.needsInputCount,
    mismatchCount: base.mismatchCount,
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
