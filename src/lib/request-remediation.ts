import type { SupportedLicenseId } from "./templates/licenses";
import type { ParsedGitHubUrl } from "./types";

export const REMEDIATION_FIX_IDS = [
  "license",
  "gitignore",
  "ci-workflow",
  "security-policy",
  "code-of-conduct",
] as const;
export type RemediationFixId = (typeof REMEDIATION_FIX_IDS)[number];

export interface RemediationRequest extends ParsedGitHubUrl {
  fixes: readonly RemediationFixId[];
  licenseChoice?: SupportedLicenseId;
  licenseFullName?: string;
  codeOfConductContact?: string;
}

export interface RemediationResponse {
  prUrl: string;
  filesCreated: string[];
}

export class RemediationRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAt?: number,
  ) {
    super(message);
    this.name = "RemediationRequestError";
  }
}

function retryAt(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const now = Date.now();
  const trimmed = value.trim();
  const deadline = /^\d+$/.test(trimmed)
    ? now + Number(trimmed) * 1000
    : /[a-z]/i.test(trimmed)
      ? Date.parse(trimmed)
      : NaN;
  return Number.isSafeInteger(deadline) && deadline > now
    ? deadline
    : undefined;
}

function errorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Check your template inputs and selections, then re-audit if the findings have changed.";
    case 401:
      return "Your GitHub session could not authorize this request. Sign out and sign in again.";
    case 403:
      return "Check repository write permissions and GitHub OAuth scopes, including workflow access for CI fixes.";
    case 404:
      return "The repository or GitHub resource is unavailable. Check access and re-audit.";
    case 409:
      return "The selected findings may already be resolved or conflict with existing files. Re-audit and resolve any path conflicts before trying again.";
    case 429:
      return "GitHub's API rate limit was reached. Wait before trying again.";
    default:
      return "Unable to confirm pull request creation. Check the repository's open pull requests before trying again.";
  }
}

function isResult(
  value: unknown,
  repository: ParsedGitHubUrl,
): value is RemediationResponse {
  if (
    !value ||
    typeof value !== "object" ||
    !("prUrl" in value) ||
    typeof value.prUrl !== "string" ||
    !("filesCreated" in value) ||
    !Array.isArray(value.filesCreated) ||
    !value.filesCreated.length ||
    !value.filesCreated.every(
      (path: unknown) => typeof path === "string" && path.trim().length > 0,
    )
  )
    return false;
  // Require the server's canonical URL form and the requested repository.
  const match =
    /^https:\/\/github\.com\/([^/?#\s]+)\/([^/?#\s]+)\/pull\/([1-9]\d*)$/.exec(
      value.prUrl,
    );
  return Boolean(
    match &&
    match[1].toLowerCase() === repository.owner.toLowerCase() &&
    match[2].toLowerCase() === repository.repo.toLowerCase(),
  );
}

/** Browser boundary: session cookies authenticate; no GitHub credentials here. */
export async function requestRemediation(
  input: RemediationRequest,
  options: { fetcher?: typeof fetch; signal?: AbortSignal } = {},
): Promise<RemediationResponse> {
  const body = {
    owner: input.owner,
    repo: input.repo,
    fixes: [...new Set(input.fixes)],
    ...(input.fixes.includes("license")
      ? {
          licenseChoice: input.licenseChoice,
          licenseFullName: input.licenseFullName?.trim(),
        }
      : {}),
    ...(input.fixes.includes("code-of-conduct")
      ? { codeOfConductContact: input.codeOfConductContact?.trim() }
      : {}),
  };
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)("/api/remediate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (cause) {
    if (options.signal?.aborted) throw cause;
    throw new RemediationRequestError(
      "The connection was interrupted. Check your connection and the repository's open pull requests before trying again.",
      0,
    );
  }
  if (!response.ok)
    throw new RemediationRequestError(
      errorMessage(response.status),
      response.status,
      response.status === 429
        ? retryAt(response.headers.get("Retry-After"))
        : undefined,
    );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    /* Handled as an invalid result. */
  }
  if (!isResult(data, input))
    throw new RemediationRequestError(
      "The server returned an invalid remediation result. Check the repository's open pull requests before trying again.",
      response.status,
    );
  return { prUrl: data.prUrl, filesCreated: data.filesCreated };
}
