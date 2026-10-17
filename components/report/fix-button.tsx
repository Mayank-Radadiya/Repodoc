"use client";

import { useId } from "react";
import { GitPullRequest } from "lucide-react";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import type { CheckResult } from "@/src/lib/types";

export function FixButton({ checks }: { checks: readonly CheckResult[] }) {
  const descriptionId = useId();
  if (
    !checks.some(
      (check) => !check.passed && check.remediation?.canAutomate === true,
    )
  ) {
    return null;
  }

  return (
    <AuthGate>
      <div className="flex max-w-60 flex-col gap-1.5">
        <Button disabled className="min-h-11" aria-describedby={descriptionId}>
          <GitPullRequest aria-hidden="true" />
          Fix All
        </Button>
        <p id={descriptionId} className="text-xs text-muted-foreground">
          Pull request creation is not available yet.
        </p>
      </div>
    </AuthGate>
  );
}
