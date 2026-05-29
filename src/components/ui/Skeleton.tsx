import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-gradient-to-r from-bg-elevated via-bg-hover to-bg-elevated bg-[length:200%_100%]',
        className
      )}
      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
    />
  );
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-bg-card border border-border-default rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <KPISkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border-default rounded-xl p-6 h-80">
          <Skeleton className="h-5 w-32 mb-6" />
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="bg-bg-card border border-border-default rounded-xl p-6 h-80">
          <Skeleton className="h-5 w-32 mb-6" />
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
