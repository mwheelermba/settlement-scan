/**
 * Community counters in Redis.
 *
 * 1) Upstash / legacy KV (HTTP REST): KV_REST_API_* or UPSTASH_REDIS_REST_* → @vercel/kv
 * 2) Vercel "Serverless Redis" / Redis Cloud (TCP): REDIS_URL → node-redis
 */

import { createClient as createRestClient, type VercelKV } from "@vercel/kv";
import { createClient as createTcpClient } from "redis";

type TcpRedis = ReturnType<typeof createTcpClient>;

function restConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

let _rest: VercelKV | null | undefined;

function getRestClient(): VercelKV | null {
  if (_rest === undefined) {
    const cfg = restConfig();
    _rest = cfg ? createRestClient({ url: cfg.url, token: cfg.token }) : null;
  }
  return _rest;
}

const g = globalThis as typeof globalThis & {
  __ssRedisTcp?: TcpRedis;
  __ssRedisTcpConnect?: Promise<TcpRedis | null>;
};

async function getTcpClient(): Promise<TcpRedis | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (g.__ssRedisTcp) return g.__ssRedisTcp;

  if (!g.__ssRedisTcpConnect) {
    g.__ssRedisTcpConnect = (async () => {
      const client = createTcpClient({ url });
      client.on("error", () => {});
      await client.connect();
      g.__ssRedisTcp = client;
      return client;
    })().catch(() => {
      g.__ssRedisTcpConnect = undefined;
      return null;
    });
  }

  return g.__ssRedisTcpConnect;
}

export function isKvConfigured(): boolean {
  return restConfig() !== null || Boolean(process.env.REDIS_URL?.trim());
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const KEYS = {
  totalClaims: "ss:total:claims",
  totalShares: "ss:total:shares",
  claimFor: (settlementId: string) => `ss:c:${settlementId}`,
  shareFor: (settlementId: string) => `ss:s:${settlementId}`,
} as const;

export async function incrementEvent(
  type: "claim_click" | "share",
  settlementId?: string
): Promise<{ persisted: boolean }> {
  const rest = getRestClient();
  if (rest) {
    try {
      if (type === "claim_click") {
        await rest.incr(KEYS.totalClaims);
        if (settlementId) await rest.incr(KEYS.claimFor(settlementId));
      } else {
        await rest.incr(KEYS.totalShares);
        if (settlementId) await rest.incr(KEYS.shareFor(settlementId));
      }
      return { persisted: true };
    } catch {
      return { persisted: false };
    }
  }

  const tcp = await getTcpClient();
  if (!tcp) return { persisted: false };
  try {
    if (type === "claim_click") {
      await tcp.incr(KEYS.totalClaims);
      if (settlementId) await tcp.incr(KEYS.claimFor(settlementId));
    } else {
      await tcp.incr(KEYS.totalShares);
      if (settlementId) await tcp.incr(KEYS.shareFor(settlementId));
    }
    return { persisted: true };
  } catch {
    return { persisted: false };
  }
}

export type CommunityStats = {
  claims: number;
  shares: number;
  kvEnabled: boolean;
};

export async function getCommunityStats(): Promise<CommunityStats> {
  const rest = getRestClient();
  if (rest) {
    try {
      const [c, s] = await Promise.all([rest.get(KEYS.totalClaims), rest.get(KEYS.totalShares)]);
      return {
        claims: toNum(c),
        shares: toNum(s),
        kvEnabled: true,
      };
    } catch {
      return { claims: 0, shares: 0, kvEnabled: false };
    }
  }

  const tcp = await getTcpClient();
  if (!tcp) {
    return { claims: 0, shares: 0, kvEnabled: false };
  }
  try {
    const [c, s] = await Promise.all([tcp.get(KEYS.totalClaims), tcp.get(KEYS.totalShares)]);
    return {
      claims: toNum(c),
      shares: toNum(s),
      kvEnabled: true,
    };
  } catch {
    return { claims: 0, shares: 0, kvEnabled: false };
  }
}
