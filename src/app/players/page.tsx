import { createServerSupabase } from "@/lib/supabase-server";
import type { Player } from "@/lib/types";
import { Header } from "@/components/header";
import { PlayersClient } from "./players-client";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("players").select("*").order("name");
  const players: Player[] = data ?? [];

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Players</h1>
        <PlayersClient initialPlayers={players} />
      </main>
    </div>
  );
}
