/**
 * Structured Action Group — parent-owned rails / columns / row rhythm / phone reflow.
 * Uses Container geometry authority; children participate. Not a second layout engine.
 */

import type { CreativeCompositionNode } from "../composition";
import { DEFAULT_RAILS, shouldAutoStackPhone } from "./layout-rails";

export type ActionGroupLayoutIntent = "one_column" | "two_column" | "round_team_grid";

function layoutIntentFromProps(props: Record<string, unknown>): string {
  const vp = props.visualParts;
  if (vp && typeof vp === "object" && "layoutIntent" in vp) {
    return String((vp as { layoutIntent?: string }).layoutIntent || props.vpLayoutIntent || "one_column");
  }
  return String(props.vpLayoutIntent || props.layoutIntent || "one_column");
}

export type ActionGroupPlanItem = Readonly<{
  label: string;
  icon?: string;
  iconSecondary?: string;
  presentation?: string;
  iconMediaUrl?: string;
  actionType?: string;
  href?: string;
  familyId?: string;
  portrait?: boolean;
}>;

export function actionGroupColumns(
  intent: ActionGroupLayoutIntent | string | null | undefined,
  viewportWidthPx: number,
  autoStackPhone = true
): 1 | 2 {
  if (intent === "two_column" || intent === "round_team_grid") {
    if (
      shouldAutoStackPhone({
        viewportWidthPx,
        columns: 2,
        autoStackPhone,
      })
    ) {
      return 1;
    }
    return 2;
  }
  return 1;
}

export function layoutActionGroupChildren(input: {
  container: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height" | "props">;
  children: CreativeCompositionNode[];
  viewportWidthPx: number;
}): CreativeCompositionNode[] {
  const props = input.container.props;
  const intent = layoutIntentFromProps(props) as ActionGroupLayoutIntent;
  const autoStack = props.vpAutoStackPhone !== false;
  const columns = actionGroupColumns(intent, input.viewportWidthPx, autoStack);
  const gapX = Number(props.gap ?? DEFAULT_RAILS.gapPx) / 390;
  const gapY = Number(props.gap ?? DEFAULT_RAILS.gapPx) / 800;
  const pad = 0.04;
  const innerX = input.container.x + input.container.width * pad;
  const innerY = input.container.y + input.container.height * pad;
  const innerW = input.container.width * (1 - pad * 2);
  const innerH = input.container.height * (1 - pad * 2);
  const colCount = columns;
  const rowCount = Math.max(1, Math.ceil(input.children.length / colCount));
  const cellW = (innerW - gapX * Math.max(0, colCount - 1)) / colCount;
  const cellH = (innerH - gapY * Math.max(0, rowCount - 1)) / rowCount;
  const round = intent === "round_team_grid";

  return input.children.map((child, index) => {
    const col = index % colCount;
    const row = Math.floor(index / colCount);
    const width = Math.max(0.08, round ? Math.min(cellW, cellH * 0.9) : cellW);
    const height = Math.max(0.06, round ? width : Math.max(0.08, cellH));
    const x = innerX + col * (cellW + gapX) + (round ? (cellW - width) / 2 : 0);
    const y = innerY + row * (cellH + gapY);
    return {
      ...child,
      x,
      y,
      width,
      height,
      props: {
        ...child.props,
        vpRailAware: true,
        vpLayoutIntent: intent === "round_team_grid" ? "one_column" : "one_column",
        vpRailLeftPct: props.vpRailLeftPct ?? DEFAULT_RAILS.railLeftPct,
        vpRailRightPct: props.vpRailRightPct ?? DEFAULT_RAILS.railRightPct,
        vpActionGroupChild: true,
        ...(round
          ? {
              presentation: "icon_label",
              radius: 999,
              showIcon: true,
              visualParts: {
                ...(typeof child.props.visualParts === "object" && child.props.visualParts
                  ? child.props.visualParts
                  : {}),
                iconStationGeometryPartId: "icon_station_round",
                iconStationBackingPartId: "icon_station_backing_dark",
                iconStationScale: 0.85,
                iconStationAnchor: "center_overlap",
                iconStationPosition: "left",
              },
            }
          : {}),
      },
    };
  });
}

/** Plan sibling frames for onAddObjects without a parent container (stack rails proof). */
export function planSiblingActionFrames(
  count: number,
  intent: ActionGroupLayoutIntent,
  viewportWidthPx = 390
): Array<{ x: number; y: number; width: number; height: number }> {
  const columns = actionGroupColumns(intent, viewportWidthPx, true);
  const gapX = 0.03;
  const gapY = 0.02;
  const startY = 0.08;
  const width = columns === 2 ? (0.92 - gapX) / 2 : 0.88;
  const height = intent === "round_team_grid" ? 0.16 : 0.1;
  const frames: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    frames.push({
      x: columns === 2 ? 0.04 + col * (width + gapX) : 0.06,
      y: startY + row * (height + gapY),
      width,
      height,
    });
  }
  return frames;
}

export function actionGroupContainerProps(intent: ActionGroupLayoutIntent): Record<string, unknown> {
  return {
    componentKind: "container",
    elementKind: "composition",
    layout: intent === "one_column" ? "stack" : intent === "round_team_grid" ? "round_team" : "grid",
    gap: DEFAULT_RAILS.gapPx,
    padding: 12,
    fill: "transparent",
    resizePolicy: "reflow",
    vpActionGroup: true,
    vpLayoutIntent: intent,
    vpAutoStackPhone: true,
    vpRailAware: true,
    vpRailLeftPct: DEFAULT_RAILS.railLeftPct,
    vpRailRightPct: DEFAULT_RAILS.railRightPct,
    visualParts: {
      layoutIntent: intent,
    },
  };
}
