import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
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
  formatRMAmount,
} from "@/lib/calculations";
import { Header } from "@/components/header";
import { SessionClient } from "./session-client";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

async function loadSession(id: string) {
  const supabase = createServerSupabase();
  const [sessionRes, gamesRes, playersRes, settlementsRes, photosRes] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("games")
        .select("*, game_results(*, player:players(*))")
        .eq("session_id", id)
        .order("game_number"),
      supabase.from("players").select("*").order("name"),
      supabase.from("settlements").select("*").eq("session_id", id),
      supabase
        .from("session_photos")
        .select("*, player:players(*)")
        .eq("session_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (!sessionRes.data) return null;

  return {
    session: sessionRes.data as Session,
    games: (gamesRes.data ?? []) as unknown as GameWithResults[],
    players: (playersRes.data ?? []) as Player[],
    settlements: (settlementsRes.data ?? []) as Settlement[],
    photos: (photosRes.data ?? []) as unknown as SessionPhotoWithPlayer[],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadSession(id);
  if (!data) return { title: "Session not found · PokerHouse" };

  const { session } = data;
  return {
    title: `${session.name} · PokerHouse`,
    description: `Buy-in ${formatRMAmount(session.buy_in)} · ${session.status}`,
  };
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const data = await loadSession(id);

  if (!data) notFound();

  const { session, games, players, settlements, photos } = data;
  const playerNets = calculatePlayerNets(games, players);
  const calculatedSettlements = calculateSettlements(playerNets);

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <SessionClient
          session={session}
          games={games}
          players={players}
          settlements={settlements}
          photos={photos}
          playerNets={playerNets}
          calculatedSettlements={calculatedSettlements}
        />
      </main>
    </div>
  );
}
