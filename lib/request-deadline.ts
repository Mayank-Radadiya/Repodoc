export const GITHUB_REQUEST_TIMEOUT_MS = 20_000;
export const READ_TIMEOUT_MS = 60_000;
export const REMEDIATION_TIMEOUT_MS = 240_000;

export class RequestDeadlineError extends Error {
  constructor(message = "The request timed out. Please try again.") {
    super(message);
    this.name = "RequestDeadlineError";
  }
}

/** Bound the whole operation, including body parsing and non-cooperative clients. */
export async function withDeadline<T>(
  milliseconds: number,
  parent: AbortSignal | undefined,
  action: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new RequestDeadlineError()), milliseconds);
  let rejectAbort: (() => void) | undefined;
  try {
    controller.signal.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    return await Promise.race([action(controller.signal), cancelled]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
