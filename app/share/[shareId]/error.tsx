"use client";

import { ReportErrorCard } from "@/components/report/report-error-card";

export default function ShareError({
  error,
  reset,
  retry,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  const onRetry = retry ?? reset;
  return (
    <ReportErrorCard
      error={error || "The shared report could not be retrieved. Try loading it again."}
      title="Unable to load this shared report"
      onRetry={onRetry}
      retryLabel="Try loading again"
      className="max-w-2xl"
    />
  );
}
