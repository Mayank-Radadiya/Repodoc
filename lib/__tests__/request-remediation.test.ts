import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RemediationRequestError,
  requestRemediation,
  type RemediationRequest,
} from "../request-remediation";

const input: RemediationRequest = {
  owner: "owner",
  repo: "repo",
  fixes: ["gitignore"],
};
const result = {
  prUrl: "https://github.com/owner/repo/pull/42",
  filesCreated: [".gitignore"],
};
afterEach(() => vi.useRealTimers());

it("posts only selected template inputs with cookies and an abort signal", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(result));
  const signal = new AbortController().signal;
  expect(
    await requestRemediation(
      {
        ...input,
        fixes: ["gitignore", "gitignore"],
        licenseChoice: "MIT",
        licenseFullName: "unused",
        codeOfConductContact: "unused",
      },
      { fetcher, signal },
    ),
  ).toEqual(result);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/remediate",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(input);
});
it("trims and forwards explicit template inputs", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(result));
  const selection: RemediationRequest = {
    ...input,
    fixes: ["license", "code-of-conduct"],
    licenseChoice: "GPL-3.0-only",
    licenseFullName: "  Holder  ",
    codeOfConductContact: "  contact@example.test  ",
  };
  await requestRemediation(selection, { fetcher });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
    ...selection,
    licenseFullName: "Holder",
    codeOfConductContact: "contact@example.test",
  });
});
it("accepts case-insensitive repository matches and strips extra response properties", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ ...result, token: "not-exposed" }));
  expect(
    await requestRemediation(
      { ...input, owner: "OWNER", repo: "REPO" },
      { fetcher },
    ),
  ).toEqual(result);
});
describe("response validation", () => {
  it.each([
    null,
    {},
    { ...result, filesCreated: [] },
    { ...result, filesCreated: [null] },
    { ...result, filesCreated: [" "] },
    ...[
      "javascript:alert(1)",
      "http://github.com/owner/repo/pull/42",
      "https://github.com.evil.test/owner/repo/pull/42",
      "https://user@github.com/owner/repo/pull/42",
      "https://github.com:443/owner/repo/pull/42",
      "https://github.com/other/repo/pull/42",
      "https://github.com/owner/other/pull/42",
      "https://github.com/owner/repo/pull/0",
      "https://github.com/owner/repo/pull/42?x=y",
      "https://github.com/owner/repo/pull/42#fragment",
    ].map((prUrl) => ({ ...result, prUrl })),
  ])("rejects malformed results %j", async (body) => {
    await expect(
      requestRemediation(input, {
        fetcher: vi.fn().mockResolvedValue(Response.json(body)),
      }),
    ).rejects.toThrow(/invalid remediation result/);
  });
  it("rejects non-JSON success without exposing body text", async () => {
    await expect(
      requestRemediation(input, {
        fetcher: vi.fn().mockResolvedValue(new Response("private-data")),
      }),
    ).rejects.toThrow(/invalid remediation result/);
  });
});
it.each([
  [400, /inputs and selections/],
  [401, /Sign out and sign in/],
  [403, /Reconnect GitHub.*organization restrictions/],
  [404, /Check access/],
  [409, /Re-audit.*path conflicts/],
  [429, /rate limit/],
  [500, /open pull requests/],
  [502, /open pull requests/],
])("provides safe guidance for HTTP %s", async (status, message) => {
  const caught = await requestRemediation(input, {
    fetcher: vi
      .fn()
      .mockResolvedValue(
        new Response("private upstream content", { status: Number(status) }),
      ),
  }).catch((cause) => cause);
  expect(caught).toBeInstanceOf(RemediationRequestError);
  expect(caught.status).toBe(status);
  expect(caught.message).toMatch(message);
  expect(caught.message).not.toContain("private");
});
it.each(["15", "Sat, 17 Oct 2026 12:01:00 GMT"])(
  "honors Retry-After %s",
  async (value) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
    const caught = await requestRemediation(input, {
      fetcher: vi.fn().mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": value },
        }),
      ),
    }).catch((cause) => cause);
    expect(caught.retryAt).toBe(Date.now() + (value === "15" ? 15000 : 60000));
  },
);
it.each([
  "-1",
  "1.5",
  "garbage",
  "99999999999999999999",
  "0",
  "Sat, 17 Oct 2020 12:01:00 GMT",
])("ignores invalid or elapsed retry timing %s", async (value) => {
  const caught = await requestRemediation(input, {
    fetcher: vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 429, headers: { "Retry-After": value } }),
      ),
  }).catch((cause) => cause);
  expect(caught.retryAt).toBeUndefined();
});
it("sanitizes network failures", async () => {
  const caught = await requestRemediation(input, {
    fetcher: vi.fn().mockRejectedValue(new Error("private")),
  }).catch((cause) => cause);
  expect(caught.status).toBe(0);
  expect(caught.message).toMatch(/connection.*open pull requests/);
});
it.each(["repository_scope_required", "workflow_scope_required"])("uses allowlisted scope guidance for %s", async (code) => {
  const caught = await requestRemediation(input, {
    fetcher: vi.fn().mockResolvedValue(Response.json({ code, error: "private upstream data" }, { status: 403 })),
  }).catch((cause) => cause);
  expect(caught.code).toBe(code);
  expect(caught.message).toContain("Reconnect GitHub");
  expect(caught.message).not.toContain("private");
});
it("ignores unrecognized server error codes and raw provider messages", async () => {
  const caught = await requestRemediation(input, {
    fetcher: vi.fn().mockResolvedValue(Response.json({ code: "__proto__", error: "private upstream data" }, { status: 403 })),
  }).catch((cause) => cause);
  expect(caught.code).toBeUndefined();
  expect(caught.message).toContain("Reconnect GitHub");
  expect(caught.message).not.toContain("private");
});
it("preserves abort cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  const error = new DOMException("Aborted", "AbortError");
  await expect(
    requestRemediation(input, {
      signal: controller.signal,
      fetcher: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error);
});
