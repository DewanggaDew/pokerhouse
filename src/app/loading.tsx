import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-8">
          <section>
            <Skeleton className="h-4 w-16 mb-3" />
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {Array.from({ length: 2 }).map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          </section>
          <section>
            <Skeleton className="h-4 w-16 mb-3" />
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SessionCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-5 w-5 ml-2 rounded" />
      </CardContent>
    </Card>
  );
}
