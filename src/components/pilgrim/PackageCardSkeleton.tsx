import React from 'react';

interface PackageCardSkeletonProps {
  className?: string;
}

export const PackageCardSkeleton: React.FC<PackageCardSkeletonProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs flex flex-col h-full animate-pulse select-none ${className}`}
    >
      {/* Top Image Banner Skeleton */}
      <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-stone-200 skeleton-shimmer">
        {/* Top Badges Placeholders */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="h-6 w-24 rounded-lg bg-white/70 backdrop-blur-xs" />
          <div className="h-6 w-28 rounded-lg bg-white/60 backdrop-blur-xs" />
        </div>

        {/* Bottom Hero Info Placeholders */}
        <div className="absolute bottom-3 left-3 right-3 space-y-2">
          <div className="h-5 w-3/4 rounded-md bg-stone-300/80" />
          <div className="h-3.5 w-1/2 rounded-md bg-stone-300/60" />
        </div>
      </div>

      {/* Card Content Skeleton */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Unboxed Metadata Placeholders */}
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <div className="h-3.5 w-16 rounded bg-stone-200 skeleton-shimmer" />
          <span className="text-stone-300">·</span>
          <div className="h-3.5 w-24 rounded bg-stone-200 skeleton-shimmer" />
          <span className="text-stone-300">·</span>
          <div className="h-3.5 w-28 rounded bg-stone-200 skeleton-shimmer" />
        </div>

        {/* Hotels Proximity Section Skeleton */}
        <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-100">
          <div className="space-y-1.5">
            <div className="h-2.5 w-12 rounded bg-stone-200 skeleton-shimmer" />
            <div className="h-3.5 w-4/5 rounded bg-stone-200 skeleton-shimmer" />
            <div className="h-3 w-3/5 rounded bg-stone-200 skeleton-shimmer" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-12 rounded bg-stone-200 skeleton-shimmer" />
            <div className="h-3.5 w-4/5 rounded bg-stone-200 skeleton-shimmer" />
            <div className="h-3 w-3/5 rounded bg-stone-200 skeleton-shimmer" />
          </div>
        </div>

        {/* Room selection switcher Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 rounded bg-stone-200 skeleton-shimmer" />
            <div className="h-2.5 w-20 rounded bg-stone-200 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl">
            <div className="h-7 rounded-lg bg-stone-200/80 skeleton-shimmer" />
            <div className="h-7 rounded-lg bg-stone-200/80 skeleton-shimmer" />
            <div className="h-7 rounded-lg bg-stone-200/80 skeleton-shimmer" />
          </div>
        </div>

        {/* Inclusions Highlights Skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-stone-200 skeleton-shimmer shrink-0" />
            <div className="h-3 w-5/6 rounded bg-stone-200 skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-stone-200 skeleton-shimmer shrink-0" />
            <div className="h-3 w-3/4 rounded bg-stone-200 skeleton-shimmer" />
          </div>
        </div>

        {/* Pricing & Call-to-Action Footer Skeleton */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="space-y-1">
              <div className="h-2.5 w-24 rounded bg-stone-200 skeleton-shimmer" />
              <div className="h-6 w-32 rounded-lg bg-stone-200 skeleton-shimmer" />
            </div>
            <div className="h-3.5 w-20 rounded bg-stone-200 skeleton-shimmer" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-stone-200 skeleton-shimmer" />
            <div className="h-10 rounded-xl bg-stone-200 skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};
