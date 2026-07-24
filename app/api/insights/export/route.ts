import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { fetchInsightsSnapshot, insightsToCsv } from "@/lib/fusion/insights/metrics";
import { parseInsightsRangeDays } from "@/lib/fusion/insights/range";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const days = parseInsightsRangeDays(url.searchParams.get("days"));
    const format = url.searchParams.get("format");

    const snapshot = await fetchInsightsSnapshot(business.id, {
      rangeDays: days,
      view: url.searchParams.get("view"),
      compare: url.searchParams.get("compare"),
      evidence: url.searchParams.get("evidence"),
      drill: url.searchParams.get("drill"),
      campaignId: url.searchParams.get("campaignId"),
    });

    if (snapshot.error) {
      return NextResponse.json(
        { error: snapshot.error, ok: false },
        { status: 500 }
      );
    }

    if (format === "csv") {
      const csv = insightsToCsv(snapshot);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="insights-${snapshot.view}-${snapshot.rangeDays}d.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: true, snapshot });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
