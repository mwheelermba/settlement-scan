"use client";

import { loadProfile } from "@/lib/profile";
import {
  markBackupComplete as persistBackupFingerprint,
  needsBackup as computeNeedsBackup,
} from "@/lib/profile-backup";
import { performProfileBackup, writeProfileToSessionHandle } from "@/lib/profile-file-save";
import type { UserProfile } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ProfileBackupContextValue = {
  needsBackup: boolean;
  refresh: () => void;
  markBackupComplete: (profile: UserProfile) => void;
  /** Download, or write to a chosen/synced file when supported. */
  backupNow: (profile: UserProfile) => Promise<void>;
};

const ProfileBackupContext = createContext<ProfileBackupContextValue | null>(null);

export function ProfileBackupProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("settlementscan-profile-saved", on);
    return () => window.removeEventListener("settlementscan-profile-saved", on);
  }, []);

  const profile = useMemo(() => loadProfile(), [tick]);
  const needsBackup = useMemo(() => computeNeedsBackup(profile), [profile]);

  const markBackupComplete = useCallback(
    (p: UserProfile) => {
      persistBackupFingerprint(p);
      refresh();
    },
    [refresh]
  );

  const backupNow = useCallback(
    async (p: UserProfile) => {
      await performProfileBackup(p);
      persistBackupFingerprint(p);
      refresh();
    },
    [refresh]
  );

  useEffect(() => {
    if (!needsBackup) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [needsBackup]);

  const value = useMemo(
    () => ({
      needsBackup,
      refresh,
      markBackupComplete,
      backupNow,
    }),
    [needsBackup, refresh, markBackupComplete, backupNow]
  );

  return <ProfileBackupContext.Provider value={value}>{children}</ProfileBackupContext.Provider>;
}

export function useProfileBackup(): ProfileBackupContextValue {
  const ctx = useContext(ProfileBackupContext);
  if (!ctx) {
    throw new Error("useProfileBackup must be used within ProfileBackupProvider");
  }
  return ctx;
}

/** Debounced sync to the file chosen this session (Chromium File System Access). */
export function ProfileBackupAutoWriter() {
  const { refresh, markBackupComplete } = useProfileBackup();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onSave = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const p = loadProfile();
        if (!p || !computeNeedsBackup(p)) return;
        const ok = await writeProfileToSessionHandle(p);
        if (ok) {
          markBackupComplete(p);
        }
      }, 2500);
    };

    window.addEventListener("settlementscan-profile-saved", onSave);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("settlementscan-profile-saved", onSave);
    };
  }, [markBackupComplete]);

  return null;
}
