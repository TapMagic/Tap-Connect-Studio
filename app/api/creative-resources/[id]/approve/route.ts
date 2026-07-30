import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  approveCreativeResource,
  CreativeResourceError,
  creativeResourceRoleForBusiness,
} from "@/lib/fusion/creative-platform/resources";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await params;
    const resource = await approveCreativeResource({
      businessId: business.id,
      userId: user.id,
      role: creativeResourceRoleForBusiness(user, business.id),
      id,
    });
    return NextResponse.json({ resource });
  } catch (error) {
    if (error instanceof CreativeResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Creative approval error:", error);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
