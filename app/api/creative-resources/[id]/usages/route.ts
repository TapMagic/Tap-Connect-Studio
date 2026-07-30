import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  CreativeResourceError,
  getCreativeResource,
} from "@/lib/fusion/creative-platform/resources";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await params;
    const resource = await getCreativeResource({
      businessId: business.id,
      id,
    });
    return NextResponse.json({ usages: resource.usages });
  } catch (error) {
    if (error instanceof CreativeResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Creative usage error:", error);
    return NextResponse.json({ error: "Usage references unavailable" }, { status: 500 });
  }
}
