"use client";

import { supabase } from "@/lib/supabase";
import type {
  Session,
  PlayerNet,
  Settlement,
  SettlementTransaction,
} from "@/lib/types";
import { formatRMAmount } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Props = {
  session: Session;
  playerNets: PlayerNet[];
  calculatedSettlements: SettlementTransaction[];
  existingSettlements: Settlement[];
  onUpdate: () => void;
};

export function SettlementView({
  session,
  playerNets,
  calculatedSettlements,
  existingSettlements,
  onUpdate,
}: Props) {
  if (playerNets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No games played yet — nothing to settle.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function generateSettlements() {
    if (existingSettlements.length > 0) {
      const { error: delErr } = await supabase
        .from("settlements")
        .delete()
        .eq("session_id", session.id);
      if (delErr) {
        toast.error("Failed to clear existing settlements");
        return;
      }
    }

    const rows = calculatedSettlements.map((s) => ({
      session_id: session.id,
      from_player_id: s.from.id,
      to_player_id: s.to.id,
      amount: s.amount,
      settled: false,
    }));

    if (rows.length === 0) {
      toast.success("Everyone is even — no settlements needed");
      onUpdate();
      return;
    }

    const { error } = await supabase.from("settlements").insert(rows);
    if (error) {
      toast.error("Failed to create settlements");
      return;
    }

    toast.success("Settlements generated");
    onUpdate();
  }

  async function toggleSettled(settlement: Settlement) {
    const newSettled = !settlement.settled;
    const { error } = await supabase
      .from("settlements")
      .update({
        settled: newSettled,
        settled_at: newSettled ? new Date().toISOString() : null,
      })
      .eq("id", settlement.id);

    if (error) {
      toast.error("Failed to update settlement");
      return;
    }

    onUpdate();
  }

  if (existingSettlements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate settlement transactions to see who pays whom.
            <br />
            This minimizes the number of transfers needed.
          </p>

          {calculatedSettlements.length > 0 && (
            <div className="text-left space-y-2 border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Preview
              </p>
              {calculatedSettlements.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm py-1"
                >
                  <span className="font-medium">{s.from.name}</span>
                  <svg className="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                  <span className="font-medium">{s.to.name}</span>
                  <span className="font-mono tabular-nums ml-auto">
                    {formatRMAmount(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button onClick={generateSettlements}>Generate Settlements</Button>
        </CardContent>
      </Card>
    );
  }

  const allSettled = existingSettlements.every((s) => s.settled);
  const settledCount = existingSettlements.filter((s) => s.settled).length;

  const playerMap = new Map(playerNets.map((pn) => [pn.player.id, pn.player]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Settlements ({settledCount}/{existingSettlements.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={generateSettlements}>
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {existingSettlements.map((settlement) => {
          const fromPlayer = playerMap.get(settlement.from_player_id);
          const toPlayer = playerMap.get(settlement.to_player_id);
          return (
            <label
              key={settlement.id}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={settlement.settled}
                onCheckedChange={() => toggleSettled(settlement)}
              />
              <div className="flex items-center gap-2 flex-1 min-w-0 text-sm">
                <span className={settlement.settled ? "line-through text-muted-foreground" : "font-medium"}>
                  {fromPlayer?.name ?? "Unknown"}
                </span>
                <svg className="h-3 w-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <span className={settlement.settled ? "line-through text-muted-foreground" : "font-medium"}>
                  {toPlayer?.name ?? "Unknown"}
                </span>
              </div>
              <span className={`font-mono tabular-nums text-sm ${settlement.settled ? "text-muted-foreground line-through" : ""}`}>
                {formatRMAmount(settlement.amount)}
              </span>
            </label>
          );
        })}

        {allSettled && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            All settled!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
