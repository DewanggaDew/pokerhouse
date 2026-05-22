import type { SupabaseClient } from "@supabase/supabase-js";

const STALE_MS = 24 * 60 * 60 * 1000;

type ActiveSessionRow = {
  id: string;
  created_at: string;
  games: { created_at: string }[];
};

export async function autoCompleteStaleSessions(
  supabase: SupabaseClient
): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, created_at, games(created_at)")
    .eq("status", "active");

  if (error || !data) return;

  const now = Date.now();
  const staleIds = (data as ActiveSessionRow[])
    .filter((s) => {
      const lastGameMs = s.games.reduce(
        (max, g) => Math.max(max, new Date(g.created_at).getTime()),
        0
      );
      const lastActivityMs = Math.max(
        lastGameMs,
        new Date(s.created_at).getTime()
      );
      return now - lastActivityMs >= STALE_MS;
    })
    .map((s) => s.id);

  if (staleIds.length === 0) return;

  await supabase
    .from("sessions")
    .update({ status: "completed" })
    .in("id", staleIds);
}
