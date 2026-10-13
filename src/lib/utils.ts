import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ParsedGitHubUrl } from "./types";

export type { ParsedGitHubUrl };

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Validates whether a segment adheres to valid GitHub username/org or repository naming.
 * GitHub allows alphanumeric characters, hyphens, underscores, and dots (for repo).
 * Cannot contain spaces or directory traversal characters.
 */
function isValidSegment(segment: string): boolean {
  if (!segment || segment === "." || segment === "..") {
    return false;
  }
  // Disallow characters that are invalid in GitHub owners/repos, directory traversals, or URI whitespace
  return /^[a-zA-Z0-9_.-]+$/.test(segment);
}

/**
 * Parses and extracts the { owner, repo } from a GitHub URL or shorthand string.
 * Supports:
 * - Shorthand: `owner/repo`, `owner/repo/`
 * - Domain-prefixed: `github.com/owner/repo`, `www.github.com/owner/repo`
 * - HTTP/HTTPS URLs: `https://github.com/owner/repo`, `http://github.com/owner/repo`
 * - Deep sub-paths: `/tree/main`, `/blob/...`, `/issues`, `/pull/123`, etc.
 * - SSH & Git protocols: `git@github.com:owner/repo.git`, `ssh://git@github.com/owner/repo.git`, `git://...`
 * - Strips query parameters (?foo=bar) and hash fragments (#section)
 * - Strips trailing `.git` extensions
 *
 * Returns null if input is invalid, not from GitHub, or has invalid characters.
 */
export function parseGitHubUrl(input: unknown): ParsedGitHubUrl | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Reject unsupported protocols like ftp://
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    if (
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("ssh://") &&
      !trimmed.startsWith("git://")
    ) {
      return null;
    }
  }

  // Reject invalid protocol structures like "://" or "http://" without host
  if (trimmed === "://" || trimmed === "http://" || trimmed === "https://") {
    return null;
  }

  // Handle SSH format: git@github.com:owner/repo(.git)
  const sshScpMatch = trimmed.match(/^git@([a-zA-Z0-9.-]+):([^#?]+)/);
  if (sshScpMatch) {
    const host = sshScpMatch[1].toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") {
      return null;
    }
    const pathPart = sshScpMatch[2];
    return extractOwnerAndRepo(pathPart);
  }

  // Remove hash fragment and query parameters
  let cleaned = trimmed.split("#")[0].split("?")[0].trim();

  // Strip protocol if present
  if (cleaned.startsWith("https://")) {
    cleaned = cleaned.slice(8);
  } else if (cleaned.startsWith("http://")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("ssh://")) {
    cleaned = cleaned.slice(6);
    // Might have git@ prefix
    if (cleaned.startsWith("git@")) {
      cleaned = cleaned.slice(4);
    }
  } else if (cleaned.startsWith("git://")) {
    cleaned = cleaned.slice(6);
  }

  // Cleaned might now start with domain or directly with owner/repo
  // Check if it starts with a domain
  const slashIndex = cleaned.indexOf("/");
  if (slashIndex !== -1) {
    const potentialHost = cleaned.slice(0, slashIndex).toLowerCase();
    // Check if it's a domain (contains a dot like github.com, gitlab.com)
    if (potentialHost.includes(".")) {
      if (potentialHost === "github.com" || potentialHost === "www.github.com") {
        cleaned = cleaned.slice(slashIndex + 1);
      } else {
        // Different domain, e.g. gitlab.com
        return null;
      }
    }
  } else {
    // Single segment without slash (e.g. "github.com", "react", "facebook")
    return null;
  }

  // Cleaned cannot start with "/" (leading slashes are invalid shorthand)
  if (cleaned.startsWith("/")) {
    return null;
  }

  return extractOwnerAndRepo(cleaned);
}

function extractOwnerAndRepo(pathPart: string): ParsedGitHubUrl | null {
  // Strip trailing slashes only from the end of the path
  const trimmedPath = pathPart.replace(/\/+$/, "");
  if (!trimmedPath) {
    return null;
  }

  // Reject internal empty segments (e.g. "facebook//react")
  if (trimmedPath.includes("//")) {
    return null;
  }

  const segments = trimmedPath.split("/");

  if (segments.length < 2) {
    return null;
  }

  const rawOwner = segments[0];
  let rawRepo = segments[1];

  // Strip .git from repo name if present
  if (rawRepo.endsWith(".git")) {
    rawRepo = rawRepo.slice(0, -4);
  }

  if (!rawRepo) {
    return null;
  }

  if (!isValidSegment(rawOwner) || !isValidSegment(rawRepo)) {
    return null;
  }

  return {
    owner: rawOwner,
    repo: rawRepo,
  };
}
