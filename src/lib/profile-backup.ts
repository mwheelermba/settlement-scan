import type { UserProfile } from "./types";
import { hasMinimumProfile } from "./profile";

const LAST_BACKUP_FP_KEY = "settlementscan_last_backup_fp";

/** Stable enough fingerprint for “has this profile been backed up since last edit”. */
export function profileFingerprint(profile: UserProfile): string {
  return JSON.stringify(profile);
}

export function getLastBackupFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_BACKUP_FP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackupFingerprint(fp: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_BACKUP_FP_KEY, fp);
  } catch {
    /* ignore */
  }
}

/** Call after a successful file backup (download or File System Access write). */
export function markBackupComplete(profile: UserProfile): void {
  setLastBackupFingerprint(profileFingerprint(profile));
}

export function isProfileNonEmpty(p: UserProfile): boolean {
  if (hasMinimumProfile(p)) return true;
  if (p.name?.trim()) return true;
  if (p.zip?.trim()) return true;
  if ((p.emails?.length ?? 0) > 0) return true;
  const arrays = [
    p.subscriptions,
    p.financial_institutions,
    p.employers,
    p.retail_and_brands,
    p.medical_and_health,
    p.products,
    p.breach_names,
    p.services,
    p.companies_purchased_from,
  ];
  for (const arr of arrays) {
    if ((arr?.length ?? 0) > 0) return true;
  }
  if ((p.vehicles?.length ?? 0) > 0) return true;
  if (Object.keys(p.qualifying_answers ?? {}).length > 0) return true;
  if ((p.filed_settlements?.length ?? 0) > 0) return true;
  if ((p.saved_settlement_ids?.length ?? 0) > 0) return true;
  if ((p.dismissed_settlements?.length ?? 0) > 0) return true;
  return false;
}

export function needsBackup(profile: UserProfile | null): boolean {
  if (!profile || !isProfileNonEmpty(profile)) return false;
  const cur = profileFingerprint(profile);
  const last = getLastBackupFingerprint();
  if (last == null) return true;
  return cur !== last;
}
