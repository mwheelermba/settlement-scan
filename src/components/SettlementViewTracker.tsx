"use client";

import { bumpLocalSettlementView } from "@/lib/local-metrics";
import { useEffect } from "react";

export function SettlementViewTracker() {
  useEffect(() => {
    bumpLocalSettlementView();
  }, []);
  return null;
}
