export type GradientKind = "linear" | "radial";

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
  stops: GradientStop[];
};

export const DEFAULT_GRADIENT: GradientModel = {
  version: 1,
  kind: "linear",
  angle: 135,
  centerX: 50,
  centerY: 50,
  stops: [
    { id: "start", color: "#0b0f19", position: 0, opacity: 1 },
    { id: "end", color: "#22c55e", position: 100, opacity: 1 },
  ],
};

export const GRADIENT_PRESETS: {
  id: string;
  label: string;
  gradient: GradientModel;
}[] = [
  {
    id: "tapconnect-night",
    label: "TapConnect Night",
    gradient: DEFAULT_GRADIENT,
  },
  {
    id: "editorial-gold",
    label: "Editorial Gold",
    gradient: {
      ...DEFAULT_GRADIENT,
      angle: 110,
      stops: [
        { id: "start", color: "#17120a", position: 0, opacity: 1 },
        { id: "middle", color: "#8b6b20", position: 55, opacity: 1 },
        { id: "end", color: "#f5d778", position: 100, opacity: 1 },
      ],
    },
  },
  {
    id: "clean-radial",
    label: "Clean Radial",
    gradient: {
      ...DEFAULT_GRADIENT,
      kind: "radial",
      stops: [
        { id: "start", color: "#334155", position: 0, opacity: 1 },
        { id: "end", color: "#020617", position: 100, opacity: 1 },
      ],
    },
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGradient(value: GradientModel | null | undefined): GradientModel {
  if (!value || value.version !== 1 || !Array.isArray(value.stops)) {
    return structuredClone(DEFAULT_GRADIENT);
  }
  const stops = value.stops
    .map((stop, index) => ({
      id: stop.id || `stop-${index}`,
      color: /^#[0-9a-f]{6}$/i.test(stop.color) ? stop.color : "#000000",
      position: clamp(Number(stop.position) || 0, 0, 100),
      opacity: clamp(Number.isFinite(stop.opacity) ? stop.opacity : 1, 0, 1),
    }))
    .sort((a, b) => a.position - b.position);
  return {
    version: 1,
    kind: value.kind === "radial" ? "radial" : "linear",
    angle: ((Number(value.angle) || 0) % 360 + 360) % 360,
    centerX: clamp(Number(value.centerX) || 50, 0, 100),
    centerY: clamp(Number(value.centerY) || 50, 0, 100),
    stops: stops.length >= 2 ? stops : structuredClone(DEFAULT_GRADIENT.stops),
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
  const stops = gradient.stops
    .map(
      (stop) =>
        `${hexToRgba(stop.color, stop.opacity)} ${Math.round(stop.position * 10) / 10}%`
    )
    .join(", ");
  return gradient.kind === "radial"
    ? `radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%, ${stops})`
    : `linear-gradient(${gradient.angle}deg, ${stops})`;
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

