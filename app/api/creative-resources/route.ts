import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CreativeResourceKind,
  CreativeResourceStatus,
} from "@prisma/client";
import { requireBusiness } from "@/lib/auth";
import {
  createCreativeResource,
  CreativeResourceError,
  creativeResourceRoleForBusiness,
  listCreativeResources,
} from "@/lib/fusion/creative-platform/resources";

const createSchema = z.object({
  kind: z.nativeEnum(CreativeResourceKind),
  name: z.string().min(1).max(120),
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
  console.error("Creative resources error:", error);
  return NextResponse.json({ error: "Reusable designs unavailable" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");
    const status = params.get("status");
    const resources = await listCreativeResources({
      businessId: business.id,
      userId: user.id,
      kind: kind ? CreativeResourceKind[kind as keyof typeof CreativeResourceKind] : undefined,
      status: status
        ? CreativeResourceStatus[status as keyof typeof CreativeResourceStatus]
        : undefined,
      query: params.get("query") || undefined,
    });
    return NextResponse.json({ resources });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const input = createSchema.parse(await request.json());
    const resource = await createCreativeResource({
      businessId: business.id,
      userId: user.id,
      role: creativeResourceRoleForBusiness(user, business.id),
      ...input,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
