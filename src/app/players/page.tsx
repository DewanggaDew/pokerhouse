"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const DeleteConfirmDialog = dynamic(
  () =>
    import("@/components/delete-confirm-dialog").then(
      (m) => m.DeleteConfirmDialog
    ),
  { ssr: false }
);

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    const { data } = await supabase
      .from("players")
      .select("*")
      .order("name");
    setPlayers(data ?? []);
    setLoading(false);
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (
      players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.error("A player with this name already exists");
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from("players")
      .insert({ name: trimmed });

    setAdding(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A player with this name already exists");
      } else {
        toast.error("Failed to add player");
      }
      return;
    }

    setNewName("");
    toast.success(`Added ${trimmed}`);
    loadPlayers();
  }

  async function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;

    const original = players.find((p) => p.id === id);
    if (original && original.name === trimmed) {
      setEditingId(null);
      return;
    }

    if (
      players.some(
        (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      toast.error("A player with this name already exists");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from("players")
      .update({ name: trimmed })
      .eq("id", id);
    setSavingEdit(false);

    if (error) {
      toast.error("Failed to rename player");
      return;
    }

    setEditingId(null);
    toast.success("Player renamed");
    loadPlayers();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function deletePlayer(player: Player) {
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", player.id);

    if (error) {
      if (error.code === "23503") {
        toast.error(
          `Cannot delete ${player.name} — they have game history. Rename instead.`
        );
      } else {
        toast.error("Failed to delete player");
      }
      return;
    }

    toast.success(`Removed ${player.name}`);
    loadPlayers();
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Players</h1>

        <form onSubmit={addPlayer} className="flex gap-2 mb-6 lg:max-w-md">
          <Input
            placeholder="Player name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={adding || !newName.trim()}>
            {adding ? "Adding..." : "Add"}
          </Button>
        </form>

        {loading ? (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No players yet. Add players above to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
            {players.map((player) => (
              <Card key={player.id}>
                <CardContent className="flex items-center justify-between py-3">
                  {editingId === player.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(player.id);
                      }}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-9"
                        autoFocus
                        disabled={savingEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0 text-primary"
                        disabled={savingEdit || !editName.trim()}
                        aria-label="Save name"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0 text-muted-foreground"
                        disabled={savingEdit}
                        onClick={cancelEdit}
                        aria-label="Cancel rename"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </form>
                  ) : (
                    <>
                      <Link
                        href={`/players/${player.id}`}
                        className="font-medium flex-1 min-w-0 truncate hover:underline"
                      >
                        {player.name}
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingId(player.id);
                            setEditName(player.name);
                          }}
                          aria-label={`Rename ${player.name}`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setPlayerToDelete(player)}
                          aria-label={`Delete ${player.name}`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!loading && players.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-4">
            {players.length} player{players.length !== 1 && "s"}
          </p>
        )}
      </main>

      <DeleteConfirmDialog
        open={playerToDelete !== null}
        onOpenChange={(open) => { if (!open) setPlayerToDelete(null); }}
        title="Remove player?"
        description={playerToDelete ? `Remove "${playerToDelete.name}" from your roster? Players with game history cannot be deleted — you'll see an error in that case.` : ""}
        confirmLabel="Remove"
        onConfirm={() => {
          if (!playerToDelete) return;
          const p = playerToDelete;
          setPlayerToDelete(null);
          void deletePlayer(p);
        }}
      />
    </div>
  );
}
