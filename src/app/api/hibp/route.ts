import { NextResponse } from "next/server";

type HibpBreach = { Name: string };

export async function POST(req: Request) {
  const key = process.env.HIBP_API_KEY;
  if (!key) {
    return NextResponse.json(
      { disabled: true, message: "HIBP_API_KEY not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const encoded = encodeURIComponent(email);
  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encoded}`;

  const res = await fetch(url, {
    headers: {
      "hibp-api-key": key,
      "user-agent": "SettlementScan/0.1",
    },
    next: { revalidate: 0 },
  });

  if (res.status === 404) {
    return NextResponse.json({ breachNames: [] });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Have I Been Pwned request failed" },
      { status: 502 }
    );
  }

  const data = (await res.json()) as HibpBreach[];
  const breachNames = Array.isArray(data)
    ? data.map((b) => b.Name).filter(Boolean)
    : [];

  return NextResponse.json({ breachNames });
}
