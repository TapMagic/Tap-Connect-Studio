import { z } from "zod";

export const supportedBlendModeSchema = z.enum([
  "normal",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
]);
export type SupportedBlendMode = z.infer<typeof supportedBlendModeSchema>;

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
const unitSchema = z.number().min(0).max(1);

export const gradientStopSchema = z.object({
  id: z.string().min(1).max(80),
  color: colorSchema,
  position: z.number().min(0).max(100),
  opacity: unitSchema,
});

export const gradientModelSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["linear", "radial", "conic"]),
  angle: z.number().min(0).max(359),
  centerX: z.number().min(0).max(100),
  centerY: z.number().min(0).max(100),
  size: z.number().min(10).max(100).optional(),
  shape: z.enum(["circle", "ellipse"]).optional(),
  stops: z.array(gradientStopSchema).min(2).max(8),
});
export type GradientModel = z.infer<typeof gradientModelSchema>;

export const imageSourceRefSchema = z.object({
  mediaAssetId: z.string().min(1),
  fallbackUrl: z.string().min(1),
  originalWidth: z.number().int().positive().optional(),
  originalHeight: z.number().int().positive().optional(),
});
export type ImageSourceRef = z.infer<typeof imageSourceRefSchema>;

export const imageAdjustmentsSchema = z.object({
  brightness: z.number().min(0).max(2).default(1),
  contrast: z.number().min(0).max(2).default(1),
  saturation: z.number().min(0).max(2).default(1),
  temperature: z.number().min(-1).max(1).default(0),
  tint: z.number().min(-1).max(1).default(0),
  highlights: z.number().min(-1).max(1).default(0),
  shadows: z.number().min(-1).max(1).default(0),
  clarity: z.number().min(-1).max(1).default(0),
  blurPx: z.number().min(0).max(40).default(0),
  vignette: unitSchema.default(0),
});

export const imageTreatmentSchema = z.object({
  crop: z
    .object({
      x: unitSchema,
      y: unitSchema,
      width: unitSchema,
      height: unitSchema,
      aspect: z.string().max(40).optional(),
    })
    .optional(),
  focalPoint: z.object({ x: unitSchema, y: unitSchema }),
  fit: z.enum(["cover", "contain", "fill"]),
  scale: z.number().min(0.1).max(5),
  position: z.object({ x: unitSchema, y: unitSchema }),
  flipX: z.boolean(),
  flipY: z.boolean(),
  rotationDeg: z.number().min(-360).max(360),
  opacity: unitSchema,
  adjustments: imageAdjustmentsSchema,
  filterPresetId: z.string().max(80).optional(),
  duotone: z
    .object({
      shadow: colorSchema,
      highlight: colorSchema,
      strength: unitSchema,
    })
    .optional(),
  altText: z.string().max(500),
  decorative: z.boolean(),
});
export type ImageTreatment = z.infer<typeof imageTreatmentSchema>;

export const backgroundImageTreatmentSchema = imageTreatmentSchema
  .pick({
    focalPoint: true,
    fit: true,
    scale: true,
    position: true,
    opacity: true,
    altText: true,
    decorative: true,
  })
  .extend({
    repeat: z.enum(["no-repeat", "repeat", "repeat-x", "repeat-y"]),
    blurPx: z.number().min(0).max(40),
    tint: colorSchema.optional(),
    overlayOpacity: unitSchema,
    blendMode: supportedBlendModeSchema,
  });
export type BackgroundImageTreatment = z.infer<
  typeof backgroundImageTreatmentSchema
>;

export const surfacePatternSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1).max(80),
  kind: z.enum(["pattern", "texture"]),
  foreground: colorSchema,
  background: colorSchema,
  scale: z.number().min(0.25).max(3),
  rotation: z.number().min(0).max(359),
  opacity: unitSchema,
  blendMode: supportedBlendModeSchema,
});

