import { Header } from "@/components/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-2xl px-4 lg:px-8 py-6">
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-4 w-56 mb-6" />

        <Skeleton className="h-8 w-full lg:max-w-2xl mb-6 rounded-lg" />

        <ListCardSkeleton rows={5} />
      </main>
    </div>
  );
}

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator />}
            <div className="flex items-center justify-between py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
