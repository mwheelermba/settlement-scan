import { NextResponse } from "next/server";

/**
 * Anonymous aggregate events (claim clicks, shares).
 * Wire to Vercel KV or another store in production; see README.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { type?: string; settlementId?: string };
    if (!body.type) {
      return NextResponse.json({ error: "Missing type" }, { status: 400 });
    }
    // Placeholder: no persistent store until KV is configured.
    return NextResponse.json({ ok: true, received: body });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
