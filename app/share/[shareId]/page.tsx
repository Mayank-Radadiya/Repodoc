import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { buildReportMetadata } from "@/lib/report-metadata";
import { findReportByShareId } from "@/src/lib/reports";
import { isShareId } from "@/src/lib/report-validation";
import { ShareController } from "@/components/report/share-controller";

type SharePageProps = {
  params: Promise<{ shareId: string }>;
};

// Memoize only within a server render so metadata and content use the same report.
const getSharedReport = cache(async (shareId: string) => {
  if (!isShareId(shareId)) notFound();
  const report = await findReportByShareId(shareId);
  if (!report) notFound();
  return report;
});

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  const { owner, repo } = await getSharedReport(shareId);
  return buildReportMetadata({ owner, repo, path: `/share/${shareId}` });
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  const report = await getSharedReport(shareId);
  return <ShareController shareId={shareId} initialReport={report} />;
}
