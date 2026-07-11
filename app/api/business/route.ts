import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { createBusinessWithDefaults } from "@/lib/services/campaigns";
import { slugify } from "@/lib/utils/app";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();

    if (user.memberships.length > 0) {
      return NextResponse.json({ error: "Business already exists" }, { status: 400 });
    }

    const body = schema.parse(await request.json());
    let slug = slugify(body.name);

    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const business = await createBusinessWithDefaults({
      name: body.name,
      slug,
      userId: user.id,
      website: body.website || undefined,
      phone: body.phone,
    });

    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("Create business error:", error);
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
  }
}
