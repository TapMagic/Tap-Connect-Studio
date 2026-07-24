import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { fetchLoyaltyInsightKpis, listLoyaltyAudit } from "@/lib/fusion/taploop";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const overrides = toResolveOverrides(await listFeatureOverrides());
    if (!isFeatureEnabled("loyalty.taploop", { overrides })) {
      return NextResponse.json(
        { error: "TapLoop disabled", feature: "loyalty.taploop" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "kpis";
    const programId = url.searchParams.get("programId") ?? undefined;
    const rangeDays = Number(url.searchParams.get("rangeDays") ?? 14) || 14;

    if (view === "audit") {
      const audit = await listLoyaltyAudit({
        businessId: business.id,
        programId,
        limit: Number(url.searchParams.get("limit") ?? 40) || 40,
      });
      return NextResponse.json({ ok: true, audit });
    }

    const snapshot = await fetchLoyaltyInsightKpis(business.id, rangeDays);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Loyalty insights error:", error);
    return NextResponse.json({ error: "Failed to load loyalty insights" }, { status: 500 });
  }
}
