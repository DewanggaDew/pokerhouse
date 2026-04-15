"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, Player, GameWithResults } from "@/lib/types";
import {
  calculatePlayerNets,
  calculateSettlements,
  formatRM,
  formatRMAmount,
} from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ shareCode: string }>;
};

export default function SharePage({ params }: Props) {
  const { shareCode } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [games, setGames] = useState<GameWithResults[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .eq("share_code", shareCode)
        .single();

      if (!sessionData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setSession(sessionData);

      const [gamesRes, playersRes] = await Promise.all([
        supabase
          .from("games")
          .select("*, game_results(*, player:players(*))")
          .eq("session_id", sessionData.id)
          .order("game_number"),
        supabase.from("players").select("*").order("name"),
      ]);

      if (gamesRes.data)
        setGames(gamesRes.data as unknown as GameWithResults[]);
      if (playersRes.data) setPlayers(playersRes.data);
      setLoading(false);
    }

    load();
  }, [shareCode]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold mb-2">Session Not Found</p>
            <p className="text-sm text-muted-foreground">
              This share link may have expired or is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const playerNets = calculatePlayerNets(games, players);
  const settlements = calculateSettlements(playerNets);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
            PokerHouse
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {session.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(session.date + "T00:00:00").toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            Buy-in {formatRMAmount(session.buy_in)}
          </p>
          <Badge
            variant={session.status === "active" ? "default" : "secondary"}
            className="mt-2"
          >
            {session.status}
          </Badge>
          {session.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {session.notes}
            </p>
          )}
        </div>

        {/* Standings */}
        {playerNets.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Standings</CardTitle>
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
            </CardContent>
          </Card>
        )}

        {/* Settlements */}
        {settlements.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Who Pays Whom</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {settlements.map((s, i) => (
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
            </CardContent>
          </Card>
        )}

        {/* Game Details */}
        {games.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Games
            </h2>
            {games.map((game) => {
              const winners = game.game_results.filter(
                (r) => r.result === "win"
              );
              const losers = game.game_results.filter(
                (r) => r.result === "loss"
              );
              return (
                <Card key={game.id}>
                  <CardContent className="py-4">
                    <h3 className="font-semibold mb-3">
                      Game {game.game_number}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
                          Winners
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
                          Losers
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
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8 pb-4">
          Powered by PokerHouse
        </p>
      </div>
    </div>
  );
}
