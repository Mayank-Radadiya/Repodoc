import React from "react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 motion-safe:animate-pulse">
      {/* Profile Header Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="size-20 rounded-full bg-slate-200 sm:size-24" />
            <div className="space-y-3">
              <div className="h-7 w-48 rounded-lg bg-slate-200" />
              <div className="h-4 w-32 rounded-lg bg-slate-100" />
              <div className="h-4 w-72 rounded-lg bg-slate-100" />
            </div>
          </div>
          <div className="h-9 w-36 rounded-lg bg-slate-100" />
        </div>

        {/* Metric Cards Skeleton */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100/80 p-4" />
          ))}
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="h-24 rounded-2xl border border-slate-200/80 bg-white/70 p-4" />

      {/* Repositories Grid Skeleton */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl border border-slate-200/80 bg-white/80 p-5" />
        ))}
      </div>
    </div>
  );
}
