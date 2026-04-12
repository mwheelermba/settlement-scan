"use client";

import { loadProfile } from "@/lib/profile";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useProfileBackup } from "./ProfileBackupContext";

function isHashOnlyOrEmpty(href: string): boolean {
  return href.startsWith("#") || href === "";
}

function isSameOriginInternal(href: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(href, window.location.href);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * While on /profile, intercepts in-app navigation when a file backup is out of date
 * (beforeunload still warns on tab close — see ProfileBackupProvider).
 */
export function ProfileBackupGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { needsBackup, backupNow } = useProfileBackup();
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!needsBackup) setPending(null);
  }, [needsBackup]);

  const onBackup = useCallback(async () => {
    const p = loadProfile();
    if (!p) {
      setPending(null);
      return;
    }
    const dest = pending;
    setBusy(true);
    try {
      await backupNow(p);
      setPending(null);
      if (dest) router.push(dest);
    } finally {
      setBusy(false);
    }
  }, [backupNow, pending, router]);

  const onLeave = useCallback(() => {
    const dest = pending;
    setPending(null);
    if (dest) router.push(dest);
  }, [pending, router]);

  useEffect(() => {
    if (pathname !== "/profile" || !needsBackup) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target === "_blank" || a.download) return;

      const href = a.getAttribute("href");
      if (!href || isHashOnlyOrEmpty(href)) return;
      if (!isSameOriginInternal(href)) return;

      const u = new URL(href, window.location.href);
      if (u.pathname === "/profile") return;

      e.preventDefault();
      e.stopPropagation();
      setPending(u.pathname + u.search + u.hash);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, needsBackup]);

  if (pathname !== "/profile" || !pending) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-guard-title"
      >
        <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <h2 id="backup-guard-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Save a backup first?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your profile changed since your last file backup. We don&apos;t store your personal information on our
            servers — it only lives in this browser until you download or sync a JSON file.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Back up now, or leave anyway if you&apos;re fine relying on browser storage alone.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void onBackup();
              }}
              className="cursor-pointer rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Back up and continue"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onLeave}
              className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Leave without backup
            </button>
            <Link
              href="/profile#profile-export"
              onClick={() => setPending(null)}
              className="cursor-pointer rounded-xl px-4 py-2 text-center text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              More backup options
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
