import { createServerSupabase } from "@/lib/supabase-server";
import { Header } from "@/components/header";
import { FeedClient, type FeedPhoto } from "./feed-client";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("session_photos")
    .select("*, player:players(*), session:sessions(id,name,date)")
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  const initialPhotos = (data ?? []) as unknown as FeedPhoto[];
  const initialHasMore = initialPhotos.length === PAGE_SIZE;

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Latest shots from the table.
          </p>
        </div>
        <FeedClient
          initialPhotos={initialPhotos}
          initialHasMore={initialHasMore}
        />
      </main>
    </div>
  );
}
