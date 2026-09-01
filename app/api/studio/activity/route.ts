import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { isQualifyingStudioUsageOperation } from "@/lib/fusion/creative-studio/platform/activity";
import { listStudioRecentResources, recordStudioResourceUsage } from "@/lib/fusion/creative-studio/platform/activity.server";
import { resolveStudioResourceReference } from "@/lib/fusion/creative-studio/platform/resource-provider-registry.server";
import { standardButtonResourceProvider } from "@/lib/fusion/creative-studio/reconstitution/standard-button-provider.server";
import { studioIconResourceProviders } from "@/lib/fusion/creative-studio/platform/icon-resource-provider.server";

const usageSchema = z.object({
  resource: z.object({ provider: z.string().min(1), resourceId: z.string().min(1), version: z.union([z.string(), z.number()]).optional() }),
  resourceKind: z.string().min(1),
  consumer: z.string().min(1),
  context: z.string().min(1).optional(),
  operation: z.string().refine(isQualifyingStudioUsageOperation),
});

export async function GET(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const params = new URL(request.url).searchParams;
    const consumer = params.get("consumer");
    if (!consumer) return NextResponse.json({ error: "consumer is required" }, { status: 400 });
    const recents = await listStudioRecentResources({ businessId: business.id, userId: user.id, consumer, context: params.get("context") || undefined, resourceKind: params.get("resourceKind") || undefined, limit: Number(params.get("limit") || 20) });
    return NextResponse.json({ recents });
  } catch (error) {
    console.error("Studio activity read failed:", error);
    return NextResponse.json({ error: "Recently Used is temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const input = usageSchema.parse(await request.json());
    const canonical = await resolveStudioResourceReference({ businessId: business.id, userId: user.id, resource: input.resource, providers: [standardButtonResourceProvider, ...studioIconResourceProviders] });
    const recent = await recordStudioResourceUsage({ ...input, userId: user.id, businessId: business.id, timestamp: new Date().toISOString(), canonicalCreativeResourceId: canonical.resourceId });
    return NextResponse.json({ recent });
  } catch (error) {
    console.error("Studio activity update failed:", error);
    return NextResponse.json({ error: "Recently Used could not be updated." }, { status: 500 });
  }
}
