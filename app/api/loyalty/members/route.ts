import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { getMemberDetail, listMembers, setEnrollmentStatus } from "@/lib/fusion/taploop";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";

async function requireTapLoop() {
  const overrides = toResolveOverrides(await listFeatureOverrides());
  if (!isFeatureEnabled("loyalty.taploop", { overrides })) {
    return NextResponse.json(
      { error: "TapLoop disabled", feature: "loyalty.taploop" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const blocked = await requireTapLoop();
    if (blocked) return blocked;

    const url = new URL(request.url);
    const enrollmentId = url.searchParams.get("enrollmentId");
    if (enrollmentId) {
      const member = await getMemberDetail(business.id, enrollmentId);
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, member });
    }

    const members = await listMembers({
      businessId: business.id,
      programId: url.searchParams.get("programId") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 50) || 50,
    });
    return NextResponse.json({ ok: true, members });
  } catch (error) {
    console.error("Loyalty members error:", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}

const statusSchema = z.object({
  enrollmentId: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]),
});

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const blocked = await requireTapLoop();
    if (blocked) return blocked;

    const body = statusSchema.parse(await request.json());
    const enrollment = await setEnrollmentStatus({
      businessId: business.id,
      enrollmentId: body.enrollmentId,
      status: body.status,
    });
    return NextResponse.json({ ok: true, enrollment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid membership status payload" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status update failed" },
      { status: 400 }
    );
  }
}
