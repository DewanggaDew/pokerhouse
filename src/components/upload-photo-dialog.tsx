"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Player, SessionPhoto } from "@/lib/types";
import { MAX_PHOTOS_PER_PLAYER_PER_SESSION } from "@/lib/types";
import { uploadSessionPhoto } from "@/lib/photos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  players: Player[];
  photos: SessionPhoto[];
  defaultPlayerId?: string;
  onUploaded: () => void;
};

export function UploadPhotoDialog({
  open,
  onOpenChange,
  sessionId,
  players,
  photos,
  defaultPlayerId,
  onUploaded,
}: Props) {
  const [playerId, setPlayerId] = useState<string>(defaultPlayerId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const countsByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of photos) {
      map.set(p.player_id, (map.get(p.player_id) ?? 0) + 1);
    }
    return map;
  }, [photos]);

  const eligiblePlayers = useMemo(
    () =>
      players.filter(
        (p) => (countsByPlayer.get(p.id) ?? 0) < MAX_PHOTOS_PER_PLAYER_PER_SESSION
      ),
    [players, countsByPlayer]
  );

  useEffect(() => {
    if (!open) return;
    // Start with no player selected ("") so the placeholder is shown and the
    // uploader has to consciously pick their own name. Only pre-fill when the
    // caller explicitly passed a defaultPlayerId (e.g. the "+ Add" button on a
    // specific player's row).
    setPlayerId(
      defaultPlayerId && eligiblePlayers.some((p) => p.id === defaultPlayerId)
        ? defaultPlayerId
        : ""
    );
    setFile(null);
    setCaption("");
  }, [open, defaultPlayerId, eligiblePlayers]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleUpload() {
    if (!playerId) {
      toast.error("Pick a player");
      return;
    }
    if (!file) {
      toast.error("Pick a photo");
      return;
    }
    setUploading(true);
    try {
      await uploadSessionPhoto({
        sessionId,
        playerId,
        file,
        caption,
      });
      toast.success("Photo uploaded");
      setFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload photo";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  const selectedPlayerCount =
    playerId ? countsByPlayer.get(playerId) ?? 0 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upload a photo</DialogTitle>
          <DialogDescription>
            {MAX_PHOTOS_PER_PLAYER_PER_SESSION} photos max per player per
            session, to keep storage light.
          </DialogDescription>
        </DialogHeader>

        {eligiblePlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Every player has already used their {MAX_PHOTOS_PER_PLAYER_PER_SESSION} photos
            for this session.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player">Player</Label>
              <Select
                value={playerId}
                onValueChange={(v) => setPlayerId(v ?? "")}
              >
                <SelectTrigger id="player" className="w-full">
                  {/* Base UI's <Select.Value> falls back to stringifying the
                      raw value when items aren't mounted, which would show
                      the player's UUID. Resolve the name manually instead. */}
                  <SelectValue placeholder="Select a player">
                    {(value) => {
                      if (!value) return "Select a player";
                      const p = players.find((x) => x.id === value);
                      return p ? p.name : "Select a player";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {eligiblePlayers.map((p) => {
                    const used = countsByPlayer.get(p.id) ?? 0;
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({used}/{MAX_PHOTOS_PER_PLAYER_PER_SESSION})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {playerId && (
                <p className="text-xs text-muted-foreground">
                  {selectedPlayerCount}/{MAX_PHOTOS_PER_PLAYER_PER_SESSION} used ·
                  {" "}
                  {MAX_PHOTOS_PER_PLAYER_PER_SESSION - selectedPlayerCount} left
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <input
                ref={fileInputRef}
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="flex w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {previewUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mt-2 w-full max-h-64 rounded-md object-cover border"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Images are automatically resized to save storage. Max 5 MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                placeholder="Bad beat on the river..."
                value={caption}
                maxLength={140}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || !playerId}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
