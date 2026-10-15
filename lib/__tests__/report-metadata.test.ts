import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("report metadata", () => {
  it.each([undefined, "https://preview.example.com", "http://localhost:3000/"])(
    "resolves report and image URLs against the configured origin: %s",
    async (origin) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
      vi.resetModules();
      const { buildReportMetadata } = await import("../report-metadata");
      const base = origin ?? "https://repodoc.dev";
      const metadata = buildReportMetadata({
        owner: "Owner",
        repo: "repo.name-1",
        path: "/report/Owner/repo.name-1",
      });
      const title = "Repodoc — Owner/repo.name-1 Health Report";
      const description =
        "Explore the repository health report for Owner/repo.name-1, with a 100-point audit, category scores, evidence, and actionable recommendations.";
      const url = new URL("/report/Owner/repo.name-1", base).href;
      const image = {
        url: new URL("/opengraph-image", base).href,
        width: 1200,
        height: 630,
        alt: "Repodoc — Repository Intelligence & Automated Health Remediation",
        type: "image/png",
      };

      expect(metadata.title).toEqual({ absolute: title });
      expect(metadata.description).toBe(description);
      expect(metadata.alternates?.canonical).toBe(url);
      expect(metadata.openGraph).toEqual({
        type: "website",
        siteName: "Repodoc",
        locale: "en_US",
        title,
        description,
        url,
        images: [image],
      });
      expect(metadata.twitter).toEqual({
        card: "summary_large_image",
        title,
        description,
        images: [image],
      });
    },
  );

  it("gives the shared report its own canonical and social URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://reports.example.com");
    vi.resetModules();
    const { buildReportMetadata } = await import("../report-metadata");
    const metadata = buildReportMetadata({
      owner: "Owner",
      repo: "Repo",
      path: "/share/test1234",
    });
    expect(metadata.alternates?.canonical).toBe(
      "https://reports.example.com/share/test1234",
    );
    expect(metadata.openGraph).toMatchObject({
      url: "https://reports.example.com/share/test1234",
    });
  });
});
