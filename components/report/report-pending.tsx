import styles from "./report.module.css";

export function ReportPending({
  message = "Loading repository report…",
}: {
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="space-y-8"
    >
      <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 space-y-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Repository health report
          </h1>
          <p className={`${styles.secondary} text-base`}>
            {message}
          </p>
          <div
            aria-hidden="true"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm pt-2"
          >
            <div className="h-5 w-24 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-5 w-32 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-slate-200 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:grid-rows-[min-content_1fr]"
      >
        {/* Category Breakdown Skeleton (Left) */}
        <div
          className={`${styles.surface} p-5 sm:p-7 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="h-7 w-48 rounded-lg bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-slate-100 motion-safe:animate-pulse" />
          </div>
          <div className="space-y-4">
            {[
              "Documentation",
              "Project Hygiene",
              "Testing & CI/CD",
              "Community & Metadata",
              "Security Baseline",
            ].map((category, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-5 rounded bg-slate-200 motion-safe:animate-pulse" />
                    <div className="h-5 w-36 rounded bg-slate-200 motion-safe:animate-pulse" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-slate-200 motion-safe:animate-pulse" />
                </div>
                {index === 0 && (
                  <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                    <div className="h-4 w-3/4 rounded bg-slate-200/70 motion-safe:animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-slate-200/70 motion-safe:animate-pulse" />
                    <div className="h-4 w-1/2 rounded bg-slate-200/70 motion-safe:animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Health Score Gauge Skeleton (Top Right) */}
        <section
          className={`${styles.surface} p-6 lg:col-start-3 lg:row-start-1`}
        >
          <div className="h-6 w-36 rounded-md bg-slate-200 motion-safe:animate-pulse" />
          <div className="mt-6 flex flex-col items-center gap-5 pb-2">
            <div className="relative flex size-44 items-center justify-center rounded-full border-[12px] border-slate-100 bg-transparent motion-safe:animate-pulse">
              <div className="h-10 w-16 rounded-md bg-slate-200" />
            </div>
            <div className="h-5 w-40 rounded bg-slate-200 motion-safe:animate-pulse" />
          </div>
          <div className="mt-4 space-y-2 pt-2">
            <div className="h-3.5 w-full rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </section>

        {/* Badge Embed Skeleton (Bottom Right) */}
        <div
          className={`${styles.surface} min-w-0 p-6 lg:col-start-3 lg:row-start-2`}
        >
          <div className="h-6 w-36 rounded-md bg-slate-200 motion-safe:animate-pulse" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-20 rounded-md bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-8 w-16 rounded-md bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-slate-100 motion-safe:animate-pulse" />
          </div>
          <div className="mt-4 h-24 w-full rounded-lg bg-slate-100 motion-safe:animate-pulse" />
          <div className="mt-4 h-10 w-28 rounded-md bg-slate-200 motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