export const creativeFillSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("solid"), color: colorSchema }),
  z.object({ kind: z.literal("gradient"), gradient: gradientModelSchema }),
  z.object({
    kind: z.literal("image"),
    media: imageSourceRefSchema,
    treatment: backgroundImageTreatmentSchema,
  }),
  z.object({ kind: z.literal("pattern"), pattern: surfacePatternSchema }),
  z.object({ kind: z.literal("texture"), pattern: surfacePatternSchema }),
]);
export type CreativeFill = z.infer<typeof creativeFillSchema>;

export const creativeOutlineSchema = z.object({
  widthPx: z.number().min(0).max(100),
  color: colorSchema,
  opacity: unitSchema,
  style: z.enum(["solid", "dashed", "dotted"]),
  placement: z.enum(["inside", "center", "outside"]),
  radiusPx: z.number().min(0).max(500).optional(),
  scaleMode: z.enum(["scale_with_object", "fixed_px"]),
  baselineShortEdgePx: z.number().positive().optional(),
});
export type CreativeOutline = z.infer<typeof creativeOutlineSchema>;

export const layerMetaSchema = z.object({
  name: z.string().min(1).max(120),
  locked: z.boolean(),
  visible: z.boolean(),
  groupId: z.string().max(80).nullable(),
  aspectLocked: z.boolean(),
  blendMode: supportedBlendModeSchema,
});
export type LayerMeta = z.infer<typeof layerMetaSchema>;

export const shapeGeometrySchema = z.object({
  kind: z.enum([
    "rectangle",
    "rounded",
    "ellipse",
    "triangle",
    "polygon",
    "star",
    "arrow",
    "badge",
    "speech",
    "organic",
  ]),
  parameters: z.record(z.string(), z.number()).optional(),
});

export const shapeNodeSchema = z.object({
  geometry: shapeGeometrySchema,
  fill: creativeFillSchema,
  outline: creativeOutlineSchema.optional(),
  effects: z
    .object({
      shadow: z
        .object({
          x: z.number().min(-100).max(100),
          y: z.number().min(-100).max(100),
          blur: z.number().min(0).max(100),
          spread: z.number().min(-100).max(100),
          color: colorSchema,
          opacity: unitSchema,
        })
        .optional(),
      glow: z
        .object({
          blur: z.number().min(0).max(100),
          color: colorSchema,
          opacity: unitSchema,
        })
        .optional(),
      blendMode: supportedBlendModeSchema.optional(),
    })
    .optional(),
});

export const creativeRenderNodeSchema = z.object({
  id: z.string().min(1).max(120),
  primitive: z.enum(["text", "button", "image", "frame", "shape", "divider", "group"]),
  x: unitSchema,
  y: unitSchema,
  width: z.number().min(0.001).max(1),
  height: z.number().min(0.001).max(1),
  rotationDeg: z.number().min(-360).max(360),
  zIndex: z.number().int(),
  layer: layerMetaSchema,
  props: z.record(z.string(), z.unknown()),
});

export const creativeRenderDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  canvas: z.object({
    aspectRatio: z.number().positive().max(10),
    background: creativeFillSchema,
    safeAreaPx: z.number().min(0).max(200),
  }),
  nodes: z.array(creativeRenderNodeSchema).max(200),
  mobile: z.object({
    policy: z.enum(["scale", "stack", "hide_decorative"]),
    stackGapPx: z.number().min(0).max(200).default(12),
  }),
  accessibility: z.object({ readingOrder: z.array(z.string()).max(200) }),
});
export type CreativeRenderDocument = z.infer<
  typeof creativeRenderDocumentSchema
>;

