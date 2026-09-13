/**
 * Brand-made loading skeletons — gold-tinted, shimmering, immediately
 * familiar: header line, stat tiles, list cards. Used by client pages'
 * loading.tsx so every navigation paints instantly.
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* page title */}
      <SkeletonLine className="h-7 w-40" />

      {/* stat tiles */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="surface-card rounded-xl p-3.5">
          <SkeletonLine className="h-3 w-14" />
          <SkeletonLine className="mt-2.5 h-6 w-16" />
        </div>
        <div className="surface-card rounded-xl p-3.5">
          <SkeletonLine className="h-3 w-14" />
          <SkeletonLine className="mt-2.5 h-6 w-16" />
        </div>
        <div className="surface-card rounded-xl p-3.5">
          <SkeletonLine className="h-3 w-14" />
          <SkeletonLine className="mt-2.5 h-6 w-16" />
        </div>
      </div>

      {/* hero card */}
      <div className="surface-card mt-4 rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <SkeletonLine className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2.5">
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-3 w-1/2" />
          </div>
        </div>
      </div>

      {/* list rows */}
      <div className="mt-4 space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`surface-card flex items-center gap-3 rounded-xl p-3.5 stagger-${i + 1} animate-fade-up`}
          >
            <SkeletonLine className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-3.5 w-2/3" />
              <SkeletonLine className="h-2.5 w-1/3" />
            </div>
            <SkeletonLine className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
