import { describe, it, expect } from "vitest";
import { parseGitHubUrl, type ParsedGitHubUrl } from "@/src/lib/utils";
import { parseGitHubUrl as parseGitHubUrlFromRoot } from "@/lib/utils";

describe("parseGitHubUrl", () => {
  describe("shorthand owner/repo format", () => {
    it("parses basic owner/repo", () => {
      const result = parseGitHubUrl("facebook/react");
      expect(result).toEqual<ParsedGitHubUrl>({ owner: "facebook", repo: "react" });
    });

    it("handles repo names with dots, hyphens, and underscores", () => {
      expect(parseGitHubUrl("vercel/next.js")).toEqual({ owner: "vercel", repo: "next.js" });
      expect(parseGitHubUrl("my-org/my_cool-tool")).toEqual({ owner: "my-org", repo: "my_cool-tool" });
      expect(parseGitHubUrl("username/user.github.io")).toEqual({ owner: "username", repo: "user.github.io" });
    });

    it("preserves original casing", () => {
      expect(parseGitHubUrl("Facebook/React")).toEqual({ owner: "Facebook", repo: "React" });
    });

    it("handles trailing slashes on shorthand", () => {
      expect(parseGitHubUrl("facebook/react/")).toEqual({ owner: "facebook", repo: "react" });
      expect(parseGitHubUrl("facebook/react///")).toEqual({ owner: "facebook", repo: "react" });
    });

    it("handles .git suffix on shorthand", () => {
      expect(parseGitHubUrl("facebook/react.git")).toEqual({ owner: "facebook", repo: "react" });
      expect(parseGitHubUrl("facebook/react.git/")).toEqual({ owner: "facebook", repo: "react" });
    });
  });

  describe("domain prefixed format without protocol", () => {
    it("parses github.com/owner/repo", () => {
      expect(parseGitHubUrl("github.com/facebook/react")).toEqual({ owner: "facebook", repo: "react" });
    });

    it("parses www.github.com/owner/repo", () => {
      expect(parseGitHubUrl("www.github.com/facebook/react")).toEqual({ owner: "facebook", repo: "react" });
    });

    it("handles trailing slashes", () => {
      expect(parseGitHubUrl("github.com/facebook/react/")).toEqual({ owner: "facebook", repo: "react" });
    });

    it("handles .git suffix", () => {
      expect(parseGitHubUrl("github.com/facebook/react.git")).toEqual({ owner: "facebook", repo: "react" });
    });
  });

  describe("standard HTTP and HTTPS URLs", () => {
    it("parses https://github.com/owner/repo", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses http://github.com/owner/repo", () => {
      expect(parseGitHubUrl("http://github.com/facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses https://www.github.com/owner/repo", () => {
      expect(parseGitHubUrl("https://www.github.com/facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("handles trailing slashes with protocol", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react/")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("https://github.com/facebook/react///")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("handles .git suffix with protocol", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react.git")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("https://github.com/facebook/react.git/")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("deep URLs and sub-paths", () => {
    it("extracts owner and repo from tree / branch paths", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react/tree/main")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("https://github.com/facebook/react/tree/feature/branch-name")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("extracts owner and repo from blob / file paths", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react/blob/main/README.md")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("github.com/facebook/react/blob/v1.0.0/packages/react/index.js")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("extracts owner and repo from issues, PRs, and other repo sub-routes", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react/issues")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("https://github.com/facebook/react/pull/123")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("https://github.com/facebook/react/releases/tag/v18.0.0")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("query parameters and hash fragments", () => {
    it("strips query parameters", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react?tab=readme-ov-file")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("facebook/react?foo=bar&baz=qux")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("strips hash fragments", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react#readme")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("facebook/react#heading")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("strips both query parameters and hash fragments together", () => {
      expect(parseGitHubUrl("https://github.com/facebook/react?tab=readme#readme")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("https://github.com/facebook/react/tree/main?tab=readme#section")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("SSH and Git protocol URLs", () => {
    it("parses git@github.com:owner/repo.git", () => {
      expect(parseGitHubUrl("git@github.com:facebook/react.git")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses git@github.com:owner/repo without .git", () => {
      expect(parseGitHubUrl("git@github.com:facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses ssh://git@github.com/owner/repo.git", () => {
      expect(parseGitHubUrl("ssh://git@github.com/facebook/react.git")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });

    it("parses git://github.com/owner/repo.git", () => {
      expect(parseGitHubUrl("git://github.com/facebook/react.git")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing whitespace, tabs, and newlines", () => {
      expect(parseGitHubUrl("   facebook/react   ")).toEqual({
        owner: "facebook",
        repo: "react",
      });
      expect(parseGitHubUrl("\thttps://github.com/facebook/react\n")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("re-export from root lib/utils alias", () => {
    it("works when imported from @/lib/utils", () => {
      expect(parseGitHubUrlFromRoot("facebook/react")).toEqual({
        owner: "facebook",
        repo: "react",
      });
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty strings or whitespace-only strings", () => {
      expect(parseGitHubUrl("")).toBeNull();
      expect(parseGitHubUrl("   ")).toBeNull();
      expect(parseGitHubUrl("\t\n")).toBeNull();
    });

    it("returns null for non-string inputs safely", () => {
      expect(parseGitHubUrl(null as unknown as string)).toBeNull();
      expect(parseGitHubUrl(undefined as unknown as string)).toBeNull();
      expect(parseGitHubUrl(123 as unknown as string)).toBeNull();
      expect(parseGitHubUrl({} as unknown as string)).toBeNull();
    });

    it("returns null for single segments (username or word only)", () => {
      expect(parseGitHubUrl("react")).toBeNull();
      expect(parseGitHubUrl("facebook")).toBeNull();
      expect(parseGitHubUrl("github.com")).toBeNull();
      expect(parseGitHubUrl("https://github.com")).toBeNull();
      expect(parseGitHubUrl("https://github.com/")).toBeNull();
      expect(parseGitHubUrl("https://github.com/facebook")).toBeNull();
      expect(parseGitHubUrl("https://github.com/facebook/")).toBeNull();
    });

    it("returns null for non-GitHub domains", () => {
      expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
      expect(parseGitHubUrl("https://bitbucket.org/owner/repo")).toBeNull();
      expect(parseGitHubUrl("https://google.com/search")).toBeNull();
      expect(parseGitHubUrl("gitlab.com/owner/repo")).toBeNull();
    });

    it("returns null for malformed URLs or protocols", () => {
      expect(parseGitHubUrl("https://")).toBeNull();
      expect(parseGitHubUrl("ftp://github.com/owner/repo")).toBeNull();
      expect(parseGitHubUrl("http://")).toBeNull();
      expect(parseGitHubUrl("://")).toBeNull();
    });

    it("returns null for directory traversal or invalid characters", () => {
      expect(parseGitHubUrl("../..")).toBeNull();
      expect(parseGitHubUrl("owner/..")).toBeNull();
      expect(parseGitHubUrl("../repo")).toBeNull();
      expect(parseGitHubUrl("owner/repo with spaces")).toBeNull();
      expect(parseGitHubUrl("owner name/repo")).toBeNull();
      expect(parseGitHubUrl("/facebook/react")).toBeNull();
    });

    it("returns null when owner or repo segment is empty", () => {
      expect(parseGitHubUrl("/")).toBeNull();
      expect(parseGitHubUrl("//")).toBeNull();
      expect(parseGitHubUrl("facebook//react")).toBeNull();
      expect(parseGitHubUrl("facebook/")).toBeNull();
    });
  });
});
