import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import type { Session } from "@/lib/types";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRMAmount } from "@/lib/calculations";
import { autoCompleteStaleSessions } from "@/lib/auto-complete";
import { NewSessionButton } from "./new-session-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerSupabase();
  await autoCompleteStaleSessions(supabase);
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false });

  const sessions: Session[] = data ?? [];
  const activeSessions = sessions.filter((s) => s.status === "active");
  const pastSessions = sessions.filter((s) => s.status !== "active");

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <NewSessionButton />
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No sessions yet</p>
              <NewSessionButton variant="inline" />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {activeSessions.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Active
                </h2>
                <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  {activeSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </section>
            )}

            {pastSessions.length > 0 && (
              <section>
                {activeSessions.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Past
                  </h2>
                )}
                <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:grid-cols-3">
                  {pastSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  return (
    <Link href={`/sessions/${session.id}`} className="block">
      <Card className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted h-full">
        <CardContent className="flex items-center justify-between py-4 h-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold truncate">{session.name}</h2>
              <Badge
                variant={session.status === "active" ? "default" : "secondary"}
                className="shrink-0 text-xs"
              >
                {session.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(session.date + "T00:00:00").toLocaleDateString("en-MY", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
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
    </Link>
  );
}
