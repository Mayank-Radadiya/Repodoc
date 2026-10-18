import { getGitHubSession } from "@/lib/auth";
import {
  auditRepository,
  IncompleteTreeError,
  InvalidRepositoryError,
} from "@/src/lib/audit";
import { GitHubApiError } from "@/src/lib/github/client";
import { isRepositoryCoordinates } from "@/src/lib/report-validation";
import {
  REMEDIATION_FEEDBACK,
  type RemediationFeedbackCode,
} from "@/src/lib/remediation-feedback";
import {
  RemediationEngine,
  RemediationError,
  type RemediationEngineInput,
  type RemediationResult,
} from "@/src/lib/remediation/engine";
import { SUPPORTED_LICENSE_IDS } from "@/src/lib/templates/licenses";

type RemediationRequest = Pick<
  RemediationEngineInput,
  "fixes" | "licenseChoice" | "licenseFullName" | "codeOfConductContact"
> & { owner: string; repo: string };

const SUPPORTED_FIXES: readonly string[] = [
  "license",
  "gitignore",
  "ci-workflow",
  "security-policy",
  "code-of-conduct",
];

class InvalidRequestError extends Error {}

function isSingleLine(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !/[\r\n\u2028\u2029]/.test(value)
  );
}

function parseBody(body: unknown): RemediationRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidRequestError(
      "Provide a JSON object with owner, repo, and fixes.",
    );
  }
  if (
    !("owner" in body) ||
    typeof body.owner !== "string" ||
    !("repo" in body) ||
    typeof body.repo !== "string" ||
    !isRepositoryCoordinates(body.owner.trim(), body.repo.trim())
  ) {
    throw new InvalidRequestError(
      "Provide valid repository owner and repo strings.",
    );
  }
  if (
    !("fixes" in body) ||
    !Array.isArray(body.fixes) ||
    body.fixes.length === 0 ||
    !body.fixes.every(
      (id: unknown): id is string =>
        typeof id === "string" && SUPPORTED_FIXES.includes(id),
    )
  ) {
    throw new InvalidRequestError(
      "Select at least one supported remediation check ID.",
    );
  }

  const fixes = [...new Set(body.fixes)];
  const choice = "licenseChoice" in body ? body.licenseChoice : undefined;
  const licenseChoice = SUPPORTED_LICENSE_IDS.find((id) => id === choice);
  const licenseFullName =
    "licenseFullName" in body ? body.licenseFullName : undefined;
  const codeOfConductContact =
    "codeOfConductContact" in body ? body.codeOfConductContact : undefined;
  if (
    (choice !== undefined && licenseChoice === undefined) ||
    (licenseFullName !== undefined && !isSingleLine(licenseFullName)) ||
    (fixes.includes("license") &&
      (!licenseChoice || !isSingleLine(licenseFullName)))
  ) {
    throw new InvalidRequestError(
      "License remediation requires a supported licenseChoice and a nonblank, single-line licenseFullName.",
    );
  }
  if (
    (codeOfConductContact !== undefined &&
      !isSingleLine(codeOfConductContact)) ||
    (fixes.includes("code-of-conduct") && !isSingleLine(codeOfConductContact))
  ) {
    throw new InvalidRequestError(
      "Code of Conduct remediation requires a nonblank, single-line codeOfConductContact.",
    );
  }
  return {
    owner: body.owner.trim(),
    repo: body.repo.trim(),
    fixes,
    ...(licenseChoice === undefined ? {} : { licenseChoice }),
    ...(typeof licenseFullName === "string"
      ? { licenseFullName: licenseFullName.trim() }
      : {}),
    ...(typeof codeOfConductContact === "string"
      ? { codeOfConductContact: codeOfConductContact.trim() }
      : {}),
  };
}

function json(
  body: RemediationResult | { error: string; code?: RemediationFeedbackCode },
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { status, headers });
}

function retryAfter(error: GitHubApiError): string | undefined {
  const seconds =
    error.retryAfterSeconds ??
    (error.rateLimitResetAt === undefined
      ? undefined
      : Math.max(0, error.rateLimitResetAt - Date.now() / 1000));
  if (
    seconds === undefined ||
    seconds < 0 ||
    !Number.isSafeInteger(Math.ceil(seconds))
  ) {
    return undefined;
  }
  return String(Math.ceil(seconds));
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getGitHubSession();
    if (!session)
      return json(
        { error: "Sign in with GitHub to create a remediation pull request." },
        401,
      );

    const origin = request.headers.get("origin");
    if (origin !== null && origin !== new URL(request.url).origin) {
      return json(
        { error: "Cross-origin remediation requests are not allowed." },
        403,
      );
    }
    if (
      request.headers
        .get("content-type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase() !== "application/json"
    ) {
      return json({ error: "Content-Type must be application/json." }, 415);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }
    const { owner, repo, ...selections } = parseBody(body);
    const report = await auditRepository(owner, repo, {
      token: session.accessToken,
    });
    const { prUrl, filesCreated } = await RemediationEngine.execute({
      report,
      ...selections,
      token: session.accessToken,
    });
    return json({ prUrl, filesCreated });
  } catch (error) {
    if (error instanceof InvalidRequestError)
      return json({ error: error.message }, 400);
    if (error instanceof InvalidRepositoryError)
      return json(
        { error: "Provide valid repository owner and repo strings." },
        400,
      );
    if (error instanceof RemediationError) {
      switch (error.code) {
        case "repository_scope_required":
        case "workflow_scope_required":
          return json(
            { error: REMEDIATION_FEEDBACK[error.code], code: error.code },
            403,
          );
        case "fork_not_ready":
          return json(
            {
              error:
                "GitHub is still preparing your fork. Wait briefly and submit remediation again.",
            },
            503,
            { "Retry-After": "15" },
          );
        case "fork_conflict":
          return json(
            {
              error:
                "Your fork cannot safely be used for remediation. Check its repository network and default branch before trying again.",
            },
            409,
          );
        case "invalid_input":
          return json(
            {
              error:
                "Selected fixes must be failed, supported automatable checks with valid template inputs. Refresh the audit and check your selections.",
            },
            400,
          );
        case "path_conflict":
          return json(
            {
              error:
                "A remediation path conflicts with an existing repository entry. Resolve the conflict before trying again.",
            },
            409,
          );
        case "no_changes":
          return json(
            {
              error:
                "All selected remediation findings are already resolved. Refresh the audit.",
            },
            409,
          );
      }
    }
    if (error instanceof IncompleteTreeError) {
      return json(
        {
          error:
            "GitHub did not return a complete repository tree. Remediation is unavailable.",
        },
        502,
      );
    }
    if (error instanceof GitHubApiError) {
      switch (error.code) {
        case "unauthorized":
          return json(
            { error: "GitHub authentication failed. Sign in again." },
            401,
          );
        case "forbidden":
          return json(
            {
              error:
                "GitHub denied the pull request operation. Reconnect GitHub to refresh authorization. If access is still denied, check the repository or organization restrictions.",
            },
            403,
          );
        case "not_found":
          return json(
            {
              error:
                "GitHub repository or resource was not found or is inaccessible.",
            },
            404,
          );
        case "rate_limited": {
          const delay = retryAfter(error);
          return json(
            { error: "GitHub API rate limit exceeded. Try again later." },
            429,
            delay === undefined ? undefined : { "Retry-After": delay },
          );
        }
        default:
          return json(
            { error: "Unable to complete remediation through GitHub." },
            502,
          );
      }
    }
    return json({ error: "Unable to complete repository remediation." }, 500);
  }
}
