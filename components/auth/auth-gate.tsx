"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";

/** Presentation only. Server mutations must independently authorize the session. */
export function AuthGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { status } = useSession();
  return status === "authenticated" ? children : fallback;
}
