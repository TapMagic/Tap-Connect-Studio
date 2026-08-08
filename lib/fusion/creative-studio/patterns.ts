export type SurfacePatternKind = "pattern" | "texture";

export type SurfacePatternModel = {
  version: 1;
  id: string;
  kind: SurfacePatternKind;
  scale: number;
  rotation: number;
  opacity: number;
  foreground: string;
  background: string;
  blendMode:
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "soft-light";
};

export type SurfacePatternDefinition = {
  id: string;
  label: string;
  category: string;
  kind: SurfacePatternKind;
  css: (model: SurfacePatternModel) => {
    backgroundColor: string;
    backgroundImage: string;
    backgroundSize?: string;
  };
};

function withAlpha(color: string, opacity: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  return `${color}${Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function scaled(value: number, base: number): string {
  return `${Math.max(4, Math.round(base * value))}px`;
}

export const SURFACE_PATTERN_CATALOG: SurfacePatternDefinition[] = [
  {
    id: "subtle-grain",
    label: "Subtle Grain",
    category: "Brand-safe neutral",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(${withAlpha(m.foreground, m.opacity)} 0.7px, transparent 0.7px)`,
      backgroundSize: `${scaled(m.scale, 5)} ${scaled(m.scale, 5)}`,
    }),
  },
  {
    id: "paper-fiber",
    label: "Paper Fiber",
    category: "Paper",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `repeating-linear-gradient(8deg, transparent 0 3px, ${withAlpha(m.foreground, m.opacity * 0.45)} 4px)`,
    }),
  },
  {
    id: "linen",
    label: "Linen",
    category: "Fabric",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `repeating-linear-gradient(0deg, transparent 0 3px, ${withAlpha(m.foreground, m.opacity * 0.5)} 4px), repeating-linear-gradient(90deg, transparent 0 3px, ${withAlpha(m.foreground, m.opacity * 0.35)} 4px)`,
      backgroundSize: `${scaled(m.scale, 8)} ${scaled(m.scale, 8)}`,
    }),
  },
  {
    id: "concrete",
    label: "Concrete",
    category: "Concrete",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(circle at 20% 30%, ${withAlpha(m.foreground, m.opacity)} 0 1px, transparent 2px), radial-gradient(circle at 75% 65%, ${withAlpha(m.foreground, m.opacity * 0.7)} 0 1px, transparent 2px)`,
      backgroundSize: `${scaled(m.scale, 24)} ${scaled(m.scale, 24)}`,
    }),
  },
  {
    id: "canvas-weave",
    label: "Canvas Weave",
    category: "Canvas",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `linear-gradient(45deg, ${withAlpha(m.foreground, m.opacity)} 25%, transparent 25% 75%, ${withAlpha(m.foreground, m.opacity)} 75%), linear-gradient(45deg, ${withAlpha(m.foreground, m.opacity)} 25%, transparent 25% 75%, ${withAlpha(m.foreground, m.opacity)} 75%)`,
      backgroundSize: `${scaled(m.scale, 8)} ${scaled(m.scale, 8)}`,
    }),
  },
  {
    id: "leather",
    label: "Leather",
    category: "Leather",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(ellipse at center, transparent 45%, ${withAlpha(m.foreground, m.opacity)} 48% 52%, transparent 55%)`,
      backgroundSize: `${scaled(m.scale, 18)} ${scaled(m.scale, 12)}`,
    }),
  },
  {
    id: "dots",
    label: "Dots",
    category: "Dots",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(circle, ${withAlpha(m.foreground, m.opacity)} 0 22%, transparent 24%)`,
      backgroundSize: `${scaled(m.scale, 18)} ${scaled(m.scale, 18)}`,
    }),
  },
  {
    id: "pinstripes",
    label: "Pinstripes",
    category: "Stripes",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `repeating-linear-gradient(${m.rotation}deg, transparent 0 ${scaled(m.scale, 10)}, ${withAlpha(m.foreground, m.opacity)} ${scaled(m.scale, 10)} ${scaled(m.scale, 12)})`,
    }),
  },
  {
    id: "editorial-grid",
    label: "Editorial Grid",
    category: "Grids",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `linear-gradient(${withAlpha(m.foreground, m.opacity)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(m.foreground, m.opacity)} 1px, transparent 1px)`,
      backgroundSize: `${scaled(m.scale, 24)} ${scaled(m.scale, 24)}`,
    }),
  },
  {
    id: "checks",
    label: "Checks",
    category: "Checks",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `conic-gradient(${withAlpha(m.foreground, m.opacity)} 25%, transparent 0 50%, ${withAlpha(m.foreground, m.opacity)} 0 75%, transparent 0)`,
      backgroundSize: `${scaled(m.scale, 24)} ${scaled(m.scale, 24)}`,
    }),
  },
  {
    id: "soft-waves",
    label: "Soft Waves",
    category: "Waves",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(ellipse at 50% 100%, transparent 55%, ${withAlpha(m.foreground, m.opacity)} 57% 60%, transparent 62%)`,
      backgroundSize: `${scaled(m.scale, 36)} ${scaled(m.scale, 20)}`,
    }),
  },
  {
    id: "botanical-leaf",
    label: "Botanical Leaf",
    category: "Botanical",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(ellipse at 30% 50%, ${withAlpha(m.foreground, m.opacity)} 0 18%, transparent 20%), radial-gradient(ellipse at 70% 50%, ${withAlpha(m.foreground, m.opacity)} 0 18%, transparent 20%)`,
      backgroundSize: `${scaled(m.scale, 42)} ${scaled(m.scale, 30)}`,
    }),
  },
  {
    id: "holiday-stars",
    label: "Holiday Stars",
    category: "Seasonal",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `radial-gradient(circle, ${withAlpha(m.foreground, m.opacity)} 0 10%, transparent 12%)`,
      backgroundSize: `${scaled(m.scale, 28)} ${scaled(m.scale, 28)}`,
    }),
  },
  {
    id: "family-confetti",
    label: "Friendly Confetti",
    category: "Child/family friendly",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `linear-gradient(35deg, transparent 45%, ${withAlpha(m.foreground, m.opacity)} 47% 53%, transparent 55%)`,
      backgroundSize: `${scaled(m.scale, 22)} ${scaled(m.scale, 18)}`,
    }),
  },
  {
    id: "premium-editorial",
    label: "Premium Editorial",
    category: "Premium editorial",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `linear-gradient(120deg, transparent 0 46%, ${withAlpha(m.foreground, m.opacity)} 47% 49%, transparent 50% 100%)`,
      backgroundSize: `${scaled(m.scale, 44)} ${scaled(m.scale, 44)}`,
    }),
  },
  {
    id: "brick",
    label: "Brick",
    category: "Architectural",
    kind: "pattern",
    css: (m) => {
      const mortar = withAlpha(m.foreground, m.opacity * 0.9);
      const unitW = Math.max(16, Math.round(28 * m.scale));
      const unitH = Math.max(10, Math.round(14 * m.scale));
      return {
        backgroundColor: m.background,
        backgroundImage: `
          linear-gradient(${mortar} ${Math.max(1, Math.round(unitH * 0.08))}px, transparent 0),
          linear-gradient(90deg, ${mortar} ${Math.max(1, Math.round(unitW * 0.05))}px, transparent 0)
        `,
        backgroundSize: `${unitW}px ${unitH}px, ${unitW}px ${unitH}px`,
      };
    },
  },
  {
    id: "marble",
    label: "Marble",
    category: "Architectural",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        radial-gradient(ellipse at 20% 30%, ${withAlpha(m.foreground, m.opacity * 0.55)} 0 8%, transparent 22%),
        radial-gradient(ellipse at 70% 60%, ${withAlpha(m.foreground, m.opacity * 0.4)} 0 10%, transparent 28%),
        linear-gradient(118deg, transparent 40%, ${withAlpha(m.foreground, m.opacity * 0.35)} 48%, transparent 56%),
        linear-gradient(62deg, transparent 35%, ${withAlpha(m.foreground, m.opacity * 0.25)} 52%, transparent 65%)
      `,
      backgroundSize: `${scaled(m.scale, 120)} ${scaled(m.scale, 90)}, ${scaled(m.scale, 100)} ${scaled(m.scale, 80)}, ${scaled(m.scale, 90)} ${scaled(m.scale, 70)}, ${scaled(m.scale, 110)} ${scaled(m.scale, 85)}`,
    }),
  },
  {
    id: "wood-grain",
    label: "Wood Grain",
    category: "Architectural",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        repeating-linear-gradient(90deg, transparent 0 6px, ${withAlpha(m.foreground, m.opacity * 0.22)} 7px 8px),
        repeating-linear-gradient(88deg, transparent 0 18px, ${withAlpha(m.foreground, m.opacity * 0.35)} 19px 21px),
        repeating-linear-gradient(92deg, transparent 0 11px, ${withAlpha(m.foreground, m.opacity * 0.18)} 12px)
      `,
      backgroundSize: `${scaled(m.scale, 40)} 100%, ${scaled(m.scale, 56)} 100%, ${scaled(m.scale, 28)} 100%`,
    }),
  },
  {
    id: "baroque",
    label: "Baroque",
    category: "Ornamental",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        radial-gradient(circle at 25% 25%, ${withAlpha(m.foreground, m.opacity)} 0 6%, transparent 8%),
        radial-gradient(circle at 75% 25%, ${withAlpha(m.foreground, m.opacity)} 0 6%, transparent 8%),
        radial-gradient(circle at 25% 75%, ${withAlpha(m.foreground, m.opacity)} 0 6%, transparent 8%),
        radial-gradient(circle at 75% 75%, ${withAlpha(m.foreground, m.opacity)} 0 6%, transparent 8%),
        radial-gradient(circle at 50% 50%, transparent 28%, ${withAlpha(m.foreground, m.opacity * 0.7)} 30% 34%, transparent 36%)
      `,
      backgroundSize: `${scaled(m.scale, 48)} ${scaled(m.scale, 48)}`,
    }),
  },
  {
    id: "hex",
    label: "Hex Mesh",
    category: "Graphic / micro",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        linear-gradient(30deg, ${withAlpha(m.foreground, m.opacity)} 1px, transparent 1.5px),
        linear-gradient(90deg, ${withAlpha(m.foreground, m.opacity)} 1px, transparent 1.5px),
        linear-gradient(150deg, ${withAlpha(m.foreground, m.opacity)} 1px, transparent 1.5px)
      `,
      backgroundSize: `${scaled(m.scale, 22)} ${scaled(m.scale, 38)}`,
    }),
  },
  {
    id: "chevron",
    label: "Chevron",
    category: "Graphic / micro",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        repeating-linear-gradient(135deg, ${withAlpha(m.foreground, m.opacity)} 0 8px, transparent 8px 16px),
        repeating-linear-gradient(45deg, ${withAlpha(m.foreground, m.opacity * 0.85)} 0 8px, transparent 8px 16px)
      `,
      backgroundSize: `${scaled(m.scale, 32)} ${scaled(m.scale, 32)}`,
    }),
  },
  {
    id: "brushed-metal",
    label: "Brushed Metal",
    category: "Industrial",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        repeating-linear-gradient(90deg, transparent 0 1px, ${withAlpha(m.foreground, m.opacity * 0.35)} 1px 2px),
        linear-gradient(180deg, ${withAlpha("#ffffff", m.opacity * 0.2)}, transparent 40%, ${withAlpha("#000000", m.opacity * 0.25)})
      `,
      backgroundSize: `${scaled(m.scale, 6)} 100%, 100% 100%`,
    }),
  },
  {
    id: "kraft",
    label: "Kraft",
    category: "Paper",
    kind: "texture",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        radial-gradient(circle at 15% 40%, ${withAlpha(m.foreground, m.opacity * 0.45)} 0 0.8px, transparent 1.2px),
        radial-gradient(circle at 70% 20%, ${withAlpha(m.foreground, m.opacity * 0.35)} 0 0.7px, transparent 1.1px),
        repeating-linear-gradient(12deg, transparent 0 5px, ${withAlpha(m.foreground, m.opacity * 0.2)} 6px)
      `,
      backgroundSize: `${scaled(m.scale, 18)} ${scaled(m.scale, 18)}, ${scaled(m.scale, 22)} ${scaled(m.scale, 16)}, ${scaled(m.scale, 40)} ${scaled(m.scale, 28)}`,
    }),
  },
  {
    id: "damask",
    label: "Damask",
    category: "Ornamental",
    kind: "pattern",
    css: (m) => ({
      backgroundColor: m.background,
      backgroundImage: `
        radial-gradient(ellipse at 50% 20%, ${withAlpha(m.foreground, m.opacity)} 0 12%, transparent 14%),
        radial-gradient(ellipse at 50% 80%, ${withAlpha(m.foreground, m.opacity)} 0 12%, transparent 14%),
        radial-gradient(circle at 20% 50%, ${withAlpha(m.foreground, m.opacity * 0.8)} 0 8%, transparent 10%),
        radial-gradient(circle at 80% 50%, ${withAlpha(m.foreground, m.opacity * 0.8)} 0 8%, transparent 10%)
      `,
      backgroundSize: `${scaled(m.scale, 56)} ${scaled(m.scale, 56)}`,
    }),
  },
];

