import { prisma } from "@/lib/db";
import { USE_CASES } from "@/lib/marketing/landing-content";
import {
  defaultImageFraming,
  type LandingUseCaseTile,
} from "@/lib/marketing/use-case-types";

function mapRow(row: {
  id: string;
  industry: string;
  imageUrl: string;
  imageAlt: string;
  tap: string;
  opens: string;
  action: string;
  captures: string;
  imageFit: string;
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
  imagePanelPercent: number;
  sortOrder: number;
  enabled: boolean;
}): LandingUseCaseTile {
  return {
    id: row.id,
    industry: row.industry,
    image: row.imageUrl,
    imageAlt: row.imageAlt,
    tap: row.tap,
    opens: row.opens,
    action: row.action,
    captures: row.captures,
    imageFit: row.imageFit === "contain" ? "contain" : "cover",
    imagePositionX: row.imagePositionX,
    imagePositionY: row.imagePositionY,
    imageScale: row.imageScale,
    imagePanelPercent: row.imagePanelPercent,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
  };
}

/** Static defaults used when DB is empty or unavailable. */
export function staticUseCaseTiles(): LandingUseCaseTile[] {
  const framing = defaultImageFraming();
  return USE_CASES.map((u, i) => ({
    id: `static-${i}`,
    industry: u.industry,
    image: u.image,
    imageAlt: u.imageAlt,
    tap: u.tap,
    opens: u.opens,
    action: u.action,
    captures: u.captures,
    ...framing,
    sortOrder: i,
    enabled: true,
  }));
}

/** Seed DB from static USE_CASES when the table is empty. */
export async function ensureLandingUseCasesSeeded(): Promise<void> {
  const count = await prisma.landingUseCase.count();
  if (count > 0) return;

  const framing = defaultImageFraming();
  await prisma.landingUseCase.createMany({
    data: USE_CASES.map((u, i) => ({
      industry: u.industry,
      imageUrl: u.image,
      imageAlt: u.imageAlt,
      tap: u.tap,
      opens: u.opens,
      action: u.action,
      captures: u.captures,
      ...framing,
      sortOrder: i,
      enabled: true,
    })),
  });
}

/** All tiles for admin (including disabled), ordered. */
export async function listLandingUseCases(): Promise<LandingUseCaseTile[]> {
  await ensureLandingUseCasesSeeded();
  const rows = await prisma.landingUseCase.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapRow);
}

/** Enabled tiles for the public landing page. Falls back to static if DB fails. */
export async function getPublicLandingUseCases(): Promise<LandingUseCaseTile[]> {
  try {
    await ensureLandingUseCasesSeeded();
    const rows = await prisma.landingUseCase.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    if (rows.length === 0) return staticUseCaseTiles();
    return rows.map(mapRow);
  } catch (error) {
    console.error("getPublicLandingUseCases", error);
    return staticUseCaseTiles();
  }
}

export type LandingUseCaseInput = {
  id?: string;
  industry: string;
  image: string;
  imageAlt?: string;
  tap?: string;
  opens?: string;
  action?: string;
  captures?: string;
  imageFit?: "cover" | "contain";
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
  imagePanelPercent?: number;
  sortOrder?: number;
  enabled?: boolean;
};

/** Replace the full tile set (used by admin Save). */
export async function replaceLandingUseCases(
  tiles: LandingUseCaseInput[]
): Promise<LandingUseCaseTile[]> {
  const framing = defaultImageFraming();

  await prisma.$transaction(async (tx) => {
    await tx.landingUseCase.deleteMany();
    if (tiles.length === 0) return;

    for (const [i, t] of tiles.entries()) {
      const keepId =
        t.id && !t.id.startsWith("static-") && !t.id.startsWith("new-") ? t.id : undefined;
      await tx.landingUseCase.create({
        data: {
          ...(keepId ? { id: keepId } : {}),
          industry: t.industry.trim() || "Untitled",
          imageUrl: t.image.trim(),
          imageAlt: t.imageAlt?.trim() ?? "",
          tap: t.tap?.trim() ?? "",
          opens: t.opens?.trim() ?? "",
          action: t.action?.trim() ?? "",
          captures: t.captures?.trim() ?? "",
          imageFit: t.imageFit === "contain" ? "contain" : "cover",
          imagePositionX: clampInt(t.imagePositionX ?? framing.imagePositionX, 0, 100),
          imagePositionY: clampInt(t.imagePositionY ?? framing.imagePositionY, 0, 100),
          imageScale: clampFloat(t.imageScale ?? framing.imageScale, 0.5, 3),
          imagePanelPercent: clampInt(
            t.imagePanelPercent ?? framing.imagePanelPercent,
            20,
            55
          ),
          sortOrder: t.sortOrder ?? i,
          enabled: t.enabled !== false,
        },
      });
    }
  });

  return listLandingUseCases();
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
