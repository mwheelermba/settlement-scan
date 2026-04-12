"use client";

import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";
import { SettlementCard } from "@/components/SettlementCard";
import { matchSettlement } from "@/lib/matcher";
import { defaultProfile, loadProfile, saveProfile } from "@/lib/profile";
import {
  filterSettlements,
  getActiveSettlements,
  getListingsForBrowse,
  searchSettlements,
  sortSettlements,
  type BrowseFilters,
} from "@/lib/settlements";
import type { SettlementType, UserProfile } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export default function BrowsePage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<SettlementType | "">("");
  const [stateFilter, setStateFilter] = useState("");
  const [noProofOnly, setNoProofOnly] = useState(false);
  const [excludeNationwide, setExcludeNationwide] = useState(false);
  const [includePastDeadlines, setIncludePastDeadlines] = useState(false);
  const [sort, setSort] = useState<"deadline" | "payout" | "newest" | "match" | "title">("deadline");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const all = useMemo(() => getListingsForBrowse(includePastDeadlines), [includePastDeadlines]);
  const totalActive = useMemo(() => getActiveSettlements().length, []);

  useEffect(() => {
    queueMicrotask(() => setProfile(loadProfile()));
  }, []);

  const filtered = useMemo(() => {
    const filters: BrowseFilters = {};
    if (type) filters.types = [type];
    if (stateFilter.length === 2) filters.state = stateFilter;
    if (noProofOnly) filters.noProofOnly = true;
    if (excludeNationwide) filters.excludeNationwide = true;
    let list = filterSettlements(all, filters);
    list = searchSettlements(list, q);
    const matchMap = new Map<string, number>();
    const p = profile ?? defaultProfile();
    for (const s of list) {
      matchMap.set(s.id, matchSettlement(s, p).score);
    }
    return sortSettlements(list, sort, matchMap);
  }, [q, type, stateFilter, noProofOnly, excludeNationwide, sort, profile, all]);

  const results = useMemo(() => {
    const p = profile ?? defaultProfile();
    return filtered.map((s) => matchSettlement(s, p));
  }, [filtered, profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Browse settlements</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          All open settlements with upcoming or unknown deadlines. Match scores reflect your profile when available.
        </p>
        <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Showing {filtered.length} of {all.length} listings
          {!includePastDeadlines && totalActive > all.length ? (
            <span className="font-normal text-zinc-500"> ({totalActive - all.length} past deadline hidden)</span>
          ) : null}
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={includePastDeadlines}
            onChange={(e) => setIncludePastDeadlines(e.target.checked)}
            className="mt-0.5 rounded border-zinc-300"
          />
          <span>Include archived settlements (past deadline, removed after 1 year)</span>
        </label>
      </div>

      <SearchBar value={q} onChange={setQ} />
      <FilterBar
        type={type}
        onType={setType}
        state={stateFilter}
        onState={setStateFilter}
        noProofOnly={noProofOnly}
        onNoProofOnly={setNoProofOnly}
        excludeNationwide={excludeNationwide}
        onExcludeNationwide={setExcludeNationwide}
      />

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Sort by
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="deadline">Deadline (soonest)</option>
          <option value="payout">Estimated payout</option>
          <option value="newest">Newest verified</option>
          <option value="match">Match score</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </label>

      <ul className="space-y-4">
        {results.map((r) => (
          <li key={r.settlement.id}>
            <SettlementCard
              result={r}
              profile={profile ?? defaultProfile()}
              onProfileChange={(p) => {
                setProfile(p);
                saveProfile(p);
              }}
              linkFrom="browse"
            />
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No settlements match these filters.</p>
      )}
    </div>
  );
}
