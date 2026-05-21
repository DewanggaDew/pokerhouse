import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-14 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
