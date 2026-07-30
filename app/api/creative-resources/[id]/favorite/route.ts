import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  CreativeResourceError,
  setCreativeResourceFavorite,
} from "@/lib/fusion/creative-platform/resources";

async function update(
  favorite: boolean,
  params: Promise<{ id: string }>
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await params;
    return NextResponse.json(
      await setCreativeResourceFavorite({
        businessId: business.id,
        userId: user.id,
        resourceId: id,
        favorite,
      })
    );
  } catch (error) {
    if (error instanceof CreativeResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Creative favorite error:", error);
    return NextResponse.json({ error: "Favorite update failed" }, { status: 500 });
  }
}

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return update(true, params);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return update(false, params);
}
