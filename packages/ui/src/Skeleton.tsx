import React from 'react';
import { cn } from './utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80', className)}
      {...props}
    />
  );
}

export function TableRowSkeleton({
  columns = 5,
  rows = 5,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className={cn('border-b border-slate-100', className)}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="py-3.5 px-4">
              <Skeleton
                className={cn(
                  'h-4',
                  cIdx === 0
                    ? 'w-32'
                    : cIdx === columns - 1
                    ? 'w-16 ml-auto'
                    : 'w-24'
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl border border-slate-200/80 bg-white/70 animate-pulse space-y-3',
        className
      )}
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3.5 w-48" />
    </div>
  );
}

