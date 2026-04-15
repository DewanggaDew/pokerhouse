"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (session: Session) => void;
};

export function CreateSessionDialog({ open, onOpenChange, onCreated }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [buyIn, setBuyIn] = useState("5");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Session name is required");
      return;
    }
    const buyInNum = parseFloat(buyIn);
    if (isNaN(buyInNum) || buyInNum <= 0) {
      toast.error("Buy-in must be a positive number");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        name: name.trim(),
        date,
        buy_in: buyInNum,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to create session");
      return;
    }

    setName("");
    setDate(today);
    setBuyIn("5");
    onCreated(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="e.g. Friday Night Poker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-date">Date</Label>
            <Input
              id="session-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-buyin">Buy-in (RM)</Label>
            <Input
              id="session-buyin"
              type="number"
              min="0.01"
              step="0.01"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
