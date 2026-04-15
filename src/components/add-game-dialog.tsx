"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, Player } from "@/lib/types";
import { calculateGamePayouts } from "@/lib/calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRM } from "@/lib/calculations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  players: Player[];
  gameCount: number;
  onAdded: () => void;
};

type Step = "select-players" | "mark-losers" | "confirm";

export function AddGameDialog({
  open,
  onOpenChange,
  session,
  players,
  gameCount,
  onAdded,
}: Props) {
  const [step, setStep] = useState<Step>("select-players");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    new Set()
  );
  const [loserIds, setLoserIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep("select-players");
    setSelectedPlayerIds(new Set());
    setLoserIds(new Set());
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleLoser(id: string) {
    setLoserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToMarkLosers() {
    if (selectedPlayerIds.size < 2) {
      toast.error("Select at least 2 players");
      return;
    }
    setLoserIds(new Set());
    setStep("mark-losers");
  }

  function goToConfirm() {
    if (loserIds.size === 0) {
      toast.error("Mark at least 1 loser");
      return;
    }
    if (loserIds.size >= selectedPlayerIds.size) {
      toast.error("There must be at least 1 winner");
      return;
    }
    setStep("confirm");
  }

  const selectedPlayers = players.filter((p) => selectedPlayerIds.has(p.id));
  const losers = selectedPlayers.filter((p) => loserIds.has(p.id));
  const winners = selectedPlayers.filter((p) => !loserIds.has(p.id));
  const payouts =
    losers.length > 0 && winners.length > 0
      ? calculateGamePayouts(
          session.buy_in,
          losers.map((p) => p.id),
          winners.map((p) => p.id)
        )
      : [];

  async function saveGame() {
    setSaving(true);

    const { data: game, error: gameErr } = await supabase
      .from("games")
      .insert({
        session_id: session.id,
        game_number: gameCount + 1,
      })
      .select()
      .single();

    if (gameErr || !game) {
      toast.error("Failed to create game");
      setSaving(false);
      return;
    }

    const results = payouts.map((p) => ({
      game_id: game.id,
      player_id: p.playerId,
      result: p.result,
      amount: p.amount,
    }));

    const { error: resultErr } = await supabase
      .from("game_results")
      .insert(results);

    setSaving(false);

    if (resultErr) {
      await supabase.from("games").delete().eq("id", game.id);
      toast.error("Failed to save game results");
      return;
    }

    toast.success(`Game ${gameCount + 1} recorded`);
    reset();
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Game {gameCount + 1}
          </DialogTitle>
          <DialogDescription>
            {step === "select-players" && "Select who is playing this game"}
            {step === "mark-losers" && "Tap the players who lost"}
            {step === "confirm" && "Review and confirm"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Players */}
        {step === "select-players" && (
          <>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No players in roster. Add players first.
              </p>
            ) : (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedPlayerIds.size} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedPlayerIds.size === players.length) {
                        setSelectedPlayerIds(new Set());
                      } else {
                        setSelectedPlayerIds(
                          new Set(players.map((p) => p.id))
                        );
                      }
                    }}
                  >
                    {selectedPlayerIds.size === players.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
                {players.map((player) => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={selectedPlayerIds.has(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                    />
                    <span className="text-sm font-medium">{player.name}</span>
                  </label>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={goToMarkLosers}
                disabled={selectedPlayerIds.size < 2}
                className="w-full"
              >
                Next — Mark Losers
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Mark Losers */}
        {step === "mark-losers" && (
          <>
            <div className="space-y-2 py-2">
              <p className="text-xs text-muted-foreground mb-2">
                {loserIds.size} loser{loserIds.size !== 1 && "s"},{" "}
                {selectedPlayerIds.size - loserIds.size} winner
                {selectedPlayerIds.size - loserIds.size !== 1 && "s"}
              </p>
              {selectedPlayers.map((player) => {
                const isLoser = loserIds.has(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => toggleLoser(player.id)}
                    className={cn(
                      "flex items-center justify-between w-full rounded-lg border px-4 py-3 text-left transition-colors",
                      isLoser
                        ? "border-destructive/50 bg-destructive/5"
                        : "hover:bg-muted/50 active:bg-muted"
                    )}
                  >
                    <span className="text-sm font-medium">{player.name}</span>
                    <Badge variant={isLoser ? "destructive" : "secondary"}>
                      {isLoser ? "Loser" : "Winner"}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("select-players")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={goToConfirm}
                disabled={loserIds.size === 0 || loserIds.size >= selectedPlayerIds.size}
                className="flex-1"
              >
                Next — Confirm
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Winners ({winners.length})
                </p>
                {winners.map((p) => {
                  const payout = payouts.find((x) => x.playerId === p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{p.name}</span>
                      <span className="font-mono text-sm tabular-nums">
                        {payout ? formatRM(payout.amount) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Losers ({losers.length})
                </p>
                {losers.map((p) => {
                  const payout = payouts.find((x) => x.playerId === p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{p.name}</span>
                      <span className="font-mono text-sm tabular-nums text-destructive">
                        {payout ? formatRM(payout.amount) : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Balance</span>
                <span className="font-mono tabular-nums">
                  {formatRM(payouts.reduce((sum, p) => sum + p.amount, 0))}
                </span>
              </div>
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("mark-losers")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={saveGame}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Game"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
