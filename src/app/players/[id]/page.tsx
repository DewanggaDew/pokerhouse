"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Player, Session, GameWithResults } from "@/lib/types";
import { calculateHeadToHead, formatRM } from "@/lib/calculations";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

type SessionNet = {
  session: Session;
  net: number;
};

export default function PlayerDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [games, setGames] = useState<GameWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const [playerRes, playersRes, sessionsRes, gamesRes] = await Promise.all([
        supabase.from("players").select("*").eq("id", id).maybeSingle(),
        supabase.from("players").select("*").order("name"),
        supabase
          .from("sessions")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("games")
          .select("*, game_results(*, player:players(*))")
          .order("game_number"),
      ]);

      if (!playerRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPlayer(playerRes.data);
      setAllPlayers(playersRes.data ?? []);
      setSessions(sessionsRes.data ?? []);
      setGames((gamesRes.data ?? []) as unknown as GameWithResults[]);
      setLoading(false);
    }
    load();
  }, [id]);

  const playedGames = useMemo(
    () =>
      games.filter((g) =>
        g.game_results.some((r) => r.player_id === id)
      ),
    [games, id]
  );

  const summary = useMemo(() => {
    let totalGames = 0;
    let wins = 0;
    let losses = 0;
    let totalNet = 0;
    const sessionNetMap = new Map<string, number>();

    for (const game of playedGames) {
      const result = game.game_results.find((r) => r.player_id === id);
      if (!result) continue;
      totalGames += 1;
      if (result.result === "win") wins += 1;
      else losses += 1;
      totalNet += result.amount;
      sessionNetMap.set(
        game.session_id,
        (sessionNetMap.get(game.session_id) ?? 0) + result.amount
      );
    }

    const sessionNets: SessionNet[] = Array.from(sessionNetMap.entries())
      .map(([sessionId, net]) => {
        const session = sessions.find((s) => s.id === sessionId);
        return session ? { session, net } : null;
      })
      .filter((x): x is SessionNet => x !== null)
      .sort(
        (a, b) =>
          new Date(b.session.date).getTime() -
          new Date(a.session.date).getTime()
      );

    const sessionsPlayed = sessionNets.length;
    const winningSessions = sessionNets.filter((s) => s.net > 0).length;
    const losingSessions = sessionNets.filter((s) => s.net < 0).length;
    const avgNetPerSession = sessionsPlayed > 0 ? totalNet / sessionsPlayed : 0;
    const winrate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return {
      totalGames,
      wins,
      losses,
      winrate,
      totalNet,
      sessionsPlayed,
      avgNetPerSession,
      winningSessions,
      losingSessions,
      sessionNets,
    };
  }, [playedGames, sessions, id]);

  const headToHead = useMemo(() => {
    return calculateHeadToHead(id, playedGames, allPlayers).sort((a, b) => {
      const aRate = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
      const bRate = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
      if (bRate !== aRate) return bRate - aRate;
      return b.sharedGames - a.sharedGames;
    });
  }, [id, playedGames, allPlayers]);

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">Player not found.</p>
              <Button variant="outline" onClick={() => router.push("/players")}>
                Back to players
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <Link
          href="/players"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15 18-6-6 6-6"
            />
          </svg>
          Players
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          {player.name}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {summary.sessionsPlayed} session
          {summary.sessionsPlayed !== 1 && "s"} · {summary.totalGames} game
          {summary.totalGames !== 1 && "s"}
        </p>

        {summary.totalGames === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No game history yet for {player.name}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Headline stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatBlock
                  label="Winrate"
                  value={`${summary.winrate.toFixed(1)}%`}
                  sub={`${summary.wins}W · ${summary.losses}L`}
                />
                <StatBlock
                  label="Total net"
                  value={formatRM(summary.totalNet)}
                  tone={
                    summary.totalNet > 0
                      ? "good"
                      : summary.totalNet < 0
                        ? "bad"
                        : "muted"
                  }
                  sub={`across ${summary.totalGames} game${summary.totalGames !== 1 ? "s" : ""}`}
                />
                <StatBlock
                  label="Avg / session"
                  value={formatRM(summary.avgNetPerSession)}
                  tone={
                    summary.avgNetPerSession > 0
                      ? "good"
                      : summary.avgNetPerSession < 0
                        ? "bad"
                        : "muted"
                  }
                  sub={`over ${summary.sessionsPlayed} session${summary.sessionsPlayed !== 1 ? "s" : ""}`}
                />
                <StatBlock
                  label="Session record"
                  value={`${summary.winningSessions} / ${summary.losingSessions}`}
                  sub="winning / losing"
                />
              </CardContent>
            </Card>

            <div
              className={cn(
                "space-y-6",
                headToHead.length > 0 &&
                  "lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:items-start"
              )}
            >
            {/* Head to head */}
            {headToHead.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Head to Head</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Win rate when {player.name} and the opponent are in the
                    same game (ties excluded).
                  </p>
                </CardHeader>
                <CardContent className="space-y-0">
                  {headToHead.map((h2h, i) => {
                    const decisive = h2h.wins + h2h.losses;
                    const rate =
                      decisive > 0 ? (h2h.wins / decisive) * 100 : null;
                    return (
                      <div key={h2h.opponent.id}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center justify-between py-3 gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {h2h.opponent.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {h2h.wins}W · {h2h.losses}L
                              {decisive < h2h.sharedGames &&
                                ` · ${h2h.sharedGames - decisive} tied`}
                              {" · "}
                              {h2h.sharedGames} shared game
                              {h2h.sharedGames !== 1 && "s"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "font-mono font-semibold tabular-nums shrink-0",
                              rate === null
                                ? "text-muted-foreground"
                                : rate > 50
                                  ? "text-foreground"
                                  : rate < 50
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                            )}
                          >
                            {rate === null ? "—" : `${rate.toFixed(0)}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Per session history */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Session History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {summary.sessionNets.map((sn, i) => (
                  <div key={sn.session.id}>
                    {i > 0 && <Separator />}
                    <Link
                      href={`/sessions/${sn.session.id}`}
                      className="flex items-center justify-between py-3 gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {sn.session.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            sn.session.date + "T00:00:00"
                          ).toLocaleDateString("en-MY", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "font-mono font-semibold tabular-nums shrink-0",
                          sn.net > 0
                            ? "text-foreground"
                            : sn.net < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        )}
                      >
                        {formatRM(sn.net)}
                      </span>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | "muted" | "neutral";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-xl font-semibold font-mono tabular-nums mt-1",
          tone === "good" && "text-foreground",
          tone === "bad" && "text-destructive",
          tone === "muted" && "text-muted-foreground"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      )}
    </div>
  );
}
