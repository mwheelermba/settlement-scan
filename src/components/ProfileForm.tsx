"use client";

import { lookupBreachesForEmail } from "@/lib/hibp";
import type { UserProfile } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        {title}
        <span className="text-zinc-400">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">{children}</div>}
    </div>
  );
}

export function ProfileForm({
  profile,
  onChange,
}: {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [hibpNote, setHibpNote] = useState<string | null>(null);

  const save = useCallback(
    (next: UserProfile) => {
      onChange(next);
      setSavedFlash(true);
    },
    [onChange]
  );

  useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 1000);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  async function onEmailBlur(email: string) {
    if (!email.trim()) return;
    setHibpNote(null);
    const res = await lookupBreachesForEmail(email);
    if (res.disabled) {
      setHibpNote("Add breach names manually or check haveibeenpwned.com — API key not configured.");
      return;
    }
    if (res.error) {
      setHibpNote(res.error);
      return;
    }
    const merged = new Set([...profile.breach_names, ...res.breachNames]);
    save({ ...profile, breach_names: [...merged] });
    setHibpNote(
      res.breachNames.length
        ? `Matched ${res.breachNames.length} known breach(es). Saved to profile.`
        : "No known breaches for this email."
    );
  }

  return (
    <div className="space-y-4">
      {savedFlash && (
        <p className="text-xs font-medium text-teal-700 dark:text-teal-400" role="status">
          Profile saved locally — your data never leaves this device.
        </p>
      )}

      <Section title="Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            State
            <select
              value={profile.state}
              onChange={(e) => save({ ...profile, state: e.target.value })}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select…</option>
              {US_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            ZIP (optional)
            <input
              value={profile.zip ?? ""}
              onChange={(e) => save({ ...profile, zip: e.target.value })}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
      </Section>

      <Section title="Email addresses">
        <p className="mb-2 text-xs text-zinc-500">
          Used for optional breach matching. Add one email per line or comma-separated.
        </p>
        <textarea
          rows={3}
          value={profile.emails.join(", ")}
          onChange={(e) =>
            save({
              ...profile,
              emails: e.target.value
                .split(/[\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          onBlur={(e) => {
            const first = e.target.value.split(/[\n,]+/)[0]?.trim();
            if (first) void onEmailBlur(first);
          }}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {hibpNote && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{hibpNote}</p>}
        <label className="mt-2 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Breach names (manual)
          <input
            value={profile.breach_names.join(", ")}
            onChange={(e) =>
              save({
                ...profile,
                breach_names: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g. TMobile2021, Equifax"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </Section>

      <Section title="Services & companies">
        <textarea
          rows={3}
          value={[...profile.services, ...profile.companies_purchased_from].join(", ")}
          onChange={(e) => {
            const parts = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            save({ ...profile, services: parts, companies_purchased_from: [] });
          }}
          placeholder="Google Play Store, T-Mobile, …"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Products">
        <textarea
          rows={2}
          value={profile.products.join(", ")}
          onChange={(e) =>
            save({
              ...profile,
              products: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Vehicles">
        <p className="mb-2 text-xs text-zinc-500">Add as: Make Model Year (one per line), e.g. Kia Optima 2015</p>
        <textarea
          rows={3}
          value={profile.vehicles.map((v) => `${v.make} ${v.model} ${v.year}`).join("\n")}
          onChange={(e) => {
            const vehicles = e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const parts = line.split(/\s+/);
                const year = parseInt(parts[parts.length - 1] ?? "", 10);
                const make = parts[0] ?? "";
                const model = parts.slice(1, -1).join(" ");
                return { make, model, year: Number.isFinite(year) ? year : new Date().getFullYear() };
              });
            save({ ...profile, vehicles });
          }}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <div className="flex flex-wrap gap-3 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <button
          type="button"
          className="text-sm font-medium text-teal-700 dark:text-teal-400"
          onClick={() => {
            const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "settlementscan-profile.json";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Export JSON
        </button>
        <label className="cursor-pointer text-sm font-medium text-teal-700 dark:text-teal-400">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                try {
                  const p = JSON.parse(String(r.result)) as UserProfile;
                  onChange(p);
                } catch {
                  /* ignore */
                }
              };
              r.readAsText(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}
