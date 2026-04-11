"use client";

import { ProfileForm } from "@/components/ProfileForm";
import { loadProfile, saveProfile } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const p = loadProfile();
      setProfile(p ?? defaultProfile());
      setReady(true);
    });
  }, []);

  function persist(p: UserProfile) {
    setProfile(p);
    saveProfile(p);
  }

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Changes save automatically. See{" "}
          <Link href="/" className="font-medium text-teal-700 dark:text-teal-400">
            matches
          </Link>{" "}
          after you pick a state.
        </p>
      </div>
      <ProfileForm profile={profile} onChange={persist} />
    </div>
  );
}
