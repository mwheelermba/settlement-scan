import type { Settlement, SettlementType } from "./types";
import settlementsJson from "../../data/settlements.json";

const settlements = settlementsJson as Settlement[];

export function getSettlements(): Settlement[] {
  return settlements;
}

export function getActiveSettlements(): Settlement[] {
  return settlements.filter((s) => s.active);
}

export function getSettlementById(id: string): Settlement | undefined {
  return settlements.find((s) => s.id === id);
}

export function getSettlementIds(): string[] {
  return settlements.map((s) => s.id);
}

export type BrowseFilters = {
  types?: SettlementType[];
  state?: string;
  proofRequired?: boolean | null;
  deadlineAfter?: string;
  deadlineBefore?: string;
  noProofOnly?: boolean;
};

export function filterSettlements(
  list: Settlement[],
  filters: BrowseFilters
): Settlement[] {
  return list.filter((s) => {
    if (filters.types?.length && !filters.types.includes(s.type)) {
      return false;
    }
    if (filters.state) {
      const st = s.criteria.states;
      if (st !== null && st.length > 0 && !st.includes(filters.state)) {
        return false;
      }
    }
    if (filters.proofRequired !== undefined && filters.proofRequired !== null) {
      if (s.proof_required !== filters.proofRequired) return false;
    }
    if (filters.noProofOnly && s.proof_required === true) return false;
    if (filters.deadlineAfter && s.deadline && s.deadline < filters.deadlineAfter) {
      return false;
    }
    if (filters.deadlineBefore && s.deadline && s.deadline > filters.deadlineBefore) {
      return false;
    }
    return true;
  });
}

export function searchSettlements(list: Settlement[], query: string): Settlement[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((s) => {
    const blob = `${s.title} ${s.defendant} ${s.description}`.toLowerCase();
    return blob.includes(q);
  });
}

export type SortKey =
  | "deadline"
  | "payout"
  | "newest"
  | "match"
  | "title";

export function sortSettlements(
  list: Settlement[],
  sort: SortKey,
  matchScore?: Map<string, number>
): Settlement[] {
  const out = [...list];
  const parseMoney = (s: string): number => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  switch (sort) {
    case "deadline":
      return out.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    case "payout":
      return out.sort(
        (a, b) => parseMoney(b.estimated_payout) - parseMoney(a.estimated_payout)
      );
    case "newest":
      return out.sort((a, b) => b.last_verified.localeCompare(a.last_verified));
    case "match":
      if (!matchScore) return out;
      return out.sort((a, b) => {
        const sa = matchScore.get(a.id) ?? 0;
        const sb = matchScore.get(b.id) ?? 0;
        if (sb !== sa) return sb - sa;
        if (!a.deadline || !b.deadline) return 0;
        return a.deadline.localeCompare(b.deadline);
      });
    case "title":
    default:
      return out.sort((a, b) => a.title.localeCompare(b.title));
  }
}