/** Map material-engine texture tokens onto catalog pattern ids for live rendering. */
export function textureTokenToPatternId(texture: string | undefined | null): string | null {
  if (!texture) return null;
  const key = String(texture).toLowerCase().replaceAll("_", "-");
  const map: Record<string, string> = {
    linen: "linen",
    leather: "leather",
    kraft: "kraft",
    paper: "paper-fiber",
    grain: "subtle-grain",
    noise: "subtle-grain",
    brushed: "brushed-metal",
    "brushed-metal": "brushed-metal",
    stamped: "checks",
    concrete: "concrete",
    canvas: "canvas-weave",
    "canvas-weave": "canvas-weave",
    brick: "brick",
    marble: "marble",
    "wood-grain": "wood-grain",
    baroque: "baroque",
    damask: "damask",
  };
  return map[key] || (SURFACE_PATTERN_CATALOG.some((item) => item.id === key) ? key : null);
}

export function surfacePatternFromTextureToken(
  texture: string | undefined | null,
  options?: { foreground?: string; background?: string; opacity?: number; scale?: number }
): SurfacePatternModel | null {
  const id = textureTokenToPatternId(texture);
  if (!id) return null;
  const definition = SURFACE_PATTERN_CATALOG.find((item) => item.id === id);
  if (!definition) return null;
  return {
    version: 1,
    id,
    kind: definition.kind,
    scale: options?.scale ?? 1,
    rotation: 0,
    opacity: options?.opacity ?? 0.28,
    foreground: options?.foreground || "#ffffff",
    background: options?.background || "#1f2937",
    blendMode: "normal",
  };
}

export const DEFAULT_SURFACE_PATTERN: SurfacePatternModel = {
  version: 1,
  id: "subtle-grain",
  kind: "texture",
  scale: 1,
  rotation: 0,
  opacity: 0.22,
  foreground: "#ffffff",
  background: "#0b0f19",
  blendMode: "normal",
};

export function surfacePatternStyle(model: SurfacePatternModel) {
  const definition =
    SURFACE_PATTERN_CATALOG.find((item) => item.id === model.id) ||
    SURFACE_PATTERN_CATALOG[0];
  return {
    ...definition.css(model),
    backgroundBlendMode: model.blendMode,
  };
}

