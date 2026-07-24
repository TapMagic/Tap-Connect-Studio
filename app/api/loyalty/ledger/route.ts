import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { listLedger } from "@/lib/fusion/taploop";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const gate = checkFeatureGate("loyalty.taploop", featureCtx);
    if (!gate.ok) {
      return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
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
