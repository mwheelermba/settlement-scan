const KEY = "settlementscan_local_metrics_v1";

export type LocalMetrics = {
  claim_clicks: number;
  shares: number;
  settlement_views: number;
};

function defaults(): LocalMetrics {
  return { claim_clicks: 0, shares: 0, settlement_views: 0 };
}

function read(): LocalMetrics {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw) as Partial<LocalMetrics>;
    return {
      claim_clicks: typeof p.claim_clicks === "number" ? p.claim_clicks : 0,
      shares: typeof p.shares === "number" ? p.shares : 0,
      settlement_views: typeof p.settlement_views === "number" ? p.settlement_views : 0,
    };
  } catch {
    return defaults();
  }
}

function write(m: LocalMetrics): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(m));
}

export function getLocalMetrics(): LocalMetrics {
  return read();
}

export function bumpLocalClaimClick(): void {
  const m = read();
  m.claim_clicks += 1;
  write(m);
}

export function bumpLocalShare(): void {
  const m = read();
  m.shares += 1;
  write(m);
}

export function bumpLocalSettlementView(): void {
  const m = read();
  m.settlement_views += 1;
  write(m);
}
