"use client";

import { trackEvent } from "@/lib/analytics";
import { useEffect, useRef } from "react";

const SESSION_KEY = "ss_visitor_session_sent";

/** One anonymous ping per browser tab session — loose “someone used the app” signal. */
export function VisitorPing() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      return;
    }
    sent.current = true;
    void trackEvent({ type: "visitor_session" });
  }, []);

  return null;
}
