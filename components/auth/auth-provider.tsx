"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/** Fetch only the public session after hydration; keep public pages prerenderable. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
