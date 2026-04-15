"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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

    if (
      players.some(
        (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      toast.error("A player with this name already exists");
      return;
    }

    const { error } = await supabase
      .from("players")
      .update({ name: trimmed })
      .eq("id", id);

    if (error) {
      toast.error("Failed to rename player");
      return;
    }

    setEditingId(null);
    loadPlayers();
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
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Players</h1>

        <form onSubmit={addPlayer} className="flex gap-2 mb-6">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    </form>
                  ) : (
                    <>
                      <span className="font-medium">{player.name}</span>
                      <div className="flex items-center gap-1">
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
                          onClick={() => deletePlayer(player)}
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
            <p className="text-xs text-muted-foreground text-center pt-2">
              {players.length} player{players.length !== 1 && "s"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
