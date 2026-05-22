"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LEDGER_VIEW,
  type LedgerView,
  parseLedgerView,
} from "./ledger-view";

export function LedgerSections({
  initialView,
  unsettledCount,
  lifetime,
  balances,
  payments,
  unsettled,
}: {
  initialView: LedgerView;
  unsettledCount: number;
  lifetime: ReactNode;
  balances: ReactNode;
  payments: ReactNode;
  unsettled: ReactNode;
}) {
  const [view, setView] = useState<LedgerView>(initialView);

  const handleChange = (next: string | number | null) => {
    if (typeof next !== "string") return;
    const parsed = parseLedgerView(next);
    setView(parsed);

    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (parsed === DEFAULT_LEDGER_VIEW) {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", parsed);
    }
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <>
      <Tabs value={view} onValueChange={handleChange} className="mb-6">
        <TabsList className="w-full lg:max-w-2xl">
          <TabsTrigger value="lifetime" className="flex-1">
            Lifetime
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex-1">
            Balances
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1">
            Payments
          </TabsTrigger>
          <TabsTrigger value="unsettled" className="flex-1">
            Sessions{unsettledCount > 0 ? ` (${unsettledCount})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className={cn(view !== "lifetime" && "hidden")}>{lifetime}</div>
      <div className={cn(view !== "balances" && "hidden")}>{balances}</div>
      <div className={cn(view !== "payments" && "hidden")}>{payments}</div>
      <div className={cn(view !== "unsettled" && "hidden")}>{unsettled}</div>
    </>
  );
}
