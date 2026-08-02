import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-800/80 rounded-lg ${className}`}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse p-6 flex flex-col justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <Skeleton className="h-5 w-1/4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};
