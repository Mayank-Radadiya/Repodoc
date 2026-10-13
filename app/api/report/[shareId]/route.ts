import { findReportByShareId } from "@/src/lib/reports";

interface RouteContext {
  params: Promise<{ shareId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { shareId } = await context.params;
    const report = await findReportByShareId(shareId);
    if (!report) {
      return Response.json({ error: "Report not found." }, { status: 404, headers });
    }
    return Response.json(report, { headers });
  } catch {
    return Response.json(
      { error: "Unable to retrieve the repository report." },
      { status: 500, headers },
    );
  }
}
