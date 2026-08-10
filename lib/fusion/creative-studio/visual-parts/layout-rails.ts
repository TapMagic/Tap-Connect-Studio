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
  /** Fixed left/right column widths for cross-Action alignment (px). */
  leftSlotPx: number;
  rightSlotPx: number;
}>;

export const DEFAULT_RAILS = {
  railLeftPct: 0.12,
  railRightPct: 0.88,
  gapPx: 10,
  minTapPx: 44,
  minLabelPx: 11,
  narrowBreakpointPx: 420,
  leftSlotPx: 52,
  rightSlotPx: 44,
} as const;

export function readActionRailLayout(props: Record<string, unknown>): ActionRailLayout {
  const columns =
    props.vpLayoutIntent === "two_column" || props.layoutIntent === "two_column" ? 2 : 1;
  const autoStackPhone = Boolean(props.vpAutoStackPhone);
  const railAware = props.vpRailAware === true || props.vpActionGroupChild === true;
  return {
    railAware,
    railLeftPct: num(props.vpRailLeftPct, DEFAULT_RAILS.railLeftPct),
    railRightPct: num(props.vpRailRightPct, DEFAULT_RAILS.railRightPct),
    gapPx: num(props.vpRailGapPx, DEFAULT_RAILS.gapPx),
    columns: columns as 1 | 2,
    autoStackPhone,
    stackUnsafe: false,
    leftSlotPx: num(props.vpRailLeftSlotPx, DEFAULT_RAILS.leftSlotPx),
    rightSlotPx: num(props.vpRailRightSlotPx, DEFAULT_RAILS.rightSlotPx),
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
  return true;
}

export function railStyleVars(layout: ActionRailLayout): Record<string, string> {
  return {
    "--vp-rail-left": `${layout.railLeftPct * 100}%`,
    "--vp-rail-right": `${layout.railRightPct * 100}%`,
    "--vp-rail-gap": `${layout.gapPx}px`,
    "--vp-rail-left-slot": `${layout.leftSlotPx}px`,
    "--vp-rail-right-slot": `${layout.rightSlotPx}px`,
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
  firstActionTopPx: number | null;
  actionCountInViewport: number;
  majorEmptyGapPx: number;
  clippingDetected: boolean;
  viewportWidthPx: number;
  viewportHeightPx: number;
  estimatedDeadSpaceRatio: number;
  notes: string[];
}>;

export type ViewportRect = Readonly<{
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}>;

/** Measure real DOM rects — do not hard-code success booleans. */
export function observeViewportYieldFromDom(input: {
  viewport: ViewportRect;
  hero?: ViewportRect | null;
  divider?: ViewportRect | null;
  actions: ViewportRect[];
  identityStations?: ViewportRect[];
  bottomStop?: ViewportRect | null;
}): ViewportYieldObservation {
  const notes: string[] = [];
  const vh = Math.max(1, input.viewport.height);
  const vw = Math.max(1, input.viewport.width);
  const heroHeightPx = input.hero?.height ?? 0;
  const dividerHeightPx = input.divider?.height ?? 0;
  const heroRatio = heroHeightPx / vh;
  if (heroRatio > 0.42) notes.push("Hero consumes excessive first viewport");
  if (dividerHeightPx > 28) notes.push("Divider vertical footprint high");

  const inView = input.actions.filter(
    (a) => a.top < input.viewport.bottom && a.bottom > input.viewport.top && a.height >= 8
  );
  if (inView.length < 1) notes.push("No useful Action in first viewport");

  const tapTargetsOk = inView.every((a) => a.height >= DEFAULT_RAILS.minTapPx - 2 || a.width >= DEFAULT_RAILS.minTapPx - 2);
  if (!tapTargetsOk) notes.push("Tap target below practical minimum");

  const identityVisible =
    (input.identityStations || []).some((s) => s.width >= 12 && s.height >= 12) ||
    inView.length > 0;

  let majorEmptyGapPx = 0;
  const sorted = [...inView].sort((a, b) => a.top - b.top);
  for (let i = 1; i < sorted.length; i++) {
    majorEmptyGapPx = Math.max(majorEmptyGapPx, sorted[i]!.top - sorted[i - 1]!.bottom);
  }
  if (majorEmptyGapPx > 80) notes.push("Major empty vertical gap between Actions");

  const clippingDetected = [...inView, ...(input.identityStations || [])].some(
    (r) => r.left < input.viewport.left - 2 || r.right > input.viewport.right + 8
  );
  if (clippingDetected) notes.push("Clipping/overflow against viewport");

  if (input.bottomStop && input.bottomStop.height > 40) {
    notes.push("Bottom Stop vertical footprint high");
  }

  const occupied =
    heroHeightPx +
    dividerHeightPx +
    inView.reduce((sum, a) => sum + a.height, 0) +
    (input.bottomStop?.height ?? 0);
  const dead = Math.min(0.85, Math.max(0.05, 1 - occupied / vh));

  return {
    identityVisible,
    actionVisible: inView.length > 0,
    readableInfoVisible: inView.length > 0 && !clippingDetected,
    tapTargetsOk,
    heroHeightPx,
    dividerHeightPx,
    firstActionTopPx: sorted[0]?.top ?? null,
    actionCountInViewport: inView.length,
    majorEmptyGapPx,
    clippingDetected,
    viewportWidthPx: vw,
    viewportHeightPx: vh,
    estimatedDeadSpaceRatio: dead,
    notes,
  };
}

/** Legacy helper kept for unit proofs — prefer observeViewportYieldFromDom for cert. */
export function observeViewportYield(input: {
  heroHeightPx: number;
  dividerHeightPx: number;
  actionCount: number;
  viewportHeightPx: number;
  oversizedPortrait?: boolean;
}): ViewportYieldObservation {
  return observeViewportYieldFromDom({
    viewport: {
      top: 0,
      left: 0,
      width: 390,
      height: input.viewportHeightPx,
      bottom: input.viewportHeightPx,
      right: 390,
    },
    hero: input.heroHeightPx
      ? { top: 0, left: 0, width: 390, height: input.heroHeightPx, bottom: input.heroHeightPx, right: 390 }
      : null,
    divider: input.dividerHeightPx
      ? {
          top: input.heroHeightPx,
          left: 0,
          width: 390,
          height: input.dividerHeightPx,
          bottom: input.heroHeightPx + input.dividerHeightPx,
          right: 390,
        }
      : null,
    actions: Array.from({ length: input.actionCount }, (_, i) => {
      const top = input.heroHeightPx + input.dividerHeightPx + 8 + i * 56;
      return { top, left: 24, width: 342, height: 48, bottom: top + 48, right: 366 };
    }),
    identityStations: input.oversizedPortrait
      ? [{ top: 120, left: 12, width: 64, height: 64, bottom: 184, right: 76 }]
      : [],
  });
}