export const creativeFlowSectionSchema = z.object({
  schemaVersion: z.literal(1),
  layout: z.enum([
    "image_left",
    "image_right",
    "image_top",
    "image_bottom",
    "square_wrap",
  ]),
  image: imageSourceRefSchema,
  imageTreatment: imageTreatmentSchema,
  eyebrow: z.string().max(160).optional(),
  heading: z.string().min(1).max(300),
  body: z.string().max(5000),
  gutterPx: z.number().min(0).max(160),
  imageWidthPercent: z.number().min(20).max(80),
  alignment: z.enum(["start", "center", "end"]),
  mobileStack: z.enum(["image_first", "text_first"]),
  background: creativeFillSchema,
});
export type CreativeFlowSection = z.infer<typeof creativeFlowSectionSchema>;

const textStyleSchema = z.object({
  fontFamily: z.string().min(1).max(160),
  fontSizePx: z.number().min(8).max(300),
  fontWeight: z.number().int().min(100).max(900),
  lineHeight: z.number().min(0.5).max(3),
  letterSpacingEm: z.number().min(-0.2).max(1),
  color: colorSchema,
});

const buttonStyleSchema = z.object({
  fill: creativeFillSchema,
  outline: creativeOutlineSchema.optional(),
  text: textStyleSchema,
  radiusPx: z.number().min(0).max(200),
  paddingX: z.number().min(0).max(200),
  paddingY: z.number().min(0).max(100),
});

const paletteSchema = z.object({
  colors: z.array(z.object({ name: z.string().min(1), color: colorSchema })).min(1).max(24),
});

const maskFavoritesSchema = z.object({
  maskIds: z.array(z.string().min(1).max(80)).max(100),
  recentMaskIds: z.array(z.string().min(1).max(80)).max(24).default([]),
});

export const creativeResourcePayloadSchema = z.object({
  schemaVersion: z.literal(1),
  resourceKind: z.enum([
    "COMPOSITION",
    "TEXT_STYLE",
    "BUTTON_STYLE",
    "FRAME_TREATMENT",
    "GRADIENT",
    "BACKGROUND",
    "PALETTE",
    "MASK_FAVORITES",
    "OFFER_LAYOUT",
    "COUPON_LAYOUT",
    "EMAIL_SECTION",
    "CAMPAIGN_SECTION",
    "TEMPLATE",
  ]),
  value: z.unknown(),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
      tags: z.array(z.string().max(60)).max(20).default([]),
      demo: z.boolean().optional(),
    })
    .default({ tags: [] }),
});

export type CreativeResourcePayload = z.infer<
  typeof creativeResourcePayloadSchema
>;

export function parseCreativeResourcePayload(
  input: unknown
): CreativeResourcePayload {
  const payload = creativeResourcePayloadSchema.parse(input);
  const schemas = {
    COMPOSITION: creativeRenderDocumentSchema,
    TEXT_STYLE: textStyleSchema,
    BUTTON_STYLE: buttonStyleSchema,
    FRAME_TREATMENT: creativeOutlineSchema,
    GRADIENT: gradientModelSchema,
    BACKGROUND: creativeFillSchema,
    PALETTE: paletteSchema,
    MASK_FAVORITES: maskFavoritesSchema,
    OFFER_LAYOUT: creativeFlowSectionSchema,
    COUPON_LAYOUT: creativeFlowSectionSchema,
    EMAIL_SECTION: creativeFlowSectionSchema,
    CAMPAIGN_SECTION: creativeFlowSectionSchema,
    TEMPLATE: creativeRenderDocumentSchema,
  } as const;
  return {
    ...payload,
    value: schemas[payload.resourceKind].parse(payload.value),
  };
}

export const DEFAULT_IMAGE_TREATMENT: ImageTreatment = {
  focalPoint: { x: 0.5, y: 0.5 },
  fit: "cover",
  scale: 1,
  position: { x: 0.5, y: 0.5 },
  flipX: false,
  flipY: false,
  rotationDeg: 0,
  opacity: 1,
  adjustments: {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0,
    clarity: 0,
    blurPx: 0,
    vignette: 0,
  },
  altText: "",
  decorative: false,
};
