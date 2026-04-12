"use client";

import { lookupBreachesForEmail } from "@/lib/hibp";
import { importProfileJson } from "@/lib/profile";
import {
  SUGGEST_BREACH,
  SUGGEST_EMPLOYERS,
  SUGGEST_FINANCIAL,
  SUGGEST_MEDICAL,
  SUGGEST_PRODUCTS,
  SUGGEST_RETAIL_AND_BRANDS,
  SUGGEST_SUBSCRIPTIONS,
} from "@/lib/profile-suggestions";
import { getActiveSettlements } from "@/lib/settlements";
import { getSmartTermsFromDbOnly } from "@/lib/smart-suggestions";
import type { UserProfile } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SmartQuickAddRow } from "./SmartQuickAddRow";
import { StaticQuickAddDoubleRow } from "./StaticQuickAddDoubleRow";

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

function appendLineIfNew(draft: string, line: string): string {
  const cur = parseListFlexible(draft);
  if (cur.some((x) => x.toLowerCase() === line.trim().toLowerCase())) return draft;
  const t = draft.trim();
  return t ? `${t}\n${line}` : line;
}

/** One line per vehicle: Make Model Year — year must be last token; incomplete lines ignored on save. */
function parseVehicleLines(raw: string): { make: string; model: string; year: number }[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const maxYear = new Date().getFullYear() + 1;
  const out: { make: string; model: string; year: number }[] = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const year = parseInt(parts[parts.length - 1] ?? "", 10);
    if (!Number.isFinite(year) || year < 1900 || year > maxYear) continue;
    const make = parts[0] ?? "";
    const model = parts.slice(1, -1).join(" ");
    out.push({ make, model, year });
  }
  return out;
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
  const skipVehicleDraftSync = useRef(false);

  const settlementDb = useMemo(() => getActiveSettlements(), []);
  const smart = useMemo(
    () => ({
      subscriptions: getSmartTermsFromDbOnly("subscriptions", settlementDb, { limit: 8 }),
      financial: getSmartTermsFromDbOnly("financial", settlementDb, { limit: 8 }),
      employers: getSmartTermsFromDbOnly("employers", settlementDb, { limit: 8 }),
      retail: getSmartTermsFromDbOnly("retail", settlementDb, { limit: 8 }),
      medical: getSmartTermsFromDbOnly("medical", settlementDb, { limit: 8 }),
      products: getSmartTermsFromDbOnly("products", settlementDb, { limit: 8 }),
      breach: getSmartTermsFromDbOnly("breach", settlementDb, { limit: 8 }),
    }),
    [settlementDb]
  );

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
  const [subDraft, setSubDraft] = useState(() => (profile.subscriptions ?? []).join("\n"));
  const [finDraft, setFinDraft] = useState(() => (profile.financial_institutions ?? []).join("\n"));
  const [empDraft, setEmpDraft] = useState(() => (profile.employers ?? []).join("\n"));
  const [retailDraft, setRetailDraft] = useState(() => (profile.retail_and_brands ?? []).join("\n"));
  const [productsDraft, setProductsDraft] = useState(() => profile.products.join("\n"));
  const [breachDraft, setBreachDraft] = useState(() => profile.breach_names.join("\n"));
  const [vehicleDraft, setVehicleDraft] = useState(() =>
    profile.vehicles.map((v) => `${v.make} ${v.model} ${v.year}`.trim()).join("\n")
  );
  const [medicalDraft, setMedicalDraft] = useState(() => (profile.medical_and_health ?? []).join("\n"));

  const emailsKey = profile.emails.join("|");
  useEffect(() => {
    queueMicrotask(() => setEmailDraft(profile.emails.join("\n")));
  }, [emailsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const splitKey = [
    (profile.subscriptions ?? []).join("|"),
    (profile.financial_institutions ?? []).join("|"),
    (profile.employers ?? []).join("|"),
    (profile.retail_and_brands ?? []).join("|"),
    (profile.medical_and_health ?? []).join("|"),
  ].join("::");
  useEffect(() => {
    queueMicrotask(() => {
      setSubDraft((profile.subscriptions ?? []).join("\n"));
      setFinDraft((profile.financial_institutions ?? []).join("\n"));
      setEmpDraft((profile.employers ?? []).join("\n"));
      setRetailDraft((profile.retail_and_brands ?? []).join("\n"));
      setMedicalDraft((profile.medical_and_health ?? []).join("\n"));
    });
  }, [splitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const vehiclesKey = profile.vehicles.map((v) => `${v.make}|${v.model}|${v.year}`).join("||");
  useEffect(() => {
    if (skipVehicleDraftSync.current) {
      skipVehicleDraftSync.current = false;
      return;
    }
    queueMicrotask(() =>
      setVehicleDraft(profile.vehicles.map((v) => `${v.make} ${v.model} ${v.year}`.trim()).join("\n"))
    );
  }, [vehiclesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const productsKey = profile.products.join("|");
  useEffect(() => {
    queueMicrotask(() => setProductsDraft(profile.products.join("\n")));
  }, [productsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const breachKey = profile.breach_names.join("|");
  useEffect(() => {
    queueMicrotask(() => setBreachDraft(profile.breach_names.join("\n")));
  }, [breachKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setHibpNote(
        "Add breach names below manually, or check haveibeenpwned.com — email lookup is not configured on the server."
      );
      return;
    }
    if (res.error) {
      setHibpNote(res.error);
      return;
    }
    const merged = new Set([...next.breach_names, ...res.breachNames]);
    saveQuiet({ ...next, breach_names: [...merged] });
    setBreachDraft([...merged].join("\n"));
    setHibpNote(
      res.breachNames.length
        ? `Found ${res.breachNames.length} breach name(s) from Have I Been Pwned — added to the breach list below.`
        : "No known breaches for that email in Have I Been Pwned."
    );
    scheduleSaveFlash();
  }

  function commitSubs() {
    save({ ...profile, subscriptions: parseListFlexible(subDraft) });
  }
  function commitFin() {
    save({ ...profile, financial_institutions: parseListFlexible(finDraft) });
  }
  function commitEmp() {
    save({ ...profile, employers: parseListFlexible(empDraft) });
  }
  function commitRetail() {
    save({ ...profile, retail_and_brands: parseListFlexible(retailDraft), services: [], companies_purchased_from: [] });
  }
  function commitProducts() {
    save({ ...profile, products: parseListFlexible(productsDraft) });
  }
  function commitBreaches() {
    save({ ...profile, breach_names: parseListFlexible(breachDraft) });
  }

  function commitVehicles() {
    skipVehicleDraftSync.current = true;
    save({ ...profile, vehicles: parseVehicleLines(vehicleDraft) });
  }

  function commitMedical() {
    save({ ...profile, medical_and_health: parseListFlexible(medicalDraft) });
  }

  return (
    <div className="space-y-4">
      <div className="min-h-[2.25rem]">
        <p
          className={`text-xs font-medium text-teal-700 transition-opacity duration-200 dark:text-teal-400 ${
            savedFlash ? "opacity-100" : "opacity-0"
          }`}
          aria-live="polite"
        >
          Profile saved locally — your data never leaves this device.
        </p>
      </div>

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
        <p className="mb-2 text-xs text-zinc-500">Separate addresses with commas or put one per line.</p>
        <textarea
          rows={4}
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          onBlur={() => void commitEmailsAndMaybeHibp()}
          spellCheck={false}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {hibpNote && <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{hibpNote}</p>}

        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Data breaches</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            List breach names you know apply to you — comma or line between each. Matching is flexible (spacing and
            capitalization). When you leave the email field above, names returned from{" "}
            <a
              href="https://haveibeenpwned.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline dark:text-teal-400"
            >
              Have I Been Pwned
            </a>{" "}
            are merged into this list automatically when{" "}
            <code className="rounded bg-zinc-100 px-1 text-[11px] dark:bg-zinc-800">HIBP_API_KEY</code> is set on the
            server; otherwise add names by hand. You can edit or add more anytime.
          </p>
          <textarea
            rows={5}
            value={breachDraft}
            onChange={(e) => setBreachDraft(e.target.value)}
            onBlur={commitBreaches}
            placeholder="e.g. LinkedIn, Adobe, Equifax"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <SmartQuickAddRow
            label="From settlement database (this section)"
            terms={smart.breach}
            onAdd={(s) => setBreachDraft((d) => appendLineIfNew(d, s))}
          />
          <StaticQuickAddDoubleRow
            label="Suggested names (static list)"
            suggestions={SUGGEST_BREACH}
            onAdd={(s) => setBreachDraft((d) => appendLineIfNew(d, s))}
          />
        </div>
      </Section>

      <Section title="Subscriptions & streaming">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Paid apps, streaming, cloud storage, gaming subscriptions, etc.
        </p>
        <SmartQuickAddRow
          label="From settlement database (this section)"
          terms={smart.subscriptions}
          onAdd={(s) => setSubDraft((d) => appendLineIfNew(d, s))}
        />
        <StaticQuickAddDoubleRow
          label="Suggested names (static list)"
          suggestions={SUGGEST_SUBSCRIPTIONS}
          onAdd={(s) => setSubDraft((d) => appendLineIfNew(d, s))}
        />
        <textarea
          rows={3}
          value={subDraft}
          onChange={(e) => setSubDraft(e.target.value)}
          onBlur={commitSubs}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Banks & financial">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Banks, cards, fintech, credit bureaus, investment accounts you use or used.
        </p>
        <SmartQuickAddRow
          label="From settlement database (this section)"
          terms={smart.financial}
          onAdd={(s) => setFinDraft((d) => appendLineIfNew(d, s))}
        />
        <StaticQuickAddDoubleRow
          label="Suggested names (static list)"
          suggestions={SUGGEST_FINANCIAL}
          onAdd={(s) => setFinDraft((d) => appendLineIfNew(d, s))}
        />
        <textarea
          rows={3}
          value={finDraft}
          onChange={(e) => setFinDraft(e.target.value)}
          onBlur={commitFin}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Past employers">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Companies you worked for when a settlement might name the employer (delivery, retail, gig work, etc.).
        </p>
        <SmartQuickAddRow
          label="From settlement database (this section)"
          terms={smart.employers}
          onAdd={(s) => setEmpDraft((d) => appendLineIfNew(d, s))}
        />
        <StaticQuickAddDoubleRow
          label="Suggested names (static list)"
          suggestions={SUGGEST_EMPLOYERS}
          onAdd={(s) => setEmpDraft((d) => appendLineIfNew(d, s))}
        />
        <textarea
          rows={3}
          value={empDraft}
          onChange={(e) => setEmpDraft(e.target.value)}
          onBlur={commitEmp}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Retail, brands & other">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Phone/internet carriers, big retailers, brands you shop with, and anything else that did not fit above. Matching
          ignores small spelling differences (e.g. &quot;T Mobile&quot; vs &quot;T-Mobile&quot;).
        </p>
        <SmartQuickAddRow
          label="From settlement database (this section)"
          terms={smart.retail}
          onAdd={(s) => setRetailDraft((d) => appendLineIfNew(d, s))}
        />
        <StaticQuickAddDoubleRow
          label="Suggested names (static list)"
          suggestions={SUGGEST_RETAIL_AND_BRANDS}
          onAdd={(s) => setRetailDraft((d) => appendLineIfNew(d, s))}
        />
        <textarea
          rows={3}
          value={retailDraft}
          onChange={(e) => setRetailDraft(e.target.value)}
          onBlur={commitRetail}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Products">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Specific products (supplements, devices, model names) if a settlement names them. Short phrases are OK;
          matching is flexible.
        </p>
        <SmartQuickAddRow
          label="From settlement database (this section)"
          terms={smart.products}
          onAdd={(s) => setProductsDraft((d) => appendLineIfNew(d, s))}
        />
        <StaticQuickAddDoubleRow
          label="Suggested names (static list)"
          suggestions={SUGGEST_PRODUCTS}
          onAdd={(s) => setProductsDraft((d) => appendLineIfNew(d, s))}
        />
        <textarea
          rows={3}
          value={productsDraft}
          onChange={(e) => setProductsDraft(e.target.value)}
          onBlur={commitProducts}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Medical & health">
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Insurers, hospital networks, patient portals (e.g. MyChart), pharmacies, and health or fitness apps that hold
          sensitive data. Helps match HIPAA-related and health-tech claims — list anything relevant; matching is
          flexible.
        </p>
        <SmartQuickAddRow
          label="From settlement database (this section)"
          terms={smart.medical}
          onAdd={(s) => setMedicalDraft((d) => appendLineIfNew(d, s))}
        />
        <StaticQuickAddDoubleRow
          label="Suggested names (static list)"
          suggestions={SUGGEST_MEDICAL}
          onAdd={(s) => setMedicalDraft((d) => appendLineIfNew(d, s))}
        />
        <textarea
          rows={3}
          value={medicalDraft}
          onChange={(e) => setMedicalDraft(e.target.value)}
          onBlur={commitMedical}
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Section>

      <Section title="Vehicles">
        <p className="mb-2 text-xs text-zinc-500">
          One vehicle per line: <span className="font-medium">Make Model Year</span> (year last), e.g.{" "}
          <span className="font-mono">Kia Optima 2015</span>. Lines without a valid year at the end are kept in the box
          but not saved until you finish the line; your typing is saved when you leave this field.
        </p>
        <textarea
          rows={3}
          value={vehicleDraft}
          onChange={(e) => setVehicleDraft(e.target.value)}
          onBlur={commitVehicles}
          spellCheck={false}
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
                  onChange(importProfileJson(String(r.result)));
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
