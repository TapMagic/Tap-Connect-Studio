/**
 * Public TapFlow live trigger — starts/resumes persisted visitor executions.
 * Idempotent on tc_flow_session cookie so refresh does not duplicate.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { executeActiveJourneysForVisitor } from "@/lib/fusion/journey/live";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";

const bodySchema = z.object({
  deviceCode: z.string().min(1).max(64),
  campaignId: z.string().optional(),
  contactId: z.string().optional(),
  relationshipId: z.string().optional(),
  consent: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
  email: z.string().email().optional(),
});

const SESSION_COOKIE = "tc_flow_session";
const SESSION_MAX_AGE = 60 * 30; // 30 minutes — refresh within window reuses execution

function ensureSessionId(existing: string | undefined): string {
  if (existing && existing.length >= 8) return existing;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tfs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const body = bodySchema.parse(raw);

    const device = await prisma.deviceSlot.findFirst({
      where: { deviceCode: body.deviceCode },
      select: { id: true, businessId: true, deviceCode: true },
    });
    if (!device?.businessId) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const jar = await cookies();
    const sessionId = ensureSessionId(jar.get(SESSION_COOKIE)?.value);

    const requestHeaders = await headers();
    const visitorHash = createHash("sha256")
      .update(
        `${requestHeaders.get("user-agent") ?? ""}-${requestHeaders.get("x-forwarded-for") ?? "unknown"}-${sessionId}`
      )
      .digest("hex")
      .slice(0, 16);

    let contactId = body.contactId ?? null;
    let relationshipId = body.relationshipId ?? null;

    if (body.email && isIsolatedFusionDatabaseConfigured()) {
      let contact = await prisma.contact.findFirst({
        where: { businessId: device.businessId, email: body.email },
      });
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            businessId: device.businessId,
            email: body.email,
            metadata: { source: "tapflow_public" },
          },
        });
      }
      contactId = contact.id;

      const rel = await prisma.customerRelationship.upsert({
        where: {
          businessId_contactId: {
            businessId: device.businessId,
            contactId,
          },
        },
        create: {
          businessId: device.businessId,
          contactId,
          sourceType: "tapflow",
          sourceTapPointId: device.id,
          metadata: { deviceCode: body.deviceCode },
        },
        update: {
          sourceTapPointId: device.id,
        },
      });
      relationshipId = rel.id;
    }

    const result = await executeActiveJourneysForVisitor({
      businessId: device.businessId,
      sessionId,
      deviceSlotId: device.id,
      campaignId: body.campaignId,
      contactId: contactId ?? undefined,
      relationshipId: relationshipId ?? undefined,
      visitor: {
        visitorId: visitorHash,
        consent: {
          email: body.consent?.email ?? Boolean(body.email),
          sms: body.consent?.sms ?? false,
          marketing: body.consent?.marketing ?? Boolean(body.email),
        },
        attributes: {
          deviceCode: body.deviceCode,
          ...(body.campaignId ? { campaignId: body.campaignId } : {}),
          ...(body.email ? { email: body.email } : {}),
        },
      },
    });

    const response = NextResponse.json({
      ok: result.ok,
      skipped: result.skipped,
      sessionId,
      executions: result.executions.map((e) => ({
        id: e.id,
        journeyId: e.journeyId,
        journeyName: e.journeyName,
        status: e.status,
        path: e.path,
        duplicated: e.duplicated ?? false,
        publishedVersion: e.publishedVersion,
        currentNodeId: e.currentNodeId,
        waitUntil: e.waitUntil,
        contactId: e.contactId,
        relationshipId: e.relationshipId,
        campaignId: e.campaignId,
        steps: e.steps.length,
      })),
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("Public TapFlow trigger error", error);
    return NextResponse.json(
      { error: "Failed", detail: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}
