import type { UserProfile } from "./types";

const STORAGE_KEY = "settlementscan_profile_v1";

export function defaultProfile(): UserProfile {
  return {
    state: "",
    emails: [],
    services: [],
    companies_purchased_from: [],
    subscriptions: [],
    financial_institutions: [],
    employers: [],
    retail_and_brands: [],
    products: [],
    vehicles: [],
    breach_names: [],
    qualifying_answers: {},
    dismissed_settlements: [],
    filed_settlements: [],
    created_at: new Date().toISOString(),
  };
}

/** Merge legacy `services` / `companies_purchased_from` into split fields once. */
function normalizeProfile(p: UserProfile): UserProfile {
  const employers = p.employers ?? [];
  const financial_institutions = p.financial_institutions ?? [];
  const subscriptions = p.subscriptions ?? [];
  let retail = p.retail_and_brands ?? [];
  const legacyS = p.services ?? [];
  const legacyC = p.companies_purchased_from ?? [];

  const hasNew =
    employers.length +
      financial_institutions.length +
      subscriptions.length +
      retail.length >
    0;

  if (!hasNew && (legacyS.length > 0 || legacyC.length > 0)) {
    retail = [...legacyS, ...legacyC];
    return {
      ...p,
      employers: [],
      financial_institutions: [],
      subscriptions: [],
      retail_and_brands: retail,
      services: [],
      companies_purchased_from: [],
    };
  }

  return {
    ...p,
    employers,
    financial_institutions,
    subscriptions,
    retail_and_brands: retail,
    services: p.services ?? [],
    companies_purchased_from: p.companies_purchased_from ?? [],
  };
}

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || typeof parsed !== "object") return null;
    const merged = {
      ...defaultProfile(),
      ...parsed,
      qualifying_answers: parsed.qualifying_answers ?? {},
      dismissed_settlements: parsed.dismissed_settlements ?? [],
      filed_settlements: parsed.filed_settlements ?? [],
    };
    return normalizeProfile(merged);
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportProfileJson(profile: UserProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function importProfileJson(json: string): UserProfile {
  const parsed = JSON.parse(json) as UserProfile;
  const merged = {
    ...defaultProfile(),
    ...parsed,
    qualifying_answers: parsed.qualifying_answers ?? {},
    dismissed_settlements: parsed.dismissed_settlements ?? [],
    filed_settlements: parsed.filed_settlements ?? [],
  };
  return normalizeProfile(merged);
}

export function hasMinimumProfile(profile: UserProfile): boolean {
  return Boolean(profile.state?.trim());
}
