import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import type {
  Session,
  Player,
  GameWithResults,
  SessionPhotoWithPlayer,
} from "@/lib/types";
import {
  calculatePlayerNets,
  calculateSettlements,
  formatRM,
  formatRMAmount,
} from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SessionPhotos } from "@/components/session-photos";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ shareCode: string }>;
};

async function loadShared(shareCode: string) {
  const supabase = createServerSupabase();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("share_code", shareCode)
    .single();

  if (!session) return null;

  const [gamesRes, playersRes, photosRes] = await Promise.all([
    supabase
      .from("games")
      .select("*, game_results(*, player:players(*))")
      .eq("session_id", session.id)
      .order("game_number"),
    supabase.from("players").select("*").order("name"),
    supabase
      .from("session_photos")
      .select("*, player:players(*)")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    session: session as Session,
    games: (gamesRes.data ?? []) as unknown as GameWithResults[],
    players: (playersRes.data ?? []) as Player[],
    photos: (photosRes.data ?? []) as unknown as SessionPhotoWithPlayer[],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareCode } = await params;
  const data = await loadShared(shareCode);
  if (!data) return { title: "Session not found · PokerHouse" };

  const { session } = data;
  const dateText = new Date(session.date + "T00:00:00").toLocaleDateString(
    "en-MY",
    { year: "numeric", month: "long", day: "numeric" }
  );
  const title = `${session.name} · PokerHouse`;
  const description = `Results from ${session.name} on ${dateText}. Buy-in ${formatRMAmount(session.buy_in)}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const { shareCode } = await params;
  const data = await loadShared(shareCode);

  if (!data) {
    notFound();
  }

  const { session, games, players, photos } = data;
  const playerNets = calculatePlayerNets(games, players);
  const settlements = calculateSettlements(playerNets);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
            PokerHouse
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
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

        {photos.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Photos ({photos.length})
            </h2>
            <SessionPhotos
              sessionId={session.id}
              players={players}
              photos={photos}
              readOnly
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8 pb-4">
          Powered by PokerHouse
        </p>
      </div>
    </div>
  );
}
