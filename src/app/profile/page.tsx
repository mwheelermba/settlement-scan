"use client";

import { ProfileBackupGuard } from "@/components/ProfileBackupGuard";
import { ProfileBackupOnProfileBanner } from "@/components/ProfileBackupFloatingBar";
import { ProfileIntro } from "@/components/ProfileIntro";
import { ProfileForm } from "@/components/ProfileForm";
import { applyProfileUpdate, defaultProfile, loadProfile, saveProfile, type ProfileUpdater } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ProfilePage() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const p = loadProfile();
      setProfile(p ?? defaultProfile());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (pathname === "/profile" && prev !== null && prev !== "/profile") {
      const p = loadProfile();
      setProfile(p ?? defaultProfile());
    }
  }, [pathname]);

  function persist(update: ProfileUpdater) {
    setProfile((prev) => {
      const next = applyProfileUpdate(prev, update);
      saveProfile(next);
      return next;
    });
  }

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />;
  }

  return (
    <ProfileBackupGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Edits save to <span className="font-medium text-zinc-800 dark:text-zinc-200">this browser&apos;s storage</span>{" "}
            automatically — we do not store your personal data on our servers. For a safety net against cleared storage or
            switching devices, save a{" "}
            <Link href="#profile-export" className="font-medium text-teal-700 underline dark:text-teal-400">
              JSON backup file
            </Link>
            . See{" "}
            <Link href="/" className="font-medium text-teal-700 dark:text-teal-400">
              matches
            </Link>{" "}
            after you pick a state.
          </p>
        </div>
        <ProfileBackupOnProfileBanner />
        <ProfileIntro />
        <ProfileForm profile={profile} onChange={persist} />
      </div>
    </ProfileBackupGuard>
  );
}
