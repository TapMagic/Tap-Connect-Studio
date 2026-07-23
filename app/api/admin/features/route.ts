import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth";
import { getFeature } from "@/lib/fusion/features";
import {
  listFeatureOverrides,
  setFeatureOverride,
} from "@/lib/fusion/features/overrides";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePlatformAdmin();
  const overrides = await listFeatureOverrides();
  return NextResponse.json({ overrides });
}

export async function POST(req: Request) {
  const { user } = await requirePlatformAdmin();
  const body = (await req.json()) as {
    featureId?: string;
    enabled?: boolean;
    scope?: string;
    reason?: string;
  };

  if (!body.featureId || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "featureId and enabled are required" },
      { status: 400 }
    );
  }

  if (!getFeature(body.featureId)) {
    return NextResponse.json({ error: "Unknown feature id" }, { status: 404 });
  }

  if (!body.reason?.trim()) {
    return NextResponse.json(
      { error: "Reason is required for audited feature changes" },
      { status: 400 }
    );
  }

  const result = await setFeatureOverride({
    featureId: body.featureId,
    enabled: body.enabled,
    scope: body.scope,
    reason: body.reason.trim(),
    actorId: user.id,
    actorEmail: user.email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
