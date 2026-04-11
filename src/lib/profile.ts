import type { UserProfile } from "./types";

const STORAGE_KEY = "settlementscan_profile_v1";

function defaultProfile(): UserProfile {
  return {
    state: "",
    emails: [],
    services: [],
    products: [],
    vehicles: [],
    companies_purchased_from: [],
    breach_names: [],
    qualifying_answers: {},
    dismissed_settlements: [],
    filed_settlements: [],
    created_at: new Date().toISOString(),
  };
}

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...defaultProfile(),
      ...parsed,
      qualifying_answers: parsed.qualifying_answers ?? {},
      dismissed_settlements: parsed.dismissed_settlements ?? [],
      filed_settlements: parsed.filed_settlements ?? [],
    };
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
  return {
    ...defaultProfile(),
    ...parsed,
    qualifying_answers: parsed.qualifying_answers ?? {},
    dismissed_settlements: parsed.dismissed_settlements ?? [],
    filed_settlements: parsed.filed_settlements ?? [],
  };
}

export function hasMinimumProfile(profile: UserProfile): boolean {
  return Boolean(profile.state?.trim());
}
