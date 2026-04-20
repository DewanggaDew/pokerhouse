"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { SessionPhotoWithPlayer, Session } from "@/lib/types";
import { getPhotoPublicUrl } from "@/lib/photos";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";

type FeedPhoto = SessionPhotoWithPlayer & {
  session: Pick<Session, "id" | "name" | "date">;
};

const PAGE_SIZE = 20;

export default function FeedPage() {
  const [photos, setPhotos] = useState<FeedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPage(0);
  }, []);

  async function loadPage(offset: number) {
    const { data } = await supabase
      .from("session_photos")
      .select("*, player:players(*), session:sessions(id,name,date)")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const next = (data ?? []) as unknown as FeedPhoto[];
    setPhotos((prev) => (offset === 0 ? next : [...prev, ...next]));
    setHasMore(next.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    await loadPage(photos.length);
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Latest shots from the table.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No photos yet. Upload a shot from any session to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {photos.map((photo) => (
              <FeedItem key={photo.id} photo={photo} />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-md border py-3 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FeedItem({ photo }: { photo: FeedPhoto }) {
  const url = getPhotoPublicUrl(photo.storage_path);
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {photo.player.name}
          </p>
          <Link
            href={`/sessions/${photo.session.id}`}
            className="text-xs text-muted-foreground hover:text-foreground truncate block"
          >
            {photo.session.name} ·{" "}
            {new Date(photo.session.date + "T00:00:00").toLocaleDateString(
              "en-MY",
              { month: "short", day: "numeric", year: "numeric" }
            )}
          </Link>
        </div>
        <time
          dateTime={photo.created_at}
          className="text-xs text-muted-foreground shrink-0"
        >
          {formatRelative(photo.created_at)}
        </time>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.caption ?? "Session photo"}
        loading="lazy"
        className="w-full max-h-[75vh] object-cover bg-muted"
      />
      {photo.caption && (
        <CardContent className="py-3">
          <p className="text-sm">
            <span className="font-semibold">{photo.player.name}</span>{" "}
            <span className="text-muted-foreground">{photo.caption}</span>
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(1, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(iso).toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
  });
}
