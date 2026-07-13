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
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export async function PATCH(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());
    const { logoUrl, googleReviewUrl, email, ...brandFields } = body;

    const brandKit = await prisma.brandKit.upsert({
      where: { businessId: business.id },
      create: { businessId: business.id, ...brandFields },
      update: brandFields,
    });

    if (googleReviewUrl !== undefined || logoUrl !== undefined || email !== undefined) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          ...(googleReviewUrl !== undefined ? { googleReviewUrl } : {}),
          ...(logoUrl !== undefined ? { logoUrl } : {}),
          ...(email !== undefined ? { email } : {}),
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
