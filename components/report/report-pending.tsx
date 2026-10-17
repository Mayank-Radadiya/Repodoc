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
      className="space-y-6"
    >
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Repository health report
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
          <div aria-hidden="true" className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="h-9 w-28 rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="h-9 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
          </div>
        </div>
        <div aria-hidden="true" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-muted motion-safe:animate-pulse" />
            <div className="h-8 w-64 max-w-full rounded-lg bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="h-6 w-32 rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-16 rounded-2xl border border-border bg-muted/50 motion-safe:animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
      >
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7 lg:col-span-2 lg:row-span-2">
          <div className="h-6 w-44 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-8 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-muted motion-safe:animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-muted motion-safe:animate-pulse" />
                  <div className="h-4 w-40 rounded bg-muted motion-safe:animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-muted motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card lg:col-start-3 lg:row-start-1">
          <div className="h-5 w-36 rounded bg-muted motion-safe:animate-pulse" />
          <div className="mt-5 flex flex-col items-center gap-4">
            <div className="size-44 rounded-full border-[12px] border-muted motion-safe:animate-pulse" />
            <div className="h-5 w-40 rounded bg-muted motion-safe:animate-pulse" />
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-muted motion-safe:animate-pulse" />
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card lg:col-start-3 lg:row-start-2">
          <div className="h-5 w-36 rounded bg-muted motion-safe:animate-pulse" />
          <div className="mt-4 h-20 rounded-2xl bg-muted/60 motion-safe:animate-pulse" />
          <div className="mt-4 h-10 w-32 rounded-lg bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
