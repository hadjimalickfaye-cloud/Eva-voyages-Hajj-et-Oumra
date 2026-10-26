import React from 'react';

interface PackageListItemSkeletonProps {
  className?: string;
}

export const PackageListItemSkeleton: React.FC<PackageListItemSkeletonProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`p-4 rounded-2xl border-2 border-stone-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse select-none ${className}`}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Thumbnail skeleton */}
        <div className="w-16 h-16 rounded-xl bg-stone-200 skeleton-shimmer shrink-0" />

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-4 w-14 rounded bg-stone-200 skeleton-shimmer" />
            <div className="h-4 w-24 rounded bg-stone-200 skeleton-shimmer" />
          </div>
          <div className="h-4 w-48 rounded bg-stone-200 skeleton-shimmer" />
          <div className="h-3 w-64 rounded bg-stone-200 skeleton-shimmer" />
        </div>
      </div>

      <div className="text-right sm:shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 gap-1">
        <div className="h-2.5 w-16 rounded bg-stone-200 skeleton-shimmer" />
        <div className="h-5 w-28 rounded-lg bg-stone-200 skeleton-shimmer" />
        <div className="h-3 w-20 rounded bg-stone-200 skeleton-shimmer" />
      </div>
    </div>
  );
};
