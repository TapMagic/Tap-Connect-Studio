import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  CreativeResourceError,
  creativeResourceRoleForBusiness,
  deleteCreativeResource,
  getCreativeResource,
  reviseCreativeResource,
} from "@/lib/fusion/creative-platform/resources";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  payload: z.unknown(),
});

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid reusable design", issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof CreativeResourceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Creative resource error:", error);
  return NextResponse.json({ error: "Reusable design unavailable" }, { status: 500 });
}

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
    return NextResponse.json({ resource });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const resource = await reviseCreativeResource({
      businessId: business.id,
      userId: user.id,
      role: creativeResourceRoleForBusiness(user, business.id),
      id,
      ...input,
    });
    return NextResponse.json({ resource });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await params;
    await deleteCreativeResource({
      businessId: business.id,
      userId: user.id,
      role: creativeResourceRoleForBusiness(user, business.id),
      id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
