import { Header } from "@/components/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-lg lg:max-w-7xl px-4 lg:px-8 py-6">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-8 w-44 mb-1" />
        <Skeleton className="h-4 w-40 mb-6" />

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:items-start">
            <RowsCard rows={5} />
            <RowsCard rows={4} />
          </div>
        </div>
      </main>
    </div>
  );
}

function RowsCard({ rows }: { rows: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
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
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
