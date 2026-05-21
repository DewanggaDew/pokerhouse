"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { SessionPhotoWithPlayer, Session } from "@/lib/types";
import { getPhotoPublicUrl } from "@/lib/photos";
import { Card, CardContent } from "@/components/ui/card";

export type FeedPhoto = SessionPhotoWithPlayer & {
  session: Pick<Session, "id" | "name" | "date">;
};

const PAGE_SIZE = 20;

type Props = {
  initialPhotos: FeedPhoto[];
  initialHasMore: boolean;
};

export function FeedClient({ initialPhotos, initialHasMore }: Props) {
  const [photos, setPhotos] = useState<FeedPhoto[]>(initialPhotos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const { data } = await supabase
      .from("session_photos")
      .select("*, player:players(*), session:sessions(id,name,date)")
      .order("created_at", { ascending: false })
      .range(photos.length, photos.length + PAGE_SIZE - 1);

    const next = (data ?? []) as unknown as FeedPhoto[];
    setPhotos((prev) => [...prev, ...next]);
    setHasMore(next.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No photos yet. Upload a shot from any session to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 xl:columns-3">
        {photos.map((photo) => (
          <div key={photo.id} className="lg:mb-4 lg:break-inside-avoid">
            <FeedItem photo={photo} />
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 w-full rounded-md border py-3 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </>
  );
}

function FeedItem({ photo }: { photo: FeedPhoto }) {
  const url = getPhotoPublicUrl(photo.storage_path);
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{photo.player.name}</p>
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
      <div className="relative w-full bg-muted aspect-square max-h-[75vh]">
        <Image
          src={url}
          alt={photo.caption ?? "Session photo"}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
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
