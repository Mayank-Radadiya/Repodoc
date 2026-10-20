import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { withDeadline } from "./request-deadline";

const requests = new AsyncLocalStorage<AbortSignal>();

export function requestSignal(signal?: AbortSignal | null): AbortSignal | undefined {
  const budget = requests.getStore();
  return budget && signal ? AbortSignal.any([budget, signal]) : budget ?? signal ?? undefined;
}

/** Nested services inherit the route's deadline instead of extending it. */
export function withRequestBudget<T>(
  milliseconds: number,
  signal: AbortSignal | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const parent = requestSignal(signal);
  return withDeadline(milliseconds, parent, (deadline) => requests.run(deadline, action));
}
