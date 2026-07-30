import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  recordPublicationSnapshot,
  snapshotCardBeforeUpdate,
  type CardPublishManifest,
} from "@/lib/fusion/publication/snapshots";
import type { Prisma } from "@prisma/client";

const schema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  fontStyle: z.enum(["MODERN", "CLASSIC", "PLAYFUL", "PREMIUM", "MINIMAL"]).optional(),
  buttonStyle: z.enum(["ROUNDED", "PILL", "SHARP", "SOFT"]).optional(),
  defaultLanguage: z.string().optional(),
  tone: z.string().optional(),
  defaultDisclaimer: z.string().nullable().optional(),
  ageGateEnabled: z.boolean().optional(),
  ageGateMinAge: z.number().optional(),
  googleReviewUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  logoMediaAssetId: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  contactProfile: z
    .object({
      displayName: z.string().optional(),
      jobTitle: z.string().optional(),
      organization: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      note: z.string().optional(),
      photoUrl: z.string().optional(),
      socials: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  endExperience: z.any().optional(),
  emailPromo: z.any().optional(),
  otherLinks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        href: z.string(),
        /** Prefer logo art when set */
        logoUrl: z.string().optional(),
        iconUrl: z.string().optional(),
        icon: z.string().optional(),
        iconColor: z.string().optional(),
        platform: z.string().optional(),
      })
    )
    .optional(),
  tapCard: z.any().optional(),
});

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const brandKit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
    const assets = await prisma.mediaAsset.findMany({
      where: { businessId: business.id, approvalStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, url: true, approvalStatus: true },
    });
    return NextResponse.json({
      brandKit,
      businessName: business.name,
      logoUrl: business.logoUrl,
      logoOptions: [business.logoUrl, ...assets.map((a) => a.url)].filter(Boolean),
      approvedLogoAssets: assets,
    });
  } catch (error) {
    console.error("Brand get error:", error);
    return NextResponse.json({ error: "Failed to load brand kit" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = schema.parse(await request.json());
    const {
      logoUrl,
      logoMediaAssetId,
      googleReviewUrl,
      email,
      website,
      phone,
      contactProfile,
      endExperience,
      emailPromo,
      otherLinks,
      tapCard,
      ...brandFields
    } = body;

    let resolvedLogoUrl = logoUrl;
    if (logoMediaAssetId) {
      const approvedAsset = await prisma.mediaAsset.findFirst({
        where: {
          id: logoMediaAssetId,
          businessId: business.id,
          approvalStatus: "APPROVED",
        },
        select: { url: true },
      });
      if (!approvedAsset) {
        return NextResponse.json(
          { error: "Approve this Brand asset before making it the primary logo." },
          { status: 409 }
        );
      }
      resolvedLogoUrl = approvedAsset.url;
    } else if (
      logoUrl !== undefined &&
      logoUrl !== null &&
      logoUrl !== business.logoUrl
    ) {
      return NextResponse.json(
        { error: "A tenant-owned approved mediaAssetId is required for a new primary logo." },
        { status: 400 }
      );
    }

    const existingKit = await prisma.brandKit.findUnique({
      where: { businessId: business.id },
    });

    if (tapCard !== undefined && existingKit) {
      await snapshotCardBeforeUpdate({
        businessId: business.id,
        brandKitId: existingKit.id,
        tapCard: existingKit.tapCard,
        label: "pre-save",
        publishedById: user.id,
      });
    }

    const jsonExtras: Prisma.BrandKitUpdateInput = {
      ...(endExperience !== undefined
        ? { endExperience: endExperience as Prisma.InputJsonValue }
        : {}),
      ...(emailPromo !== undefined ? { emailPromo: emailPromo as Prisma.InputJsonValue } : {}),
      ...(otherLinks !== undefined ? { otherLinks: otherLinks as Prisma.InputJsonValue } : {}),
      ...(tapCard !== undefined ? { tapCard: tapCard as Prisma.InputJsonValue } : {}),
    };

    const brandKit = await prisma.brandKit.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        ...brandFields,
        ...(contactProfile ? { socialLinks: contactProfile } : {}),
        ...(endExperience !== undefined
          ? { endExperience: endExperience as Prisma.InputJsonValue }
          : {}),
        ...(emailPromo !== undefined ? { emailPromo: emailPromo as Prisma.InputJsonValue } : {}),
        ...(otherLinks !== undefined ? { otherLinks: otherLinks as Prisma.InputJsonValue } : {}),
        ...(tapCard !== undefined ? { tapCard: tapCard as Prisma.InputJsonValue } : {}),
      },
      update: {
        ...brandFields,
        ...(contactProfile ? { socialLinks: contactProfile } : {}),
        ...jsonExtras,
      },
    });

    if (
      googleReviewUrl !== undefined ||
      resolvedLogoUrl !== undefined ||
      email !== undefined ||
      website !== undefined ||
      phone !== undefined
    ) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          ...(googleReviewUrl !== undefined ? { googleReviewUrl } : {}),
          ...(resolvedLogoUrl !== undefined ? { logoUrl: resolvedLogoUrl } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(website !== undefined ? { website } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
    }

    let snapshot = null;
    if (tapCard !== undefined) {
      const manifest: CardPublishManifest = {
        kind: "card",
        tapCard: brandKit.tapCard,
        label: "save",
      };
      const recorded = await recordPublicationSnapshot({
        businessId: business.id,
        subjectType: "card",
        subjectId: brandKit.id,
        manifest,
        publishedById: user.id,
      });
      snapshot = {
        id: recorded.snapshot.id,
        version: recorded.snapshot.version,
        label: recorded.snapshot.label,
        created: recorded.created,
      };
    }

    return NextResponse.json({
      brandKit,
      logoUrl: resolvedLogoUrl ?? business.logoUrl,
      email: email ?? business.email,
      snapshot,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Brand Kit data" }, { status: 400 });
    }
    console.error("Brand kit update error:", error);
    return NextResponse.json({ error: "Failed to update brand kit" }, { status: 500 });
  }
}
