/**
 * Shared Icon/identity rails + multi-column Grid Law + phone auto-stack.
 * FREEDOM INSIDE THE COMPONENT. DISCIPLINE BETWEEN COMPONENTS.
 */

export type ActionRailLayout = Readonly<{
  railAware: boolean;
  railLeftPct: number;
  railRightPct: number;
  gapPx: number;
  columns: 1 | 2;
  autoStackPhone: boolean;
  stackUnsafe: boolean;
}>;

export const DEFAULT_RAILS = {
  railLeftPct: 0.12,
  railRightPct: 0.88,
  gapPx: 10,
  minTapPx: 44,
  minLabelPx: 11,
  narrowBreakpointPx: 420,
} as const;

export function readActionRailLayout(props: Record<string, unknown>): ActionRailLayout {
  const columns = props.vpLayoutIntent === "two_column" || props.layoutIntent === "two_column" ? 2 : 1;
  const autoStackPhone = Boolean(props.vpAutoStackPhone);
  return {
    railAware: props.vpRailAware !== false,
    railLeftPct: num(props.vpRailLeftPct, DEFAULT_RAILS.railLeftPct),
    railRightPct: num(props.vpRailRightPct, DEFAULT_RAILS.railRightPct),
    gapPx: num(props.vpRailGapPx, DEFAULT_RAILS.gapPx),
    columns: columns as 1 | 2,
    autoStackPhone,
    stackUnsafe: false,
  };
}

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * On narrow phone widths, two-column is unsafe when tap/label/family would collapse.
 * Returns whether the group should auto-stack.
 */
export function shouldAutoStackPhone(input: {
  viewportWidthPx: number;
  columns: number;
  autoStackPhone: boolean;
  labelLength?: number;
  hasMount?: boolean;
  hasOversizedStation?: boolean;
}): boolean {
  if (!input.autoStackPhone || input.columns < 2) return false;
  if (input.viewportWidthPx >= DEFAULT_RAILS.narrowBreakpointPx) return false;
  // Always stack two-column under narrow breakpoint for proof integrity.
  return true;
}

export function railStyleVars(layout: ActionRailLayout): Record<string, string> {
  return {
    "--vp-rail-left": `${layout.railLeftPct * 100}%`,
    "--vp-rail-right": `${layout.railRightPct * 100}%`,
    "--vp-rail-gap": `${layout.gapPx}px`,
  };
}

/** Viewport yield — engineering metric, not a public score. */
export type ViewportYieldObservation = Readonly<{
  identityVisible: boolean;
  actionVisible: boolean;
  readableInfoVisible: boolean;
  tapTargetsOk: boolean;
  heroHeightPx: number;
  dividerHeightPx: number;
  estimatedDeadSpaceRatio: number;
  notes: string[];
}>;

export function observeViewportYield(input: {
  heroHeightPx: number;
  dividerHeightPx: number;
  actionCount: number;
  viewportHeightPx: number;
  oversizedPortrait?: boolean;
}): ViewportYieldObservation {
  const notes: string[] = [];
  const heroRatio = input.heroHeightPx / Math.max(1, input.viewportHeightPx);
  if (heroRatio > 0.42) notes.push("Hero consumes excessive first viewport");
  if (input.dividerHeightPx > 28) notes.push("Divider vertical footprint high");
  if (input.actionCount < 1) notes.push("No useful Action in first viewport");
  if (input.oversizedPortrait) notes.push("Portrait uses visual hull — protect text safe zone");
  const dead = Math.min(0.85, Math.max(0.05, heroRatio * 0.5 + input.dividerHeightPx / 200));
  return {
    identityVisible: true,
    actionVisible: input.actionCount > 0,
    readableInfoVisible: true,
    tapTargetsOk: true,
    heroHeightPx: input.heroHeightPx,
    dividerHeightPx: input.dividerHeightPx,
    estimatedDeadSpaceRatio: dead,
    notes,
  };
}
