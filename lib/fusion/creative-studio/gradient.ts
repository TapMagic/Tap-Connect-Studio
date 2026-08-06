export type GradientKind = "linear" | "radial" | "conic";

export type GradientStop = {
  id: string;
  color: string;
  position: number;
  opacity: number;
};

export type GradientModel = {
  version: 1;
  kind: GradientKind;
  angle: number;
  centerX: number;
  centerY: number;
  /** Radial extent percent (50 = circle to edge). */
  size?: number;
  /** Radial shape hint. */
  shape?: "circle" | "ellipse";
  stops: GradientStop[];
};

export const DEFAULT_GRADIENT: GradientModel = {
  version: 1,
  kind: "linear",
  angle: 135,
  centerX: 50,
  centerY: 50,
  size: 50,
  shape: "circle",
  stops: [
    { id: "start", color: "#0b0f19", position: 0, opacity: 1 },
    { id: "end", color: "#22c55e", position: 100, opacity: 1 },
  ],
};

export type GradientCollectionId =
  | "popular"
  | "brand"
  | "subtle"
  | "bold"
  | "luxury"
  | "editorial"
  | "neon"
  | "metallic-inspired"
  | "warm-retail"
  | "cool-professional"
  | "dark"
  | "light"
  | "seasonal";

export const GRADIENT_COLLECTIONS: readonly {
  id: GradientCollectionId;
  label: string;
}[] = [
  { id: "popular", label: "Popular" },
  { id: "brand", label: "Brand" },
  { id: "subtle", label: "Subtle" },
  { id: "bold", label: "Bold" },
  { id: "luxury", label: "Luxury" },
  { id: "editorial", label: "Editorial" },
  { id: "neon", label: "Neon" },
  { id: "metallic-inspired", label: "Metallic-inspired" },
  { id: "warm-retail", label: "Warm retail" },
  { id: "cool-professional", label: "Cool professional" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "seasonal", label: "Seasonal" },
];

function stops(
  pairs: Array<[string, number, string?]>
): GradientStop[] {
  return pairs.map(([color, position, id], index) => ({
    id: id || (index === 0 ? "start" : index === pairs.length - 1 ? "end" : `mid-${index}`),
    color,
    position,
    opacity: 1,
  }));
}

