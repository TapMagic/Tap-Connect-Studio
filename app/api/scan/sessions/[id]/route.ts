import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { cancelScanSession, getSessionWithDevice } from "@/lib/services/scan";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { business } = await requireBusiness();
    const result = await getSessionWithDevice(id, business.id);
    if (!result) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Poll scan session error:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { business } = await requireBusiness();
    const session = await cancelScanSession({
      businessId: business.id,
      sessionId: id,
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    console.error("Cancel scan session error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
