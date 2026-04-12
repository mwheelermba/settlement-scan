"use client";

import { loadProfile } from "@/lib/profile";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useProfileBackup } from "./ProfileBackupContext";

/** Prominent reminder on the Profile page when a file backup is out of date. */
export function ProfileBackupOnProfileBanner() {
  const { needsBackup, backupNow } = useProfileBackup();
  const [busy, setBusy] = useState(false);

  if (!needsBackup) return null;

  async function onBackup() {
    const p = loadProfile();
    if (!p) return;
    setBusy(true);
    try {
      await backupNow(p);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-semibold">You haven&apos;t saved a file backup since your last changes.</p>
      <p className="mt-1 leading-relaxed">
        We never upload your profile to our servers — it stays in this browser until you download or sync a JSON backup.
        Use a backup so you don&apos;t lose filed claims, saved settlements, or your details if storage is cleared.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onBackup()}
          className="cursor-pointer rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {busy ? "Saving…" : "Save backup now"}
        </button>
        <a
          href="#profile-export"
          className="rounded-lg border border-amber-700/40 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-50 dark:hover:bg-amber-900/50"
        >
          All backup options
        </a>
      </div>
    </div>
  );
}

/** Shown on non-profile routes when a file backup is out of date. */
export function ProfileBackupFloatingBar() {
  const pathname = usePathname();
  const { needsBackup, backupNow } = useProfileBackup();
  const [busy, setBusy] = useState(false);

  if (!needsBackup || pathname === "/profile") return null;

  async function onBackup() {
    const p = loadProfile();
    if (!p) return;
    setBusy(true);
    try {
      await backupNow(p);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="leading-snug">
        <span className="font-semibold">Your current profile is newer than your last file backup.</span> SettlementScan does not
        store your personal data on our servers — keep a JSON file so you don&apos;t lose anything if this browser
        clears storage.
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onBackup()}
          className="cursor-pointer rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {busy ? "Saving…" : "Save backup now"}
        </button>
        <Link
          href="/profile#profile-export"
          className="rounded-lg border border-amber-700/40 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-50 dark:hover:bg-amber-900/50"
        >
          Profile &amp; options
        </Link>
      </div>
    </div>
  );
}
