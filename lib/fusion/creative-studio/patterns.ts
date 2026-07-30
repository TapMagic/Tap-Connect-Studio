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
];

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