export const GRADIENT_PRESETS: {
  id: string;
  label: string;
  collection: GradientCollectionId;
  gradient: GradientModel;
}[] = [
  { id: "tapconnect-night", label: "TapConnect Night", collection: "brand", gradient: DEFAULT_GRADIENT },
  { id: "editorial-gold", label: "Editorial Gold", collection: "editorial", gradient: { ...DEFAULT_GRADIENT, angle: 110, stops: stops([["#17120a", 0], ["#8b6b20", 55, "middle"], ["#f5d778", 100]]) } },
  { id: "clean-radial", label: "Clean Radial", collection: "cool-professional", gradient: { ...DEFAULT_GRADIENT, kind: "radial", stops: stops([["#334155", 0], ["#020617", 100]]) } },
  { id: "neon-sweep", label: "Neon Sweep", collection: "neon", gradient: { ...DEFAULT_GRADIENT, angle: 90, stops: stops([["#04150a", 0], ["#b8ff2c", 55, "middle"], ["#22d3ee", 100]]) } },
  { id: "luxury-noir", label: "Luxury Noir", collection: "luxury", gradient: { ...DEFAULT_GRADIENT, angle: 160, stops: stops([["#0b0a0f", 0], ["#3b2a1a", 48, "middle"], ["#c9a227", 100]]) } },
  { id: "warm-retail", label: "Warm Retail", collection: "warm-retail", gradient: { ...DEFAULT_GRADIENT, angle: 145, stops: stops([["#3b1c0f", 0], ["#ea580c", 52, "middle"], ["#fde68a", 100]]) } },
  { id: "cool-pro", label: "Cool Professional", collection: "cool-professional", gradient: { ...DEFAULT_GRADIENT, angle: 180, stops: stops([["#0f172a", 0], ["#1e3a5f", 55, "middle"], ["#93c5fd", 100]]) } },
  { id: "subtle-mist", label: "Subtle Mist", collection: "subtle", gradient: { ...DEFAULT_GRADIENT, angle: 120, stops: stops([["#111827", 0], ["#1f2937", 100]]) } },
  { id: "bold-fire", label: "Bold Fire", collection: "bold", gradient: { ...DEFAULT_GRADIENT, angle: 35, stops: stops([["#450a0a", 0], ["#ef4444", 50, "middle"], ["#facc15", 100]]) } },
  { id: "metallic-chrome", label: "Metallic Chrome", collection: "metallic-inspired", gradient: { ...DEFAULT_GRADIENT, angle: 125, stops: stops([["#0f1115", 0], ["#9ca3af", 42, "middle"], ["#f8fafc", 70, "shine"], ["#6b7280", 100]]) } },
  { id: "dark-void", label: "Dark Void", collection: "dark", gradient: { ...DEFAULT_GRADIENT, kind: "radial", centerX: 50, centerY: 30, stops: stops([["#1f2937", 0], ["#020617", 100]]) } },
  { id: "light-paper", label: "Light Paper", collection: "light", gradient: { ...DEFAULT_GRADIENT, angle: 180, stops: stops([["#f8fafc", 0], ["#e2e8f0", 100]]) } },
  { id: "seasonal-ember", label: "Seasonal Ember", collection: "seasonal", gradient: { ...DEFAULT_GRADIENT, kind: "conic", angle: 40, stops: stops([["#7c2d12", 0], ["#ea580c", 35, "middle"], ["#fde68a", 70, "warm"], ["#7c2d12", 100]]) } },
  { id: "popular-aurora", label: "Popular Aurora", collection: "popular", gradient: { ...DEFAULT_GRADIENT, kind: "conic", angle: 210, centerX: 50, centerY: 50, stops: stops([["#0f172a", 0], ["#22d3ee", 33, "a"], ["#a78bfa", 66, "b"], ["#0f172a", 100]]) } },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGradient(value: GradientModel | null | undefined): GradientModel {
  if (!value || value.version !== 1 || !Array.isArray(value.stops)) {
    return structuredClone(DEFAULT_GRADIENT);
  }
  const stopsNormalized = value.stops
    .map((stop, index) => ({
      id: stop.id || `stop-${index}`,
      color: /^#[0-9a-f]{6}$/i.test(stop.color) ? stop.color : "#000000",
      position: clamp(Number(stop.position) || 0, 0, 100),
      opacity: clamp(Number.isFinite(stop.opacity) ? stop.opacity : 1, 0, 1),
    }))
    .sort((a, b) => a.position - b.position);
  const kind: GradientKind =
    value.kind === "radial" || value.kind === "conic" ? value.kind : "linear";
  return {
    version: 1,
    kind,
    angle: ((Number(value.angle) || 0) % 360 + 360) % 360,
    centerX: clamp(Number(value.centerX) || 50, 0, 100),
    centerY: clamp(Number(value.centerY) || 50, 0, 100),
    size: clamp(Number(value.size) || 50, 10, 100),
    shape: value.shape === "ellipse" ? "ellipse" : "circle",
    stops: stopsNormalized.length >= 2 ? stopsNormalized : structuredClone(DEFAULT_GRADIENT.stops),
  };
}

function hexToRgba(hex: string, opacity: number): string {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`;
}

export function gradientToCss(value: GradientModel): string {
  const gradient = normalizeGradient(value);
  const stopCss = gradient.stops
    .map(
      (stop) =>
        `${hexToRgba(stop.color, stop.opacity)} ${Math.round(stop.position * 10) / 10}%`
    )
    .join(", ");
  if (gradient.kind === "radial") {
    const shape = gradient.shape || "circle";
    const size = gradient.size ?? 50;
    return `radial-gradient(${shape} ${size}% at ${gradient.centerX}% ${gradient.centerY}%, ${stopCss})`;
  }
  if (gradient.kind === "conic") {
    return `conic-gradient(from ${gradient.angle}deg at ${gradient.centerX}% ${gradient.centerY}%, ${stopCss})`;
  }
  return `linear-gradient(${gradient.angle}deg, ${stopCss})`;
}

export function reverseGradient(value: GradientModel): GradientModel {
  const gradient = normalizeGradient(value);
  return {
    ...gradient,
    stops: gradient.stops
      .map((stop) => ({ ...stop, position: 100 - stop.position }))
      .sort((a, b) => a.position - b.position),
  };
}

export function rotateGradient(value: GradientModel, delta = 15): GradientModel {
  const gradient = normalizeGradient(value);
  return { ...gradient, angle: (gradient.angle + delta + 360) % 360 };
}

export function mirrorGradient(value: GradientModel): GradientModel {
  const gradient = normalizeGradient(value);
  return {
    ...gradient,
    angle: (360 - gradient.angle + 360) % 360,
    centerX: 100 - gradient.centerX,
  };
}

export function addGradientStop(value: GradientModel): GradientModel {
  const gradient = normalizeGradient(value);
  if (gradient.stops.length >= 8) return gradient;
  let largestGap = -1;
  let insertAt = 1;
  for (let index = 1; index < gradient.stops.length; index += 1) {
    const gap = gradient.stops[index].position - gradient.stops[index - 1].position;
    if (gap > largestGap) {
      largestGap = gap;
      insertAt = index;
    }
  }
  const left = gradient.stops[insertAt - 1];
  const right = gradient.stops[insertAt];
  const stop: GradientStop = {
    id: `stop-${Date.now().toString(36)}`,
    color: left.color,
    opacity: (left.opacity + right.opacity) / 2,
    position: (left.position + right.position) / 2,
  };
  return {
    ...gradient,
    stops: [...gradient.stops, stop].sort((a, b) => a.position - b.position),
  };
}

export function removeGradientStop(
  value: GradientModel,
  stopId: string
): GradientModel {
  const gradient = normalizeGradient(value);
  if (gradient.stops.length <= 2) return gradient;
  return { ...gradient, stops: gradient.stops.filter((stop) => stop.id !== stopId) };
}

export function presetsForCollection(collection: GradientCollectionId | "all") {
  if (collection === "all") return GRADIENT_PRESETS;
  return GRADIENT_PRESETS.filter((preset) => preset.collection === collection);
}
