import React from 'react';
import { PackageCardSkeleton } from './PackageCardSkeleton';

interface PackageCatalogSkeletonGridProps {
  count?: number;
  showCategorySkeleton?: boolean;
}

export const PackageCatalogSkeletonGrid: React.FC<PackageCatalogSkeletonGridProps> = ({
  count = 3,
  showCategorySkeleton = false,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-6 animate-fadeIn" aria-busy="true" aria-label="Chargement du catalogue de forfaits">
      {/* Optional filter tabs skeleton */}
      {showCategorySkeleton && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
          <div className="space-y-1">
            <div className="h-6 w-48 rounded-lg bg-stone-200 skeleton-shimmer" />
            <div className="h-3.5 w-72 rounded bg-stone-200 skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl w-fit">
            <div className="h-7 w-28 rounded-lg bg-stone-200 skeleton-shimmer" />
            <div className="h-7 w-24 rounded-lg bg-stone-200 skeleton-shimmer" />
            <div className="h-7 w-20 rounded-lg bg-stone-200 skeleton-shimmer" />
          </div>
        </div>
      )}

      {/* Grid of Skeleton Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((idx) => (
          <PackageCardSkeleton key={`pkg-skeleton-${idx}`} />
        ))}
      </div>
    </div>
  );
};
