"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, Player, GameWithResults } from "@/lib/types";
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
  // When provided, the dialog switches to "edit" mode: it pre-fills the
  // selected players + losers from the existing game and calls the
  // update_game_results RPC on save instead of insert_game_with_results.
  editingGame?: GameWithResults | null;
  /** Latest game in this session — used to offer “same lineup” when adding another game */
  lastGame?: GameWithResults | null;
};

type Step = "select-players" | "mark-losers" | "confirm";

export function AddGameDialog({
  open,
  onOpenChange,
  session,
  players,
  gameCount,
  onAdded,
  editingGame,
  lastGame,
}: Props) {
  const isEditing = !!editingGame;
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

  // Sync local state with the `editingGame` prop whenever the dialog opens.
  // We key the effect on `open` + the game id so reopening the same dialog
  // after a save reloads a fresh snapshot of the game's results (e.g. if
  // another device edited it in the meantime).
  useEffect(() => {
    if (!open) return;
    if (editingGame) {
      setSelectedPlayerIds(
        new Set(editingGame.game_results.map((r) => r.player_id))
      );
      setLoserIds(
        new Set(
          editingGame.game_results
            .filter((r) => r.result === "loss")
            .map((r) => r.player_id)
        )
      );
      setStep("select-players");
    } else {
      reset();
    }
  }, [open, editingGame]);

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

  function applyLastGameLineupAndGoToLosers() {
    if (!lastGame) return;
    const rosterIds = new Set(players.map((p) => p.id));
    const ids = lastGame.game_results
      .map((r) => r.player_id)
      .filter((id) => rosterIds.has(id));
    if (ids.length < 2) {
      toast.error(
        "That lineup needs at least 2 players still on your roster. Pick players manually."
      );
      return;
    }
    setSelectedPlayerIds(new Set(ids));
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
    if (saving) return;
    setSaving(true);

    const results = payouts.map((p) => ({
      player_id: p.playerId,
      result: p.result,
      amount: p.amount,
    }));

    // Both RPCs live in supabase/games.sql and share the same per-session
    // advisory lock, so concurrent add/edit operations on the same session
    // serialize safely and we never leave an orphan or empty game row.
    const { data, error } = editingGame
      ? await supabase.rpc("update_game_results", {
          p_game_id: editingGame.id,
          p_results: results,
        })
      : await supabase.rpc("insert_game_with_results", {
          p_session_id: session.id,
          p_results: results,
        });

    setSaving(false);

    if (error) {
      const message =
        error.message ||
        error.details ||
        (editingGame ? "Failed to update game" : "Failed to create game");
      toast.error(message);
      return;
    }

    const savedNumber =
      (data as { game_number?: number } | null)?.game_number ??
      editingGame?.game_number ??
      gameCount + 1;
    toast.success(
      editingGame ? `Game ${savedNumber} updated` : `Game ${savedNumber} recorded`
    );
    reset();
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit Game ${editingGame!.game_number}`
              : `Add Game ${gameCount + 1}`}
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
                {!isEditing && lastGame && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full h-auto py-3 flex flex-col gap-0.5"
                    onClick={applyLastGameLineupAndGoToLosers}
                  >
                    <span className="font-medium">
                      Same lineup as Game {lastGame.game_number}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground leading-snug">
                      Skip player selection — same group, mark losers next
                    </span>
                  </Button>
                )}
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
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Save Game"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
