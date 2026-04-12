"use client";

import type { SettlementType } from "@/lib/types";

const TYPES: SettlementType[] = [
  "data_breach",
  "consumer",
  "vehicle",
  "employment",
  "financial",
  "housing",
  "health",
];

export function FilterBar({
  type,
  onType,
  state,
  onState,
  noProofOnly,
  onNoProofOnly,
  excludeNationwide,
  onExcludeNationwide,
}: {
  type: SettlementType | "";
  onType: (t: SettlementType | "") => void;
  state: string;
  onState: (s: string) => void;
  noProofOnly: boolean;
  onNoProofOnly: (v: boolean) => void;
  excludeNationwide: boolean;
  onExcludeNationwide: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Type
          <select
            value={type}
            onChange={(e) => onType((e.target.value || "") as SettlementType | "")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          State
          <input
            value={state}
            onChange={(e) => onState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="e.g. OR"
            maxLength={2}
            className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={noProofOnly}
            onChange={(e) => onNoProofOnly(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-zinc-300"
          />
          Easy claims (no proof)
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={excludeNationwide}
            onChange={(e) => onExcludeNationwide(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-zinc-300"
          />
          Hide nationwide
        </label>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Hide nationwide: only rows with a state list in the data. Add <span className="font-medium">State</span> to
        narrow to that code.
      </p>
    </div>
  );
}
