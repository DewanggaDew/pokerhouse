"use client";

import { useMemo, useState } from "react";
import type { Player, SessionPhotoWithPlayer } from "@/lib/types";
import { MAX_PHOTOS_PER_PLAYER_PER_SESSION } from "@/lib/types";
import { deleteSessionPhoto, getPhotoPublicUrl } from "@/lib/photos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadPhotoDialog } from "@/components/upload-photo-dialog";
import { toast } from "sonner";

type Props = {
  sessionId: string;
  players: Player[];
  photos: SessionPhotoWithPlayer[];
  readOnly?: boolean;
  onChanged?: () => void;
};

export function SessionPhotos({
  sessionId,
  players,
  photos,
  readOnly = false,
  onChanged,
}: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [defaultPlayerId, setDefaultPlayerId] = useState<string | undefined>();
  const [lightbox, setLightbox] = useState<SessionPhotoWithPlayer | null>(null);

  const grouped = useMemo(() => {
    const byPlayer = new Map<string, SessionPhotoWithPlayer[]>();
    for (const photo of photos) {
      const list = byPlayer.get(photo.player_id) ?? [];
      list.push(photo);
      byPlayer.set(photo.player_id, list);
    }
    return players
      .map((p) => ({
        player: p,
        items: (byPlayer.get(p.id) ?? []).sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        ),
      }))
      .filter((group) => group.items.length > 0 || !readOnly);
  }, [photos, players, readOnly]);

  const totalPhotos = photos.length;
  const playersWithSpace = players.filter(
    (p) =>
      (grouped.find((g) => g.player.id === p.id)?.items.length ?? 0) <
      MAX_PHOTOS_PER_PLAYER_PER_SESSION
  );

  async function handleDelete(photo: SessionPhotoWithPlayer) {
    try {
      await deleteSessionPhoto(photo);
      toast.success("Photo removed");
      onChanged?.();
    } catch {
      toast.error("Failed to delete photo");
    }
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {totalPhotos} photo{totalPhotos !== 1 && "s"} ·{" "}
              {MAX_PHOTOS_PER_PLAYER_PER_SESSION} max per player
            </p>
          </div>
          <Button
            onClick={() => {
              setDefaultPlayerId(undefined);
              setUploadOpen(true);
            }}
            disabled={playersWithSpace.length === 0}
            size="sm"
          >
            Add Photo
          </Button>
        </div>
      )}

      {totalPhotos === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {readOnly
                ? "No photos for this session yet."
                : "No photos yet. Tap “Add Photo” to upload your first shot."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => {
            const used = group.items.length;
            const canAdd =
              !readOnly && used < MAX_PHOTOS_PER_PLAYER_PER_SESSION;
            return (
              <div key={group.player.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {group.player.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {used}/{MAX_PHOTOS_PER_PLAYER_PER_SESSION} photos
                    </p>
                  </div>
                  {canAdd && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDefaultPlayerId(group.player.id);
                        setUploadOpen(true);
                      }}
                    >
                      + Add
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((photo) => (
                    <PhotoTile
                      key={photo.id}
                      photo={photo}
                      onOpen={() => setLightbox(photo)}
                      onDelete={readOnly ? undefined : () => handleDelete(photo)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <UploadPhotoDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          sessionId={sessionId}
          players={players}
          photos={photos}
          defaultPlayerId={defaultPlayerId}
          onUploaded={() => {
            setUploadOpen(false);
            onChanged?.();
          }}
        />
      )}

      {lightbox && (
        <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  onOpen,
  onDelete,
}: {
  photo: SessionPhotoWithPlayer;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const url = getPhotoPublicUrl(photo.storage_path);
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full aspect-square"
        aria-label="Open photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={photo.caption ?? "Session photo"}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      </button>
      {photo.caption && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-xs text-white line-clamp-2">
          {photo.caption}
        </p>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus:opacity-100"
          aria-label="Delete photo"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function Lightbox({
  photo,
  onClose,
}: {
  photo: SessionPhotoWithPlayer;
  onClose: () => void;
}) {
  const url = getPhotoPublicUrl(photo.storage_path);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.caption ?? "Session photo"}
        className="max-h-full max-w-full rounded-md object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className="absolute inset-x-0 bottom-0 space-y-0.5 bg-gradient-to-t from-black/80 to-transparent p-4 text-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold">{photo.player.name}</p>
        {photo.caption && <p className="text-xs opacity-90">{photo.caption}</p>}
      </div>
    </div>
  );
}
