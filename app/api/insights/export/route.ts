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

    const snapshot = await fetchInsightsSnapshot(business.id, days);

    if (format === "csv") {
      const csv = insightsToCsv(snapshot);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="insights-${snapshot.rangeDays}d.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: true, snapshot });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
