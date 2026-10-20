// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { RequestDeadlineError, withDeadline } from "../request-deadline";
import { requestSignal, withRequestBudget } from "../request-budget";
import { fetchDefaultBranch } from "../github/client";
import { requestAudit } from "../request-audit";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("aborts a stalled operation and removes its timer and parent listener", async () => {
  vi.useFakeTimers();
  const parent = new AbortController();
  const remove = vi.spyOn(parent.signal, "removeEventListener");
  let signal: AbortSignal | undefined;
  const task = withDeadline(20, parent.signal, (s) => { signal = s; return new Promise(() => {}); });
  const result = expect(task).rejects.toBeInstanceOf(RequestDeadlineError);
  await vi.advanceTimersByTimeAsync(20);
  await result;
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
});

it("propagates caller cancellation even when fetch ignores the signal", async () => {
  const parent = new AbortController();
  let signal: AbortSignal | undefined;
  const task = withDeadline(1000, parent.signal, (s) => { signal = s; return new Promise(() => {}); });
  const result = expect(task).rejects.toMatchObject({ name: "AbortError" });
  parent.abort();
  await result;
  expect(signal?.aborted).toBe(true);
});

it("inherits an outer budget and prevents subsequent work after it expires", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const task = withRequestBudget(20, undefined, () => withRequestBudget(1000, undefined, async () => {
    signal = requestSignal();
    await new Promise(() => {});
  }));
  const result = expect(task).rejects.toBeInstanceOf(RequestDeadlineError);
  await vi.advanceTimersByTimeAsync(20);
  await result;
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("bounds stalled GitHub response bodies and never retries an ambiguous network failure", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue(new Response(new ReadableStream({ start() {} }), {
    headers: { "content-type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetcher);
  const task = fetchDefaultBranch("owner", "repo");
  const result = expect(task).rejects.toMatchObject({ code: "timeout" });
  await vi.advanceTimersByTimeAsync(20_000);
  await result;
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("bounds browser body parsing, rather than just waiting for response headers", async () => {
  vi.useFakeTimers();
  const task = requestAudit({ owner: "owner", repo: "repo" }, {
    fetcher: vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }),
  });
  const result = expect(task).rejects.toBeInstanceOf(RequestDeadlineError);
  await vi.advanceTimersByTimeAsync(60_000);
  await result;
  expect(vi.getTimerCount()).toBe(0);
});
