import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
});

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
      ...brandFields
    } = body;

    const brandKit = await prisma.brandKit.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        ...brandFields,
        ...(contactProfile ? { socialLinks: contactProfile } : {}),
      },
      update: {
        ...brandFields,
        ...(contactProfile ? { socialLinks: contactProfile } : {}),
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
