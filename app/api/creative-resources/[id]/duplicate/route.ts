import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  CreativeResourceError,
  creativeResourceRoleForBusiness,
  duplicateCreativeResource,
} from "@/lib/fusion/creative-platform/resources";

const schema = z.object({ name: z.string().min(1).max(120) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await params;
    const { name } = schema.parse(await request.json());
    const resource = await duplicateCreativeResource({
      businessId: business.id,
      userId: user.id,
      role: creativeResourceRoleForBusiness(user, business.id),
      id,
      name,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A duplicate name is required" }, { status: 400 });
    }
    if (error instanceof CreativeResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Creative duplication error:", error);
    return NextResponse.json({ error: "Duplication failed" }, { status: 500 });
  }
}
