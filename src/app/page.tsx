"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/types";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSessionDialog } from "@/components/create-session-dialog";
import { formatRMAmount } from "@/lib/calculations";

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <Button onClick={() => setDialogOpen(true)}>New Session</Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No sessions yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                Create your first session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                onClick={() => router.push(`/sessions/${session.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold truncate">{session.name}</h2>
                      <Badge
                        variant={
                          session.status === "active" ? "default" : "secondary"
                        }
                        className="shrink-0 text-xs"
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.date + "T00:00:00").toLocaleDateString(
                        "en-MY",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                      {" · "}
                      Buy-in {formatRMAmount(session.buy_in)}
                    </p>
                  </div>
                  <svg
                    className="h-5 w-5 text-muted-foreground shrink-0 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9 18 6-6-6-6"
                    />
                  </svg>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(session) => {
          setDialogOpen(false);
          router.push(`/sessions/${session.id}`);
        }}
      />
    </div>
  );
}
