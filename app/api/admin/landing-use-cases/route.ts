import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth";
import {
  listLandingUseCases,
  replaceLandingUseCases,
} from "@/lib/services/landing-use-cases";

const tileSchema = z.object({
  id: z.string().optional(),
  industry: z.string().min(1).max(120),
  image: z.string(),
  imageAlt: z.string().max(240).optional().default(""),
  tap: z.string().max(240).optional().default(""),
  opens: z.string().max(240).optional().default(""),
  action: z.string().max(240).optional().default(""),
  captures: z.string().max(240).optional().default(""),
  imageFit: z.enum(["cover", "contain"]).optional().default("cover"),
  imagePositionX: z.number().min(0).max(100).optional().default(50),
  imagePositionY: z.number().min(0).max(100).optional().default(50),
  imageScale: z.number().min(0.5).max(3).optional().default(1),
  imagePanelPercent: z.number().min(20).max(55).optional().default(38),
  glowColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional()
    .default("#3b82f6"),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional().default(true),
});

const putSchema = z.object({
  tiles: z.array(tileSchema).max(48),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const tiles = await listLandingUseCases();
    return NextResponse.json({ tiles });
  } catch (error) {
    console.error("landing-use-cases GET", error);
    return NextResponse.json({ error: "Failed to load tiles" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = putSchema.parse(await request.json());
    const tiles = await replaceLandingUseCases(body.tiles);
    return NextResponse.json({ ok: true, tiles });
  } catch (error) {
    console.error("landing-use-cases PUT", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid tile data", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save tiles" }, { status: 500 });
  }
}
