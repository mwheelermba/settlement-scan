import { getCommunityStats, incrementEvent } from "@/lib/kv-stats";
import { NextResponse } from "next/server";

/**
 * POST: increment anonymous counters (claim clicks, shares).
 * GET: read aggregate totals (for dashboard / debugging).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { type?: string; settlementId?: string };
    if (body.type !== "claim_click" && body.type !== "share") {
      return NextResponse.json({ error: "Invalid or missing type" }, { status: 400 });
    }

    const settlementId =
      typeof body.settlementId === "string" && body.settlementId.length > 0
        ? body.settlementId.slice(0, 200)
        : undefined;

    const { persisted } = await incrementEvent(body.type, settlementId);
    return NextResponse.json({ ok: true, persisted });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function GET() {
  const stats = await getCommunityStats();
  return NextResponse.json(stats);
}
