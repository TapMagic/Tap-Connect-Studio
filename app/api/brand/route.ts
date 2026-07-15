import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
        iconUrl: z.string().optional(),
        href: z.string(),
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
      where: { businessId: business.id, source: "upload" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { url: true },
    });
    return NextResponse.json({
      brandKit,
      businessName: business.name,
      logoUrl: business.logoUrl,
      logoOptions: [business.logoUrl, ...assets.map((a) => a.url)].filter(Boolean),
    });
  } catch (error) {
    console.error("Brand get error:", error);
    return NextResponse.json({ error: "Failed to load brand kit" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());
    const {
      logoUrl,
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
      logoUrl !== undefined ||
      email !== undefined ||
      website !== undefined ||
      phone !== undefined
    ) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          ...(googleReviewUrl !== undefined ? { googleReviewUrl } : {}),
          ...(logoUrl !== undefined ? { logoUrl } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(website !== undefined ? { website } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
    }

    return NextResponse.json({
      brandKit,
      logoUrl: logoUrl ?? business.logoUrl,
      email: email ?? business.email,
    });
  } catch (error) {
    console.error("Brand kit update error:", error);
    return NextResponse.json({ error: "Failed to update brand kit" }, { status: 500 });
  }
}
