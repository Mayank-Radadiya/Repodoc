import { isPersistedAuditReport } from "./report-validation";
import type { ParsedGitHubUrl, PersistedAuditReport } from "./types";

/** Shared browser request boundary; never imports server report/database code. */
export async function requestAudit(
  repository: ParsedGitHubUrl,
  options: { fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<PersistedAuditReport> {
  const response = await (options.fetcher ?? fetch)("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(repository),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    // Invalid or empty response bodies are handled below, including HTTP errors.
  }
  if (!response.ok) {
    const message =
      data !== null &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : undefined;
    throw new Error(
      message || `Audit failed with HTTP status ${response.status}.`,
    );
  }
  if (
    !isPersistedAuditReport(data) ||
    data.owner.toLowerCase() !== repository.owner.toLowerCase() ||
    data.repo.toLowerCase() !== repository.repo.toLowerCase()
  ) {
    throw new Error("The audit returned an invalid report. Try again.");
  }
  return data;
}
