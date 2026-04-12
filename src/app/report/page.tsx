"use client";

import { useState } from "react";

export default function ReportPage() {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errDetail, setErrDetail] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrDetail(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          contact: contact.trim() || undefined,
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; hint?: string };
      if (!res.ok) {
        setStatus("err");
        setErrDetail(data.error === "reporting_not_configured" ? "The host has not enabled email reports yet." : data.error ?? "unknown");
        return;
      }
      setStatus("ok");
      setMessage("");
      setContact("");
    } catch {
      setStatus("err");
      setErrDetail("network");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Report a problem</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          SettlementScan is a free, open source project. Your message is sent to the maintainer through the hosting
          provider — your email address is not required and is never shown publicly.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          What went wrong?
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Describe the issue, what you clicked, and what you expected."
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Reply-to (optional)
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            type="text"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Email or social — only if you want a response"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send report"}
        </button>
      </form>

      {status === "ok" && (
        <p className="text-sm font-medium text-teal-800 dark:text-teal-300" role="status">
          Thanks — if email is configured on the server, the maintainer was notified.
        </p>
      )}
      {status === "err" && (
        <p className="text-sm text-red-800 dark:text-red-300" role="alert">
          Could not send: {errDetail}
        </p>
      )}
    </div>
  );
}
