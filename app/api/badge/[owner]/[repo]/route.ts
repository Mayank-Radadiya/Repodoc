import {
  auditRepository,
  IncompleteTreeError,
  validateRepoCoordinates,
} from "@/lib/audit";
import {
  BADGE_CACHE_CONTROL,
  formatBadgeError,
  formatBadgeResponse,
} from "@/lib/badge";
import { GitHubApiError } from "@/lib/github/client";

interface RouteContext {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

function calculateRetryAfter(error: GitHubApiError): string | undefined {
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

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  let params: { owner: string; repo: string };
  try {
    params = await context.params;
  } catch {
    return Response.json(formatBadgeError("invalid parameters"), {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const validated = validateRepoCoordinates(params?.owner, params?.repo);
  if (!validated) {
    return Response.json(formatBadgeError("invalid repo"), {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { owner, repo } = validated;

  try {
    const report = await auditRepository(owner, repo);
    const badge = formatBadgeResponse(report.healthScore);

    return Response.json(badge, {
      status: 200,
      headers: {
        "Cache-Control": BADGE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      if (error.code === "not_found") {
        return Response.json(formatBadgeError("not found"), {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        });
      }

      if (error.code === "rate_limited") {
        const delay = calculateRetryAfter(error);
        const headers: Record<string, string> = { "Cache-Control": "no-store" };
        if (delay !== undefined) {
          headers["Retry-After"] = delay;
        }

        return Response.json(formatBadgeError("rate limited"), {
          status: 429,
          headers,
        });
      }

      return Response.json(formatBadgeError("upstream error"), {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (error instanceof IncompleteTreeError) {
      return Response.json(formatBadgeError("incomplete tree"), {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return Response.json(formatBadgeError("audit error"), {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
