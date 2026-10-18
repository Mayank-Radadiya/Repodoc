import styles from "./report.module.css";

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`rounded-md bg-muted motion-safe:animate-pulse ${className}`}
    />
  );
}

export function ReportPending({
  message = "Loading repository report…",
}: {
  message?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
        Repository health report
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <div aria-hidden="true" className="mt-6">
        <div className={styles.overview}>
          <div className={styles.summary}>
            <Skeleton className="h-6 w-40" />
            <div className="mt-[18px] flex items-center gap-5">
              <div className="size-[104px] shrink-0 rounded-full border-[6px] border-muted motion-safe:animate-pulse" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-4 w-full max-w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
            <div className={styles.checkSummary}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className={styles.rubric}>
            <Skeleton className="mb-5 h-5 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex min-h-11 items-center"><Skeleton className="h-5 w-full" /></div>
              ))}
            </div>
          </div>
          <div className="col-span-full border-t border-border px-6 py-4">
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <div className={styles.sectionBar}>
          <div className="flex min-h-12 items-center gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-12 sm:w-16" />)}
          </div>
        </div>
        <div className={styles.body}>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-6 h-11 w-64 max-w-full" />
            <Skeleton className="mt-4 h-11 w-full" />
            <div className="mt-5 divide-y divide-border">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="py-5">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rail}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className={styles.improvements}
              >
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-5 h-32 w-full" />
                <Skeleton className="mt-4 h-11 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
