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
      <h1 className={styles.reportTitle}>Repository health report</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <div aria-hidden="true" className="mt-6">
        <div className={styles.overview}>
          <div className={styles.summary}>
            <div className={styles.scoreLine}>
              <div className="size-20 shrink-0 rounded-full border-[5px] border-muted motion-safe:animate-pulse" />
              <div className="min-w-0 space-y-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className={styles.checkSummary}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-7 w-10" />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rubric}>
            <div className={styles.categoryHeading}>
              <Skeleton className="h-4 w-32" />
            </div>
            <div className={styles.categoryGrid}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3 p-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="hidden h-6 w-12 sm:block" />
                  <Skeleton className="h-1 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.methodNote}>
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className={styles.sectionBar}>
          <div className="flex min-h-12 items-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-3 w-12 sm:w-16" />
            ))}
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.findingsPanel}>
            <div className="p-5 sm:p-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-5 h-11 w-64 max-w-full" />
              <Skeleton className="mt-3 h-11 w-full" />
            </div>
            <div className="divide-y divide-border border-t border-border px-5 sm:px-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="py-5">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rail}>
            {[0, 1].map((i) => (
              <div key={i} className={styles.improvements}>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-full" />
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
