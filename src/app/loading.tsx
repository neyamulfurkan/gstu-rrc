// src/app/loading.tsx
import { Skeleton } from "@/components/ui/Feedback";

export default function LoadingPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-[var(--color-bg-base)]">
      {/* Hero skeleton */}
      <Skeleton className="h-screen w-full" rounded="sm" />

      {/* Stats bar skeleton */}
      <div className="w-full mt-4 px-8">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" rounded="md" />
          <Skeleton className="h-24 w-full" rounded="md" />
          <Skeleton className="h-24 w-full" rounded="md" />
          <Skeleton className="h-24 w-full" rounded="md" />
        </div>
      </div>

      {/* Cards row skeleton */}
      <div className="grid grid-cols-3 gap-6 p-8">
        <Skeleton className="h-64 w-full" rounded="lg" />
        <Skeleton className="h-64 w-full" rounded="lg" />
        <Skeleton className="h-64 w-full" rounded="lg" />
      </div>
    </div>
  );
}