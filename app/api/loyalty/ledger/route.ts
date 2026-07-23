import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { listLedger } from "@/lib/fusion/taploop";
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
    const result = await listLedger({
      businessId: business.id,
      enrollmentId: url.searchParams.get("enrollmentId") ?? undefined,
      programId: url.searchParams.get("programId") ?? undefined,
      contactId: url.searchParams.get("contactId") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 50) || 50,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Loyalty ledger error:", error);
    return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
  }
}
