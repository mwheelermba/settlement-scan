import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

type Body = {
  message?: string;
  contact?: string;
  path?: string;
};

async function sendViaResend(text: string): Promise<boolean> {
  const to = process.env.REPORT_EMAIL_TO?.trim();
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.REPORT_EMAIL_FROM?.trim() || "SettlementScan <onboarding@resend.dev>";
  if (!to || !key) return false;

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
  return res.ok;
}

async function sendViaSmtp(text: string): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim() ?? "587";
  const port = parseInt(portRaw, 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const to = process.env.REPORT_EMAIL_TO?.trim();
  if (!host || !user || !pass || !to || !Number.isFinite(port)) return false;

  const from = process.env.REPORT_EMAIL_FROM?.trim() || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "[SettlementScan] Problem report",
    text,
  });
  return true;
}

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

  const hint =
    "Add RESEND_API_KEY + REPORT_EMAIL_TO on Vercel (Project → Settings → Environment Variables), or the same SMTP_* vars you use for GitHub Actions. GitHub Secrets do not apply to the live site.";

  try {
    if (await sendViaResend(text)) {
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("report resend failed", e);
  }

  try {
    if (await sendViaSmtp(text)) {
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("report smtp failed", e);
    return NextResponse.json(
      { ok: false, error: "send_failed", hint },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "reporting_not_configured", hint },
    { status: 503 }
  );
}
