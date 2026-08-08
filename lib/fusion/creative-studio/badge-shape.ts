/**
 * Canonical Badge shape geometry — one authority for library, post-insert picker, and canvas.
 * No two visible shapes may share a geometry signature.
 */

export type BadgeShapeId =
  | "pill"
  | "circle"
  | "rounded"
  | "burst"
  | "starburst"
  | "ribbon"
  | "corner-ribbon"
  | "seal"
  | "ticket"
  | "tag"
  | "shield"
  | "hexagon"
  | "square";

export type BadgeShapeDef = {
  id: BadgeShapeId;
  label: string;
  /** Default radius when shape is applied (clipPath shapes use 0). */
  radius: number;
  /** CSS clip-path polygon, or null for border-radius shapes. */
  clipPath: string | null;
  /** border-radius CSS when clipPath is null. */
  borderRadius: string | number;
  /** Stable geometry signature for uniqueness audits. */
  geometrySignature: string;
};

/** Burst: 8 soft points. Starburst: 12 sharp points — genuinely distinct. */
const BURST_CLIP =
  "polygon(50% 0%,63% 22%,88% 12%,78% 38%,100% 50%,78% 62%,88% 88%,63% 78%,50% 100%,37% 78%,12% 88%,22% 62%,0% 50%,22% 38%,12% 12%,37% 22%)";
const STARBURST_CLIP =
  "polygon(50% 0%,56% 18%,78% 2%,68% 24%,98% 20%,74% 38%,100% 50%,74% 62%,98% 80%,68% 76%,78% 98%,56% 82%,50% 100%,44% 82%,22% 98%,32% 76%,2% 80%,26% 62%,0% 50%,26% 38%,2% 20%,32% 24%,22% 2%,44% 18%)";

export const BADGE_SHAPE_DEFS: readonly BadgeShapeDef[] = [
  { id: "pill", label: "Pill", radius: 999, clipPath: null, borderRadius: 999, geometrySignature: "radius:999|ellipse" },
  { id: "circle", label: "Round", radius: 999, clipPath: null, borderRadius: "50%", geometrySignature: "radius:50%|circle" },
  { id: "rounded", label: "Rounded", radius: 14, clipPath: null, borderRadius: 14, geometrySignature: "radius:14|rect" },
  { id: "square", label: "Square", radius: 0, clipPath: null, borderRadius: 0, geometrySignature: "radius:0|rect" },
  {
    id: "seal",
    label: "Seal",
    radius: 0,
    clipPath:
      "polygon(50% 0%,58% 8%,68% 2%,72% 12%,84% 10%,84% 22%,96% 28%,90% 38%,100% 50%,90% 62%,96% 72%,84% 78%,84% 90%,72% 88%,68% 98%,58% 92%,50% 100%,42% 92%,32% 98%,28% 88%,16% 90%,16% 78%,4% 72%,10% 62%,0% 50%,10% 38%,4% 28%,16% 22%,16% 10%,28% 12%,32% 2%,42% 8%)",
    borderRadius: 0,
    geometrySignature: "clip:seal-scallop",
  },
  { id: "burst", label: "Burst", radius: 0, clipPath: BURST_CLIP, borderRadius: 0, geometrySignature: `clip:${BURST_CLIP}` },
  { id: "starburst", label: "Starburst", radius: 0, clipPath: STARBURST_CLIP, borderRadius: 0, geometrySignature: `clip:${STARBURST_CLIP}` },
  {
    id: "ribbon",
    label: "Ribbon",
    radius: 0,
    clipPath: "polygon(8% 0,92% 0,82% 50%,92% 100%,8% 100%,18% 50%)",
    borderRadius: 0,
    geometrySignature: "clip:ribbon-v",
  },
  {
    id: "corner-ribbon",
    label: "Corner ribbon",
    radius: 0,
    clipPath: "polygon(0 0,100% 0,100% 28%,72% 28%,100% 55%,0 55%)",
    borderRadius: 0,
    geometrySignature: "clip:corner-ribbon",
  },
  {
    id: "shield",
    label: "Shield",
    radius: 0,
    clipPath: "polygon(50% 0,94% 16%,88% 65%,50% 100%,12% 65%,6% 16%)",
    borderRadius: 0,
    geometrySignature: "clip:shield",
  },
  {
    id: "ticket",
    label: "Ticket",
    radius: 0,
    clipPath:
      "polygon(8% 0,92% 0,92% 12%,100% 20%,92% 28%,92% 72%,100% 80%,92% 88%,92% 100%,8% 100%,8% 88%,0 80%,8% 72%,8% 28%,0 20%,8% 12%)",
    borderRadius: 0,
    geometrySignature: "clip:ticket",
  },
  {
    id: "tag",
    label: "Tag",
    radius: 4,
    clipPath: "polygon(0 0,82% 0,100% 50%,82% 100%,0 100%,10% 50%)",
    borderRadius: 0,
    geometrySignature: "clip:tag",
  },
  {
    id: "hexagon",
    label: "Hexagon",
    radius: 0,
    clipPath: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)",
    borderRadius: 0,
    geometrySignature: "clip:hexagon",
  },
] as const;

const BY_ID = new Map(BADGE_SHAPE_DEFS.map((def) => [def.id, def]));

export function getBadgeShapeDef(id: string | null | undefined): BadgeShapeDef {
  const normalized = String(id || "pill").replaceAll("_", "-") as BadgeShapeId;
  return BY_ID.get(normalized) || BY_ID.get("pill")!;
}

export function badgeShapeClipPath(id: string | null | undefined): string | undefined {
  return getBadgeShapeDef(id).clipPath ?? undefined;
}

export function badgeShapeBorderRadius(id: string | null | undefined, fallbackRadius?: number): string | number {
  const def = getBadgeShapeDef(id);
  if (def.clipPath) return 0;
  if (def.id === "circle") return "50%";
  if (fallbackRadius != null) return fallbackRadius;
  return def.borderRadius;
}

export function badgeShapeProps(id: BadgeShapeId): { badgeShape: BadgeShapeId; radius: number } {
  const def = getBadgeShapeDef(id);
  return { badgeShape: def.id, radius: def.radius };
}

/** Audit: every visible shape must have a unique geometry signature. */
export function auditBadgeGeometryUniqueness(): {
  ok: boolean;
  duplicates: Array<{ signature: string; ids: string[] }>;
} {
  const bySig = new Map<string, string[]>();
  for (const def of BADGE_SHAPE_DEFS) {
    // Seal and pill both use radius 999 discs by design intent for "seal" vs "pill"
    // but seal is presented as a disc with different default wording — give seal a
    // distinct signature already. Flag any true collisions.
    const list = bySig.get(def.geometrySignature) || [];
    list.push(def.id);
    bySig.set(def.geometrySignature, list);
  }
  const duplicates = [...bySig.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([signature, ids]) => ({ signature, ids }));
  return { ok: duplicates.length === 0, duplicates };
}

/** Inline style for a truthful shape preview tile. */
export function badgeShapePreviewStyle(
  id: string,
  fill = "#94a3b8"
): { background: string; borderRadius: string | number; clipPath?: string; width: number; height: number } {
  const def = getBadgeShapeDef(id);
  return {
    background: fill,
    borderRadius: def.clipPath ? 0 : def.borderRadius,
    clipPath: def.clipPath ?? undefined,
    width: 44,
    height: 28,
  };
}
