import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { createBusinessWithDefaults } from "@/lib/services/campaigns";
import { slugify } from "@/lib/utils/app";
import { prisma } from "@/lib/db";
import { buildFirstCardDraft } from "@/lib/fusion/card/first-card-draft";
import {
  BusinessCapabilityError,
  requireBusinessCapability,
  roleHasBusinessCapability,
} from "@/lib/fusion/authz/business-capability";
import { createKnowledgeFacts } from "@/lib/fusion/knowledge/repository";

const categories = [
  "PROFESSIONAL_SERVICES",
  "HEALTH_WELLNESS",
  "FOOD_HOSPITALITY",
  "RETAIL_ECOMMERCE",
  "HOME_LOCAL_SERVICES",
  "REAL_ESTATE",
  "NONPROFIT_COMMUNITY",
  "CREATOR_PERSONAL_BRAND",
  "OTHER",
] as const;
const outcomes = [
  "CONTACT",
  "REVIEWS",
  "OFFER",
  "APPOINTMENTS",
  "DIRECTIONS",
  "ESSENTIALS",
  "LOYALTY",
  "FAQ",
] as const;

const createSchema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  businessCategory: z.enum(categories),
  primaryCustomerOutcome: z.enum(outcomes),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  website: z.string().url().nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  businessCategory: z.enum(categories).optional(),
  primaryCustomerOutcome: z.enum(outcomes).optional(),
  location: z
    .object({
      city: z.string().trim().max(100).nullable().optional(),
      state: z.string().trim().max(100).nullable().optional(),
      address: z.string().trim().max(240).nullable().optional(),
      zip: z.string().trim().max(20).nullable().optional(),
      mapUrl: z.string().url().nullable().optional().or(z.literal("")),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();

    if (user.memberships.length > 0) {
      return NextResponse.json({ error: "Business already exists" }, { status: 400 });
    }

    const body = createSchema.parse(await request.json());
    let slug = slugify(body.name);

    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const generated = buildFirstCardDraft({
      businessName: body.name,
      outcome: body.primaryCustomerOutcome,
      facts: [],
    });
    const business = await createBusinessWithDefaults({
      name: body.name,
      slug,
      userId: user.id,
      website: body.website || undefined,
      phone: body.phone,
      businessCategory: body.businessCategory,
      primaryCustomerOutcome: body.primaryCustomerOutcome,
      initialCardDraft: generated.draft,
    });

    const ownerFacts = [
      { factKey: "businessName" as const, value: body.name },
      ...(body.website
        ? [{ factKey: "website" as const, value: body.website }]
        : []),
      ...(body.phone ? [{ factKey: "phone" as const, value: body.phone }] : []),
    ];
    await createKnowledgeFacts({
      businessId: business.id,
      source: {
        kind: "OWNER",
        displayLabel: "Onboarding business details",
        metadata: { entry: "business-create" },
      },
      facts: ownerFacts.map((fact) => ({
        ...fact,
        confidence: 1,
        approvalStatus: "APPROVED" as const,
        evidenceClass: "HOST_DECLARED" as const,
      })),
      actorId: user.id,
    });

    return NextResponse.json({ business, draft: generated.draft, manifest: generated.manifest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("Create business error:", error);
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { business, user, membership } =
      await requireBusinessCapability("onboarding.edit");
    const body = updateSchema.parse(await request.json());
    const updated = await prisma.$transaction(async (tx) => {
      const nextBusiness = await tx.business.update({
        where: { id: business.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.website !== undefined ? { website: body.website || null } : {}),
          ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
          ...(body.email !== undefined ? { email: body.email || null } : {}),
          ...(body.businessCategory !== undefined
            ? { businessCategory: body.businessCategory }
            : {}),
          ...(body.primaryCustomerOutcome !== undefined
            ? { primaryCustomerOutcome: body.primaryCustomerOutcome }
            : {}),
        },
      });
      if (body.location) {
        const location = await tx.location.findFirst({
          where: { businessId: business.id, isDefault: true },
          select: { id: true },
        });
        if (location) {
          await tx.location.update({
            where: { id: location.id },
            data: {
              ...(body.location.city !== undefined
                ? { city: body.location.city || null }
                : {}),
              ...(body.location.state !== undefined
                ? { state: body.location.state || null }
                : {}),
              ...(body.location.address !== undefined
                ? { address: body.location.address || null }
                : {}),
              ...(body.location.zip !== undefined
                ? { zip: body.location.zip || null }
                : {}),
              ...(body.location.mapUrl !== undefined
                ? { mapUrl: body.location.mapUrl || null }
                : {}),
            },
          });
        }
      }
      return nextBusiness;
    });

    const canApprove = roleHasBusinessCapability(
      membership.role,
      "knowledge.approve"
    );
    const facts = [
      ...(body.name ? [{ factKey: "businessName" as const, value: body.name }] : []),
      ...(body.website ? [{ factKey: "website" as const, value: body.website }] : []),
      ...(body.phone ? [{ factKey: "phone" as const, value: body.phone }] : []),
      ...(body.email ? [{ factKey: "email" as const, value: body.email }] : []),
      ...(body.location?.city
        ? [{ factKey: "city" as const, value: body.location.city }]
        : []),
      ...(body.location?.state
        ? [{ factKey: "state" as const, value: body.location.state }]
        : []),
      ...(body.location?.address
        ? [{ factKey: "address" as const, value: body.location.address }]
        : []),
      ...(body.location?.mapUrl
        ? [{ factKey: "mapUrl" as const, value: body.location.mapUrl }]
        : []),
    ];
    if (facts.length > 0) {
      await createKnowledgeFacts({
        businessId: business.id,
        source: {
          kind: "OWNER",
          displayLabel: "Onboarding correction",
          metadata: { entry: "business-update" },
        },
        facts: facts.map((fact) => ({
          ...fact,
          confidence: 1,
          approvalStatus: canApprove ? ("APPROVED" as const) : ("SUGGESTED" as const),
          evidenceClass: "HOST_DECLARED" as const,
        })),
        actorId: canApprove ? user.id : undefined,
      });
    }

    return NextResponse.json({ business: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof BusinessCapabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Update business error:", error);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
