import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/fusion/features";
import {
  createPassDraft,
  issuePass,
  listPassesForBusiness,
  previewPass,
  replacePass,
  revokePass,
  updatePass,
  getPassStatus,
} from "@/lib/fusion/wallet";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const passId = url.searchParams.get("id");
    if (passId) {
      const pass = await getPassStatus({ passId, businessId: business.id });
      if (!pass) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, pass });
    }
    const passes = await listPassesForBusiness(business.id);
    return NextResponse.json({ ok: true, passes });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const actionSchema = z.object({
  action: z.enum(["create", "preview", "issue", "update", "revoke", "replace"]),
  passId: z.string().optional(),
  platform: z.enum(["apple", "google"]).optional(),
  cardTitle: z.string().optional(),
  tapUrl: z.string().optional(),
  contactId: z.string().optional(),
  relationshipId: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const featureEnabled = isFeatureEnabled("wallet.apple_google", {});
    const body = actionSchema.parse(await request.json());

    if (body.action === "create") {
      const result = await createPassDraft({
        businessId: business.id,
        platform: body.platform ?? "apple",
        businessName: business.name,
        cardTitle: body.cardTitle ?? `${business.name} Card`,
        tapUrl: body.tapUrl ?? `https://tapconnect.app/t/${business.slug}`,
        contactId: body.contactId,
        relationshipId: body.relationshipId,
        actorId: user.id,
        featureEnabled,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, pass: result.pass });
    }

    if (!body.passId) {
      return NextResponse.json({ error: "passId required" }, { status: 400 });
    }

    const common = {
      passId: body.passId,
      businessId: business.id,
      actorId: user.id,
      featureEnabled,
    };

    if (body.action === "preview") {
      const result = await previewPass(common);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, pass: result.pass, previewUrl: result.previewUrl });
    }
    if (body.action === "issue") {
      const result = await issuePass(common);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, pass: result.pass, mock: result.mock });
    }
    if (body.action === "update") {
      const result = await updatePass({ ...common, fields: body.fields });
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, pass: result.pass });
    }
    if (body.action === "revoke") {
      const result = await revokePass(common);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({ ok: true, pass: result.pass });
    }
    if (body.action === "replace") {
      const result = await replacePass(common);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        oldPass: result.oldPass,
        newPass: result.newPass,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
