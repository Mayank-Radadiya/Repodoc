import { GitHubApiError } from "@/lib/github/client";
import { GitHubService, findReadmeEntry } from "@/lib/github/service";
import { ScoringEngine } from "@/lib/scoring/engine";
import { buildPathSet } from "@/lib/scoring/utils";
import { findCachedReport, saveReport } from "@/lib/reports";

function parseRepository(body: unknown): { owner: string; repo: string } | null {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("owner" in body) ||
    !("repo" in body) ||
    typeof body.owner !== "string" ||
    typeof body.repo !== "string"
  ) {
    return null;
  }

  const ownerInput = body.owner.trim();
  const ownerUrl = /^(?:https:\/\/)?github\.com\/([^/]+)\/?$/i.exec(ownerInput);
  const owner = ownerUrl ? ownerUrl[1] : ownerInput;
  const repoInput = body.repo.trim();
  const repoUrl = /^(?:https:\/\/)?github\.com\/([^/]+)\/([^/]+)\/?$/i.exec(repoInput);
  const repo = repoUrl ? repoUrl[2] : repoInput;

  if (
    !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(owner) ||
    !/^[a-z\d_.-]+$/i.test(repo) ||
    repo === "." ||
    repo === ".." ||
    (repoUrl && repoUrl[1].toLowerCase() !== owner.toLowerCase())
  ) {
    return null;
  }

  return { owner, repo };
}

function retryAfter(error: GitHubApiError): string | undefined {
  const seconds = error.retryAfterSeconds ?? (
    error.rateLimitResetAt === undefined
      ? undefined
      : Math.max(0, error.rateLimitResetAt - Date.now() / 1000)
  );
  if (seconds === undefined || seconds < 0 || !Number.isSafeInteger(Math.ceil(seconds))) {
    return undefined;
  }
  return String(Math.ceil(seconds));
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const repository = parseRepository(body);
  if (!repository) {
    return Response.json(
      { error: "Provide valid owner and repo strings. A GitHub repository URL must match the supplied owner." },
      { status: 400 },
    );
  }

  const { owner, repo } = repository;
  try {
    const cached = await findCachedReport(owner, repo);
    const data = await GitHubService.getRepoData(owner, repo, cached?.etag);
    if (data.tree === null && cached) {
      return Response.json(cached.report);
    }
    if (data.tree === null || data.truncated) {
      return Response.json(
        { error: "GitHub did not return a complete repository tree. A complete audit is unavailable." },
        { status: 502 },
      );
    }

    const readme = findReadmeEntry(data.tree);
    const manifest = data.tree.find(
      (entry) => entry.type === "blob" && entry.path.toLowerCase() === "package.json",
    );
    const [readmeContent, manifestContent] = await Promise.all([
      readme ? GitHubService.fetchFileContent(owner, repo, readme.sha) : null,
      manifest ? GitHubService.fetchFileContent(owner, repo, manifest.sha) : null,
    ]);

    const report = ScoringEngine.run({
      owner,
      repo,
      defaultBranch: data.defaultBranch,
      paths: buildPathSet(data.tree),
      readmeContent,
      manifestContent,
      description: data.description,
      topics: data.topics,
    });
    return Response.json(await saveReport(report, data.etag));
  } catch (error) {
    if (error instanceof GitHubApiError) {
      if (error.code === "not_found") {
        return Response.json(
          { error: "GitHub repository or resource was not found or is inaccessible." },
          { status: 404 },
        );
      }
      if (error.code === "rate_limited") {
        const delay = retryAfter(error);
        return Response.json(
          { error: "GitHub API rate limit exceeded. Try again later." },
          { status: 429, headers: delay === undefined ? {} : { "Retry-After": delay } },
        );
      }
      return Response.json(
        { error: "Unable to retrieve repository data from GitHub." },
        { status: 502 },
      );
    }
    return Response.json({ error: "Unable to complete the repository audit." }, { status: 500 });
  }
}
