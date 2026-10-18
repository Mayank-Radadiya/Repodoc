"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./dashboard.module.css";

export function DashboardRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button className={`${styles.action} ${styles.primaryAction}`} disabled={pending}
        onClick={() => startTransition(() => router.refresh())}>
        <RotateCcw size={14} aria-hidden="true" className={pending ? "motion-safe:animate-spin" : undefined} />
        {pending ? "Retrying…" : "Retry"}
      </Button>
      <span role="status" className="sr-only">{pending ? "Reloading dashboard data…" : ""}</span>
    </>
  );
}
