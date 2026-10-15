import type { Metadata } from "next";
import { site, siteUrl } from "@/lib/site";

/** Report routes validate their parameters before building public metadata. */
export function buildReportMetadata({
  owner,
  repo,
  path,
}: {
  owner: string;
  repo: string;
  path: `/report/${string}/${string}` | `/share/${string}`;
}): Metadata {
  const repository = `${owner}/${repo}`;
  const title = `${site.name} — ${repository} Health Report`;
  const description = `Explore the repository health report for ${repository}, with a 100-point audit, category scores, evidence, and actionable recommendations.`;
  const url = new URL(path, siteUrl).href;
  const image = {
    url: new URL("/opengraph-image", siteUrl).href,
    width: 1200,
    height: 630,
    alt: site.title,
    type: "image/png",
  };

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      url,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
