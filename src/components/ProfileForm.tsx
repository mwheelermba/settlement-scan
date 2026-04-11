"use client";

import { lookupBreachesForEmail } from "@/lib/hibp";
import type { UserProfile } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

function parseListFlexible(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSaveFlash = useCallback(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setSavedFlash(true);
      flashTimerRef.current = null;
    }, 750);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  const save = useCallback(
    (next: UserProfile) => {
      onChange(next);
      scheduleSaveFlash();
    },
    [onChange, scheduleSaveFlash]
  );

  const saveQuiet = useCallback(
    (next: UserProfile) => {
      onChange(next);
    },
    [onChange]
  );

  const [emailDraft, setEmailDraft] = useState(() => profile.emails.join("\n"));
  const [servicesDraft, setServicesDraft] = useState(() =>
    [...profile.services, ...profile.companies_purchased_from].join("\n")
  );
  const [productsDraft, setProductsDraft] = useState(() => profile.products.join("\n"));
  const [breachDraft, setBreachDraft] = useState(() => profile.breach_names.join(", "));

  const emailsKey = profile.emails.join("|");
  useEffect(() => {
    queueMicrotask(() => setEmailDraft(profile.emails.join("\n")));
  }, [emailsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when stored emails change

  const servicesKey = [...profile.services, ...profile.companies_purchased_from].join("|");
  useEffect(() => {
    queueMicrotask(() =>
      setServicesDraft([...profile.services, ...profile.companies_purchased_from].join("\n"))
    );
  }, [servicesKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when stored list changes

  const productsKey = profile.products.join("|");
  useEffect(() => {
    queueMicrotask(() => setProductsDraft(profile.products.join("\n")));
  }, [productsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when stored list changes

  const breachKey = profile.breach_names.join("|");
  useEffect(() => {
    queueMicrotask(() => setBreachDraft(profile.breach_names.join(", ")));
  }, [breachKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when stored list changes

  async function commitEmailsAndMaybeHibp() {
    const emails = parseListFlexible(emailDraft);
    const next: UserProfile = { ...profile, emails };
    saveQuiet(next);
    scheduleSaveFlash();

    const first = emails[0]?.trim();
    if (!first) {
      setHibpNote(null);
      return;
    }
    setHibpNote(null);
    const res = await lookupBreachesForEmail(first);
    if (res.disabled) {
      setHibpNote("Add breach names manually or check haveibeenpwned.com — API key not configured.");
      return;
    }
    if (res.error) {
      setHibpNote(res.error);
      return;
    }
    const merged = new Set([...next.breach_names, ...res.breachNames]);
    saveQuiet({ ...next, breach_names: [...merged] });
    setBreachDraft([...merged].join(", "));
    setHibpNote(
      res.breachNames.length
        ? `Found ${res.breachNames.length} known breach name(s) from HIBP — saved to “Breach names” below.`
        : "No known breaches for that email in HIBP."
    );
    scheduleSaveFlash();
  }

  function commitServices() {
    const parts = parseListFlexible(servicesDraft);
    save({ ...profile, services: parts, companies_purchased_from: [] });
  }

  function commitProducts() {
    const parts = parseListFlexible(productsDraft);
    save({ ...profile, products: parts });
  }

  function commitBreaches() {
    const parts = breachDraft
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    save({ ...profile, breach_names: parts });
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
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Used for optional HIBP breach lookup (first address) when you leave this field. Type freely — commas and line
          breaks are OK. We save when you click or tab away.
        </p>
        <textarea
          rows={4}
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          onBlur={() => void commitEmailsAndMaybeHibp()}
          spellCheck={false}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {hibpNote && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{hibpNote}</p>}
        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Breach names (manual)
          <p className="mb-1 font-normal text-zinc-500">
            Matching is <span className="font-medium text-zinc-700 dark:text-zinc-300">case-insensitive exact match</span>{" "}
            to each settlement’s <code className="rounded bg-zinc-100 px-1 text-[11px] dark:bg-zinc-800">breach_name</code>{" "}
            in our data (same spelling as{" "}
            <a
              href="https://haveibeenpwned.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline dark:text-teal-400"
            >
              Have I Been Pwned
            </a>{" "}
            breach names when you use email lookup). Separate with commas or semicolons; we save when you leave the
            field.
          </p>
          <input
            value={breachDraft}
            onChange={(e) => setBreachDraft(e.target.value)}
            onBlur={commitBreaches}
            placeholder="e.g. LinkedIn, Adobe, Equifax"
            spellCheck={false}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </Section>

      <Section title="Services & companies">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Brands and services that describe your life — phone/internet carrier, banks, streaming apps, stores you buy
          from, apps you subscribe to, past employers if a settlement names them, etc. Settlements match by{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">name overlap</span> with our database (not a full
          background check). Add what you remember; you can grow this over time. Same idea as other settlement finders:
          they collect signals like accounts, purchases, and memberships — not everything at once.
        </p>
        <textarea
          rows={4}
          value={servicesDraft}
          onChange={(e) => setServicesDraft(e.target.value)}
          onBlur={commitServices}
          placeholder={"One per line, or separate with commas\ne.g. Google Play Store\nT-Mobile"}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Products">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Specific products you bought or used if a settlement names them (supplements, devices, apps, etc.). Optional;
          comma or line break between items. Saved when you leave the field.
        </p>
        <textarea
          rows={3}
          value={productsDraft}
          onChange={(e) => setProductsDraft(e.target.value)}
          onBlur={commitProducts}
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
          className="cursor-pointer text-sm font-medium text-teal-700 dark:text-teal-400"
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
