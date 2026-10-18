import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportController } from "@/components/report/report-controller";
import { buildReportMetadata } from "@/lib/report-metadata";
import { isRepositoryCoordinates } from "@/lib/report-validation";
import { findReportByRepository } from "@/lib/reports";

type ReportPageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { owner, repo } = await params;
  if (!isRepositoryCoordinates(owner, repo)) notFound();
  return buildReportMetadata({ owner, repo, path: `/report/${owner}/${repo}` });
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { owner, repo } = await params;
  if (!isRepositoryCoordinates(owner, repo)) notFound();
  const report = await findReportByRepository(owner, repo);
  return <ReportController owner={owner} repo={repo} initialReport={report} />;
}
