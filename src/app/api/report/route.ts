import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  message?: string;
  contact?: string;
  path?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (message.length < 3) {
    return NextResponse.json({ ok: false, error: "message_too_short" }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ ok: false, error: "message_too_long" }, { status: 400 });
  }

  const to = process.env.REPORT_EMAIL_TO?.trim();
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.REPORT_EMAIL_FROM?.trim() || "SettlementScan <onboarding@resend.dev>";

  if (!to || !key) {
    return NextResponse.json(
      { ok: false, error: "reporting_not_configured", hint: "Set REPORT_EMAIL_TO and RESEND_API_KEY on the server." },
      { status: 503 }
    );
  }

  const ua = req.headers.get("user-agent") ?? "";
  const text = [
    "SettlementScan problem report",
    "",
    message,
    "",
    "---",
    `Path: ${body.path ?? "(unknown)"}`,
    `Contact (optional): ${body.contact?.trim() || "(none)"}`,
    `User-Agent: ${ua.slice(0, 400)}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "[SettlementScan] Problem report",
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("report email failed", res.status, errText);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
