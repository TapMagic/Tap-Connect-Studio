import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const schema = z.object({
  iconName: z.string().trim().min(1).max(64),
  iconColor: z
    .string()
    .trim()
    .regex(HEX_COLOR, "iconColor must be a hex color like #000000")
    .default("#000000"),
  /** When set, updates that BrandLink row; otherwise updates BrandKit defaults */
  linkId: z.string().trim().min(1).optional(),
  /** Optional logo URL saved alongside the icon */
  logoUrl: z.string().trim().url().optional().or(z.literal("")).optional(),
  title: z.string().trim().max(120).optional(),
  href: z.string().trim().max(2048).optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = schema.parse(await request.json());

    const iconName = body.iconName;
    const iconColor = body.iconColor || "#000000";
    const logoUrl = body.logoUrl?.trim() || undefined;

    // Ensure BrandKit exists so defaults can be stored
    const brandKit = await prisma.brandKit.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        iconName,
        iconColor,
      },
      update: {
        iconName,
        iconColor,
      },
    });

    if (body.linkId) {
      const existing = await prisma.brandLink.findFirst({
        where: { id: body.linkId, businessId: business.id },
      });

      const link = existing
        ? await prisma.brandLink.update({
            where: { id: existing.id },
            data: {
              iconName,
              iconColor,
              ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
              ...(body.title !== undefined ? { title: body.title } : {}),
              ...(body.href !== undefined ? { href: body.href } : {}),
              brandKitId: brandKit.id,
            },
          })
        : await prisma.brandLink.create({
            data: {
              id: body.linkId,
              businessId: business.id,
              brandKitId: brandKit.id,
              title: body.title || "",
              href: body.href || "",
              iconName,
              iconColor,
              logoUrl: logoUrl || null,
            },
          });

      return NextResponse.json({
        ok: true,
        savedTo: "brandLink",
        iconName,
        iconColor,
        link,
        brandKit: { id: brandKit.id, iconName, iconColor },
      });
    }

    return NextResponse.json({
      ok: true,
      savedTo: "brandKit",
      iconName,
      iconColor,
      brandKit: { id: brandKit.id, iconName, iconColor },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("save-icon error:", error);
    return NextResponse.json({ error: "Failed to save icon" }, { status: 500 });
  }
}
