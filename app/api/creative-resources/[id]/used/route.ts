import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  CreativeResourceError,
  markCreativeResourceUsed,
} from "@/lib/fusion/creative-platform/resources";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await params;
    const recent = await markCreativeResourceUsed({
      businessId: business.id,
      userId: user.id,
      resourceId: id,
    });
    return NextResponse.json({ recent });
  } catch (error) {
    if (error instanceof CreativeResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Creative recent error:", error);
    return NextResponse.json({ error: "Recent update failed" }, { status: 500 });
  }
}
