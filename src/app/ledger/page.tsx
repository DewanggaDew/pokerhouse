"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Player, Session, GameWithResults, Settlement } from "@/lib/types";
import {
  calculatePlayerNets,
  calculateSettlements,
  formatRM,
  formatRMAmount,
} from "@/lib/calculations";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SessionWithGames = {
  session: Session;
  games: GameWithResults[];
  settlements: Settlement[];
};

type OverallPlayerStats = {
  player: Player;
  totalNet: number;
  unsettledNet: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  sessionsPlayed: number;
};

export default function LedgerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessionsData, setSessionsData] = useState<SessionWithGames[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [playersRes, sessionsRes, gamesRes, settlementsRes] =
        await Promise.all([
          supabase.from("players").select("*").order("name"),
          supabase
            .from("sessions")
            .select("*")
            .order("date", { ascending: false }),
          supabase
            .from("games")
            .select("*, game_results(*, player:players(*))")
            .order("game_number"),
          supabase.from("settlements").select("*"),
        ]);

      const allPlayers: Player[] = playersRes.data ?? [];
      const allSessions: Session[] = sessionsRes.data ?? [];
      const allGames = (gamesRes.data ?? []) as unknown as GameWithResults[];
      const allSettlements: Settlement[] = settlementsRes.data ?? [];

      const grouped: SessionWithGames[] = allSessions.map((session) => ({
        session,
        games: allGames.filter((g) => g.session_id === session.id),
        settlements: allSettlements.filter(
          (s) => s.session_id === session.id
        ),
      }));

      setPlayers(allPlayers);
      setSessionsData(grouped);
      setLoading(false);
    }

    load();
  }, []);

  const unsettledSessions = useMemo(
    () =>
      sessionsData.filter((sd) => {
        if (sd.games.length === 0) return false;
        if (sd.settlements.length === 0) return true;
        return sd.settlements.some((s) => !s.settled);
      }),
    [sessionsData]
  );

  const overallStats = useMemo(() => {
    const statsMap = new Map<string, OverallPlayerStats>();

    for (const player of players) {
      statsMap.set(player.id, {
        player,
        totalNet: 0,
        unsettledNet: 0,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        sessionsPlayed: 0,
      });
    }

    for (const sd of sessionsData) {
      const playerNets = calculatePlayerNets(sd.games, players);
      const hasUnsettled =
        sd.settlements.length === 0 ||
        sd.settlements.some((s) => !s.settled);

      for (const pn of playerNets) {
        const entry = statsMap.get(pn.player.id);
        if (!entry) continue;

        entry.totalNet += pn.net;
        entry.totalGames += pn.gamesPlayed;
        entry.totalWins += pn.wins;
        entry.totalLosses += pn.losses;
        entry.sessionsPlayed += 1;

        if (hasUnsettled && sd.games.length > 0) {
          if (sd.settlements.length === 0) {
            entry.unsettledNet += pn.net;
          } else {
            const settledForPlayer = sd.settlements
              .filter((s) => s.settled)
              .reduce((sum, s) => {
                if (s.from_player_id === pn.player.id) return sum - s.amount;
                if (s.to_player_id === pn.player.id) return sum + s.amount;
                return sum;
              }, 0);
            entry.unsettledNet += pn.net - settledForPlayer;
          }
        }
      }
    }

    return Array.from(statsMap.values())
      .filter((s) => s.totalGames > 0)
      .sort((a, b) => b.unsettledNet - a.unsettledNet);
  }, [sessionsData, players]);

  const overallSettlements = useMemo(() => {
    const pseudoNets = overallStats
      .filter((s) => Math.abs(s.unsettledNet) > 0.01)
      .map((s) => ({
        player: s.player,
        net: Math.round(s.unsettledNet * 100) / 100,
        gamesPlayed: s.totalGames,
        wins: s.totalWins,
        losses: s.totalLosses,
      }));
    return calculateSettlements(pseudoNets);
  }, [overallStats]);

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Ledger</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Unsettled balances across all sessions
        </p>

        {overallStats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No game data yet. Play some games first!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Unsettled Balances */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Outstanding Balances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {overallStats
                  .filter((s) => Math.abs(s.unsettledNet) > 0.01)
                  .sort((a, b) => b.unsettledNet - a.unsettledNet)
                  .map((stat, i) => (
                    <div key={stat.player.id}>
                      {i > 0 && <Separator />}
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{stat.player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stat.unsettledNet > 0 ? "is owed" : "owes"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "font-mono font-semibold tabular-nums",
                            stat.unsettledNet > 0
                              ? "text-foreground"
                              : "text-destructive"
                          )}
                        >
                          {formatRM(stat.unsettledNet)}
                        </span>
                      </div>
                    </div>
                  ))}
                {overallStats.every(
                  (s) => Math.abs(s.unsettledNet) < 0.01
                ) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All settled up!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Who Pays Whom (aggregated) */}
            {overallSettlements.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Who Pays Whom</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overallSettlements.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm py-1"
                    >
                      <span className="font-medium">{s.from.name}</span>
                      <svg
                        className="h-4 w-4 text-muted-foreground shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
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

            {/* Lifetime Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lifetime Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {overallStats.map((stat, i) => (
                  <div key={stat.player.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{stat.player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.sessionsPlayed}S · {stat.totalGames}G ·{" "}
                          {stat.totalWins}W · {stat.totalLosses}L
                        </p>
                      </div>
                      <span
                        className={cn(
                          "font-mono font-semibold tabular-nums",
                          stat.totalNet > 0
                            ? "text-foreground"
                            : stat.totalNet < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        )}
                      >
                        {formatRM(stat.totalNet)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Per-session Breakdown (unsettled only) */}
            {unsettledSessions.length > 0 && (
              <>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Unsettled Sessions
                </h2>
                {unsettledSessions.map((sd) => {
                  const playerNets = calculatePlayerNets(sd.games, players);
                  const unsettledCount =
                    sd.settlements.length === 0
                      ? null
                      : sd.settlements.filter((s) => !s.settled).length;

                  return (
                    <Link
                      key={sd.session.id}
                      href={`/sessions/${sd.session.id}`}
                    >
                      <Card className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">
                                {sd.session.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  sd.session.date + "T00:00:00"
                                ).toLocaleDateString("en-MY", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {" · "}
                                {sd.games.length} game
                                {sd.games.length !== 1 && "s"}
                                {" · "}
                                Buy-in {formatRMAmount(sd.session.buy_in)}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {unsettledCount !== null
                                ? `${unsettledCount} unsettled`
                                : "No settlements"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {playerNets.map((pn) => (
                              <div
                                key={pn.player.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>{pn.player.name}</span>
                                <span
                                  className={cn(
                                    "font-mono tabular-nums text-xs",
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
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
