import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-muted rounded-md ${className}`}
      role="status"
      aria-label="Chargement..."
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-3 border-b border-border">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-4 rounded" />
          <Skeleton className="w-16 h-3 rounded" />
        </div>
        <Skeleton className="w-full h-4 rounded" />
        <Skeleton className="w-3/4 h-4 rounded" />
      </div>
    </div>
  );
}

export function UserListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="w-32 h-4 rounded" />
            <Skeleton className="w-24 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SalonListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="w-40 h-4 rounded mb-2" />
            <Skeleton className="w-20 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-xl space-y-4">
      <Skeleton className="w-16 h-16 rounded-full mx-auto" />
      <Skeleton className="w-32 h-4 rounded mx-auto" />
      <Skeleton className="w-full h-3 rounded" />
      <Skeleton className="w-3/4 h-3 rounded mx-auto" />
      <Skeleton className="w-full h-10 rounded-lg" />
    </div>
  );
}
