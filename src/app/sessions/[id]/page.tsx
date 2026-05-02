"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  Session,
  Player,
  GameWithResults,
  Settlement,
  SessionPhotoWithPlayer,
} from "@/lib/types";
import {
  calculatePlayerNets,
  calculateSettlements,
  formatRM,
  formatRMAmount,
} from "@/lib/calculations";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddGameDialog } from "@/components/add-game-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { SessionNotesDialog } from "@/components/session-notes-dialog";
import { SettlementView } from "@/components/settlement-view";
import { SessionPhotos } from "@/components/session-photos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default function SessionPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [games, setGames] = useState<GameWithResults[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [photos, setPhotos] = useState<SessionPhotoWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithResults | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [sessionRes, gamesRes, playersRes, settlementsRes, photosRes] =
      await Promise.all([
        supabase.from("sessions").select("*").eq("id", id).single(),
        supabase
          .from("games")
          .select("*, game_results(*, player:players(*))")
          .eq("session_id", id)
          .order("game_number"),
        supabase.from("players").select("*").order("name"),
        supabase
          .from("settlements")
          .select("*")
          .eq("session_id", id),
        supabase
          .from("session_photos")
          .select("*, player:players(*)")
          .eq("session_id", id)
          .order("created_at", { ascending: true }),
      ]);

    if (sessionRes.data) setSession(sessionRes.data);
    if (gamesRes.data) setGames(gamesRes.data as unknown as GameWithResults[]);
    if (playersRes.data) setPlayers(playersRes.data);
    if (settlementsRes.data) setSettlements(settlementsRes.data);
    if (photosRes.data)
      setPhotos(photosRes.data as unknown as SessionPhotoWithPlayer[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function deleteGame(gameId: string) {
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) {
      toast.error("Failed to delete game");
      return;
    }
    toast.success("Game deleted");
    loadData();
  }

  async function toggleStatus() {
    if (!session) return;
    const newStatus = session.status === "active" ? "completed" : "active";
    const { error } = await supabase
      .from("sessions")
      .update({ status: newStatus })
      .eq("id", session.id);

    if (error) {
      toast.error("Failed to update session");
      return;
    }

    setSession({ ...session, status: newStatus });
    toast.success(
      newStatus === "completed" ? "Session completed" : "Session reopened"
    );
  }

  async function deleteSession() {
    if (!session) return;
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", session.id);

    if (error) {
      toast.error("Failed to delete session");
      return;
    }

    toast.success("Session deleted");
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded-lg" />
            <div className="h-40 bg-muted animate-pulse rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6 text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </main>
      </div>
    );
  }

  const playerNets = calculatePlayerNets(games, players);
  const calculatedSettlements = calculateSettlements(playerNets);

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
        {/* Session Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {session.name}
            </h1>
            <Badge
              variant={session.status === "active" ? "default" : "secondary"}
            >
              {session.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(session.date + "T00:00:00").toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            Buy-in {formatRMAmount(session.buy_in)}
          </p>
          {session.notes && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              {session.notes}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {session.status === "active" && (
            <Button
              onClick={() => {
                setEditingGame(null);
                setAddGameOpen(true);
              }}
            >
              Add Game
            </Button>
          )}
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            Share
          </Button>
          <Button variant="outline" onClick={() => setNotesOpen(true)}>
            Notes
          </Button>
          <Button variant="outline" onClick={toggleStatus}>
            {session.status === "active" ? "Complete" : "Reopen"}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={deleteSession}
          >
            Delete
          </Button>
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
            <TabsTrigger value="games" className="flex-1">
              Games ({games.length})
            </TabsTrigger>
            <TabsTrigger value="settle" className="flex-1">
              Settle
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">
              Photos ({photos.length})
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary">
            {playerNets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No games played yet. Add a game to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Player Standings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {playerNets.map((pn, i) => (
                    <div key={pn.player.id}>
                      {i > 0 && <Separator />}
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{pn.player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pn.gamesPlayed}G · {pn.wins}W · {pn.losses}L
                          </p>
                        </div>
                        <span
                          className={cn(
                            "font-mono font-semibold tabular-nums",
                            pn.net > 0
                              ? "text-foreground"
                              : pn.net < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          )}
                        >
                          {formatRM(pn.net)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">
                      Balance Check
                    </span>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatRM(
                        Math.round(
                          playerNets.reduce((sum, pn) => sum + pn.net, 0) * 100
                        ) / 100
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-3">
            {games.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No games yet</p>
                </CardContent>
              </Card>
            ) : (
              games.map((game) => {
                const winners = game.game_results.filter(
                  (r) => r.result === "win"
                );
                const losers = game.game_results.filter(
                  (r) => r.result === "loss"
                );
                return (
                  <Card key={game.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          Game {game.game_number}
                        </h3>
                        {session.status === "active" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingGame(game);
                                setAddGameOpen(true);
                              }}
                              aria-label="Edit game"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.79l-4 1 1-4L16.862 4.487Z" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteGame(game.id)}
                              aria-label="Delete game"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                            Winners ({winners.length})
                          </p>
                          {winners.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between py-0.5"
                            >
                              <span>{r.player.name}</span>
                              <span className="font-mono tabular-nums text-xs">
                                {formatRM(r.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                            Losers ({losers.length})
                          </p>
                          {losers.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between py-0.5"
                            >
                              <span>{r.player.name}</span>
                              <span className="font-mono tabular-nums text-xs text-destructive">
                                {formatRM(r.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Settle Tab */}
          <TabsContent value="settle">
            <SettlementView
              session={session}
              playerNets={playerNets}
              calculatedSettlements={calculatedSettlements}
              existingSettlements={settlements}
              onUpdate={loadData}
            />
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <SessionPhotos
              sessionId={session.id}
              players={players}
              photos={photos}
              onChanged={loadData}
            />
          </TabsContent>
        </Tabs>
      </main>

      <AddGameDialog
        open={addGameOpen}
        onOpenChange={(open) => {
          setAddGameOpen(open);
          // Clear edit target once the dialog is closed so reopening via
          // "Add Game" starts fresh instead of reusing the last edit state.
          if (!open) setEditingGame(null);
        }}
        session={session}
        players={players}
        gameCount={games.length}
        lastGame={
          games.length > 0 ? games[games.length - 1] : null
        }
        editingGame={editingGame}
        onAdded={() => {
          setAddGameOpen(false);
          setEditingGame(null);
          loadData();
        }}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareCode={session.share_code}
      />

      <SessionNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        session={session}
        onSaved={(notes) => {
          setSession({ ...session, notes });
          setNotesOpen(false);
        }}
      />
    </div>
  );
}
