"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Heart, Mail, MapPin, Phone, Sparkles, Star, Tag, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FRAME_MASK_CATALOG,
  accessibleReadingOrder,
  bringForward,
  bringToFront,
  compositionAppliesMobileFallback,
  createCompositionNode,
  deleteNodes,
  duplicateNodes,
  expandSelectionToGroups,
  frameMaskPath,
  groupNodes,
  resolveNodeBox,
  sendBackward,
  sendToBack,
  sortCompositionNodes,
  translateNodesOnPasteboard,
  ungroupNodes,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";
import {
  DEFAULT_GRADIENT,
  gradientToCss,
} from "@/lib/fusion/creative-studio/gradient";
import { surfacePatternFromTextureToken, surfacePatternStyle } from "@/lib/fusion/creative-studio/patterns";
import {
  readContainerVisualPlane,
  visualPlaneToStyle,
} from "@/lib/fusion/creative-studio/visual-plane";
import {
  snapCompositionNodes,
  type CompositionGuide,
} from "@/lib/fusion/creative-studio/composition-snap";
import { buildButtonHref, buildMapHref, type MapElementProps } from "@/lib/fusion/card/designer-elements";
import { autoScrollForPointer } from "@/lib/fusion/creative-studio/autoscroll";
import { copyCompositionNodes, copyCompositionNodeStyle, hasCompositionClipboard, hasCompositionStyleClipboard, pasteCompositionNodes, pasteCompositionNodeStyle } from "@/lib/fusion/creative-studio/composition-clipboard";
import { buttonContent, buttonContentNode } from "@/lib/fusion/creative-studio/button-composition";
import {
  applyContainerResize,
  moveContainerWithChildren,
  normalizeResizePolicy,
} from "@/lib/fusion/creative-studio/container-resize";
import {
  containerChildIds,
  isContainerNode,
  isTrueGroupMember,
  resolveContainerParent,
  selectionModeForNode,
} from "@/lib/fusion/creative-studio/selection-mode";
import {
  activateGroupContentChild,
  computeGroupUnionBounds,
  exitGroupContentEditing,
  isGroupContentEditing,
  isGroupContentScope,
  isGroupParentSelection,
  resolveActiveGroupId,
  resizeGroupComposition,
  rotateGroupComposition,
} from "@/lib/fusion/creative-studio/group-authority";
import { badgeShapeBorderRadius, badgeShapeClipPath, badgeShapeSvgPoints, badgeUsesPathStroke } from "@/lib/fusion/creative-studio/badge-shape";
import { effectLayersCss } from "@/lib/fusion/creative-studio/effect-render";
import {
  materialPropsFromCompositionBackground,
  surfaceShadowCss,
} from "@/lib/fusion/creative-studio/material-engine";
import { resolveMaterialSurfaceFromProps } from "@/lib/fusion/creative-studio/material-surface";
import { MaterialSurfaceLayers } from "@/components/fusion/creative-studio/material-surface-layers";
import {
  IconStationShell,
  MountShell,
  VisualPartsShell,
} from "@/components/fusion/creative-studio/visual-parts-layers";
import {
  ornamentSvg,
  readActionRailLayout,
  readVisualPartsState,
  railStyleVars,
  visualPartsDataAttrs,
} from "@/lib/fusion/creative-studio/visual-parts";

export type CreativeCompositionCanvasProps = {
  block: CreativeCompositionBlock;
  editMode?: boolean;
  selectedNodeIds?: string[];
  onSelectNodes?: (ids: string[]) => void;
  onChangeBlock?: (next: CreativeCompositionBlock, label?: string) => void;
  /** Force mobile fallback layout (narrow preview). */
  forceMobileFallback?: boolean;
  previewMotion?: boolean;
  reducedMotionSimulation?: boolean;
  /**
   * Canvas zoom factor used by the phone wrapper. Selection chrome is
   * inverse-scaled so handles stay ~8–10 screen pixels at any zoom.
   */
  editorZoom?: number;
  className?: string;
  aspectRatio?: number;
  layoutMode?: "stack" | "row" | "grid" | "free";
  gapPx?: number;
  align?: "start" | "center" | "end" | "stretch";
  distribute?: "start" | "center" | "end" | "between" | "around";
  minHeightPx?: number;
  onEditNodeText?: (nodeId: string, value: string) => void;
  /** When true, OS file drop / image clipboard paste may upload via /api/media/upload. */
  mediaUploadReady?: boolean;
  onNotify?: (message: string | null) => void;
  containerActions?: {
    current: "card" | "section";
    sections: Array<{ id: string; label: string }>;
    onMoveToCard?: (nodeId: string) => void;
    onMoveToSection?: (nodeId: string, sectionId: string) => void;
    onWrap?: (nodeId: string) => void;
  };
};

const IMAGE_FILE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function textureOverlayStyle(props: Record<string, unknown>): CSSProperties | null {
  const model = surfacePatternFromTextureToken(
    typeof props.texture === "string" ? props.texture : null,
    {
      foreground: str(props.textureForeground, str(props.borderColor, "#ffffff")),
      background: "transparent",
      opacity: num(props.textureOpacity, 0.32),
      scale: num(props.textureScale, 1),
    }
  );
  if (!model) return null;
  const style = surfacePatternStyle(model);
  return {
    backgroundImage: style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundBlendMode: style.backgroundBlendMode as CSSProperties["backgroundBlendMode"],
    opacity: 1,
  };
}

async function uploadCanvasImageFile(file: File): Promise<{ url: string; mediaAssetId: string } | null> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/media/upload", { method: "POST", body: form });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    asset?: { url?: string; id?: string; mediaAssetId?: string };
    url?: string;
    mediaAssetId?: string;
  };
  const url = data.asset?.url || data.url;
  const mediaAssetId = data.asset?.mediaAssetId || data.asset?.id || data.mediaAssetId;
  if (!url || !mediaAssetId) return null;
  return { url, mediaAssetId };
}

function gradientStops(value: unknown, fallback: string): [string, string, string] {
  const colors = typeof value === "string" ? value.match(/#[0-9a-f]{3,8}/gi) ?? [] : [];
  return [colors[0] || fallback, colors[1] || colors[0] || fallback, colors[2] || colors.at(-1) || fallback];
}

function colorWithOpacity(color: string, opacity: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${alpha}`;
}

function ActionVisual({ node, editMode, children }: { node: CreativeCompositionNode; editMode: boolean; children: ReactNode }) {
  if (node.primitive === "button" || str(node.props.elementKind) === "map") return children;
  const href = buildButtonHref(node.props);
  if (!href) return children;
  return (
    <a
      href={editMode ? undefined : href}
      aria-disabled={editMode || undefined}
      aria-label={str(node.props.accessibleLabel, str(node.props.text, str(node.props.alt, node.name || "Open")))}
      className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ff2c]"
      data-element-action={str(node.props.actionType)}
      onClick={(event) => { if (editMode) event.preventDefault(); }}
    >
      {children}
    </a>
  );
}

function ElementIcon({ name, size = 20 }: { name: string; size?: number }) {
  const props = { width: size, height: size, "aria-hidden": true } as const;
  if (name.includes("phone")) return <Phone {...props} />;
  if (name.includes("mail")) return <Mail {...props} />;
  if (name.includes("map") || name.includes("pin")) return <MapPin {...props} />;
  if (name.includes("heart")) return <Heart {...props} />;
  if (name.includes("star")) return <Star {...props} />;
  if (name.includes("ticket")) return <Ticket {...props} />;
  if (name.includes("tag")) return <Tag {...props} />;
  if (name.includes("spark")) return <Sparkles {...props} />;
  return <ArrowUpRight {...props} />;
}

function MotionVisual({ node, active, children }: { node: CreativeCompositionNode; active: boolean; children: ReactNode }) {
  const preset = str(node.props.motionPreset, "none");
  const enabled = active && preset !== "none";
  return (
    <div
      className={cn("h-full w-full", enabled && "tc-card-motion")}
      data-motion-preset={preset}
      data-motion-active={enabled ? "true" : "false"}
      data-motion-intensity={String(num(node.props.motionIntensity, 50))}
      data-reduced-motion-fallback={str(node.props.reducedMotionFallback, "none")}
      style={enabled ? {
        animationName: `tc-motion-${preset.replaceAll("_", "-")}`,
        animationDuration: `${Math.max(.4, num(node.props.motionSpeedSeconds, 2.4))}s`,
        animationDelay: `${Math.max(0, num(node.props.motionDelaySeconds, 0))}s`,
        animationIterationCount: str(node.props.motionPlay, "gentle_repeat") === "once" ? 1 : "infinite",
        animationTimingFunction: "ease-in-out",
        animationFillMode: "both",
      } : undefined}
    >
      {children}
    </div>
  );
}

function InlineEditableText({
  nodeId,
  value,
  editing,
  style,
  onCommit,
  onFinish,
}: {
  nodeId: string;
  value: string;
  editing: boolean;
  style: CSSProperties;
  onCommit?: (value: string) => void;
  onFinish?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const valueAtEditStart = useRef(value);
  const lastSentValue = useRef(value);
  const settledTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!ref.current || editing) return;
    if (ref.current.innerText !== value) ref.current.innerText = value;
    valueAtEditStart.current = value;
    lastSentValue.current = value;
  }, [editing, value]);

  useEffect(() => {
    if (!editing) return;
    lastSentValue.current = valueAtEditStart.current;
    const element = ref.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editing]);

  useEffect(() => () => {
    if (settledTimer.current != null) window.clearTimeout(settledTimer.current);
  }, []);

  const commit = () => {
    const next = ref.current?.innerText ?? value;
    if (settledTimer.current != null) window.clearTimeout(settledTimer.current);
    settledTimer.current = null;
    if (next !== lastSentValue.current) {
      lastSentValue.current = next;
      onCommit?.(next);
    }
    onFinish?.();
  };

  return (
    <span
      ref={ref}
      className="w-full whitespace-pre-wrap leading-tight outline-none"
      style={style}
      dir="ltr"
      contentEditable={editing}
      spellCheck={editing}
      suppressContentEditableWarning
      data-testid={`composition-inline-text-${nodeId}`}
      data-inline-editing={editing ? "true" : "false"}
      onPointerDown={(event) => {
        if (editing) event.stopPropagation();
      }}
      onInput={(event) => {
        if (settledTimer.current != null) window.clearTimeout(settledTimer.current);
        const next = event.currentTarget.innerText;
        settledTimer.current = window.setTimeout(() => {
          if (next === lastSentValue.current) return;
          lastSentValue.current = next;
          onCommit?.(next);
        }, 900);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (ref.current) ref.current.innerText = valueAtEditStart.current;
        ref.current?.blur();
      }}
    />
  );
}

function NodeVisual({
  node,
  editMode,
  textEditing,
  onEditText,
  onFinishTextEdit,
}: {
  node: CreativeCompositionNode;
  editMode?: boolean;
  textEditing?: boolean;
  onEditText?: (value: string) => void;
  onFinishTextEdit?: () => void;
}) {
  const elementKind = str(node.props.elementKind);

  if (elementKind === "map" || str(node.props.componentKind) === "map") {
    const props = node.props as MapElementProps;
    const hasSetup = Boolean(props.locationId || props.address || props.mapUrl || (Number.isFinite(props.latitude) && Number.isFinite(props.longitude)));
    // Preview must never make the Map disappear — show a location-card fallback.
    const mode = str(props.mapDisplayMode, hasSetup ? "location_card" : "location_card");
    const name = str(props.locationName, hasSetup ? "Location" : "Location setup required");
    const address = str(props.address, hasSetup ? "" : "Add an address in Map Setup");
    const href = buildMapHref(props);
    const directions = (
      <a
        href={href || undefined}
        aria-disabled={!href}
        aria-label={str(props.accessibleLabel, "Open directions")}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={(event) => { if (editMode || !href) event.preventDefault(); }}
      >
        <MapPin className="h-4 w-4" aria-hidden /> Directions
      </a>
    );
    if (mode === "directions_only") return <div className="flex h-full w-full items-center justify-center" data-map-presentation={mode}>{directions}</div>;
    if (mode === "pin_only") return <div className="flex h-full w-full items-center justify-center" data-map-presentation={mode}><MapPin className="h-8 w-8" aria-label={name} /></div>;
    if (mode === "text_link") return <div className="flex h-full w-full items-center justify-center" data-map-presentation={mode}><a href={href || undefined} aria-disabled={!href} onClick={(event) => { if (editMode || !href) event.preventDefault(); }} className="text-sm font-semibold underline underline-offset-4">Get directions to {name}</a></div>;
    const mapLike = mode === "interactive" || mode === "static" || mode === "map_directions";
    return (
      <div
        className="relative flex h-full w-full overflow-hidden border border-white/15 bg-[#17231d]"
        style={{ borderRadius: num(props.radius, 14), opacity: num(props.opacity, 1) }}
        data-map-presentation={mode}
      >
        {mapLike ? (
          <div className="relative min-w-[46%] flex-1 overflow-hidden bg-[#dce8d8]" aria-label={`${mode === "interactive" ? "Interactive" : "Static"} map preview`}>
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(28deg, transparent 46%, #afc5aa 47%, #afc5aa 52%, transparent 53%), linear-gradient(112deg, transparent 42%, #c2d2bd 43%, #c2d2bd 48%, transparent 49%)", backgroundSize: "58px 58px, 76px 76px" }} />
            <MapPin className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 fill-[#14241a] text-[#b8ff2c] drop-shadow" aria-hidden />
            <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[8px] text-white">Map preview</span>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b8ff2c]" aria-hidden /><div className="min-w-0"><strong className="block truncate text-xs text-white">{name}</strong><span className="block text-[10px] leading-snug text-white/70">{address}</span></div></div>
          {(mode === "map_directions" || mode === "location_card") ? directions : null}
          {editMode && !href ? <span className="text-[9px] text-amber-200">Choose a location in Setup</span> : null}
        </div>
      </div>
    );
  }

  const componentKind = str(node.props.componentKind);
  if (componentKind === "container") {
    const vpContainer = readVisualPartsState(node.props);
    const actionSurfaceTone = str(node.props.actionSurfaceTone);
    const containerRadius = num(node.props.radius, actionSurfaceTone ? 18 : 0);
    // Material props are the surface authority when a Material was applied.
    // Visual Plane remains for non-Material Container Background editing.
    const materialActive =
      typeof node.props.materialPreset === "string" &&
      node.props.materialPreset.length > 0 &&
      node.props.materialPreset !== "none";
    if (materialActive || actionSurfaceTone === "copper_harmonized" || vpContainer.rimPartId) {
      const material = materialActive
        ? resolveMaterialSurfaceFromProps(node.props, "container")
        : null;
      const background =
        actionSurfaceTone === "copper_harmonized"
          ? str(
              node.props.gradientFill,
              "linear-gradient(160deg,#3a2418 0%,#1a1410 48%,#0c0a08 100%)"
            )
          : material?.background || str(node.props.fill, "#111827");
      return (
        <VisualPartsShell props={node.props} radius={containerRadius} testIdPrefix={`container-${node.id}`}>
        <div
          className="relative h-full w-full overflow-hidden"
          data-component-kind="container"
          data-container-layout={str(node.props.layout, "free")}
          data-container-resize-policy={str(node.props.resizePolicy, "reflow")}
          data-vp-action-surface={vpContainer.actionSurfacePartId || undefined}
          data-surface-texture={material?.textureToken || undefined}
          data-visual-plane={materialActive ? "material" : "visual-parts"}
          data-material-fill-authority={material?.fillAuthority}
          data-material-stop-count={material ? String(material.gradientStopCount) : undefined}
          data-material-highlight={material?.highlight ? "true" : "false"}
          style={{
            background,
            backgroundSize: material?.backgroundSize,
            border:
              material && material.borderWidth > 0
                ? `${material.borderWidth}px ${material.borderStyle} ${material.borderColor}`
                : "none",
            borderRadius: containerRadius,
            boxShadow: material?.boxShadow,
            opacity: material?.opacity ?? 1,
          }}
        >
          {material ? <MaterialSurfaceLayers surface={material} testIdPrefix={`container-${node.id}`} /> : null}
        </div>
        </VisualPartsShell>
      );
    }
    const plane = readContainerVisualPlane(node);
    const planeStyle = visualPlaneToStyle(plane);
    const texture =
      plane.kind === "none" || plane.kind === "pattern" || plane.kind === "texture" || plane.kind === "image"
        ? null
        : textureOverlayStyle(node.props);
    return <div
      className="relative h-full w-full overflow-hidden"
      data-component-kind="container"
      data-container-layout={str(node.props.layout, "free")}
      data-container-resize-policy={str(node.props.resizePolicy, "reflow")}
      data-surface-texture={typeof node.props.texture === "string" ? String(node.props.texture) : undefined}
      data-visual-plane={plane.kind}
      style={{
        ...planeStyle,
        border: `${num(node.props.borderWidth, 0)}px ${str(node.props.borderStyle, "solid")} ${str(node.props.borderColor, "transparent")}`,
        borderRadius: num(node.props.radius, 0),
        boxShadow: num(node.props.boxShadow, 0) ? `0 10px ${num(node.props.boxShadow, 0)}px rgba(0,0,0,.35)` : undefined,
        opacity: num(node.props.opacity, 1),
      }}
    >{texture ? <span aria-hidden className="pointer-events-none absolute inset-0" data-testid="surface-texture-overlay" style={texture} /> : null}</div>;
  }
  if (componentKind === "gallery") {
    const media = Array.isArray(node.props.media) ? node.props.media.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
    if (!media.length && !editMode) return null;
    return <div className="grid h-full w-full overflow-hidden rounded-xl border border-white/15 bg-white/5 p-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, media.length))},minmax(0,1fr))`, gap: num(node.props.gap, 10), opacity: num(node.props.opacity, 1) }} data-component-kind="gallery">{media.length ? media.map((src, index) => <img /* eslint-disable-line @next/next/no-img-element */ key={`${src}-${index}`} src={src} alt={`Gallery image ${index + 1}`} className="h-full min-h-0 w-full rounded-lg object-cover" />) : <div className="col-span-full grid h-full place-items-center rounded-lg border border-dashed border-white/25 text-[10px] text-white/55" data-editor-placeholder="media">Add gallery media</div>}</div>;
  }

  if (componentKind === "coupon" || componentKind === "ticket") {
    const coupon = componentKind === "coupon";
    const artwork = str(node.props.artworkSrc);
    const variant = str(node.props.layoutVariant, coupon ? "retail_card" : "admission_stub");
    const defaultCouponFill = "linear-gradient(135deg,#fcd34d,#f97316,#f43f5e)";
    const resolvedGradientFill =
      str(node.props.gradientFill) ||
      (str(node.props.gradientStart) && str(node.props.gradientEnd)
        ? `linear-gradient(${num(node.props.gradientAngle, 135)}deg,${str(node.props.gradientStart)},${str(node.props.gradientEnd)})`
        : !str(node.props.fill)
          ? defaultCouponFill
          : "");
    const material = resolveMaterialSurfaceFromProps(
      {
        ...node.props,
        fill: node.props.fill ?? "#f97316",
        gradientFill: resolvedGradientFill || undefined,
      },
      "generic"
    );
    const fallbackFill =
      str(node.props.gradientFill) ||
      (str(node.props.gradientStart) && str(node.props.gradientEnd)
        ? `linear-gradient(${num(node.props.gradientAngle, 135)}deg,${str(node.props.gradientStart)},${str(node.props.gradientEnd)})`
        : str(node.props.fill, "linear-gradient(135deg,#fcd34d,#f97316,#f43f5e)"));
    const borderWidth = material.borderWidth > 0 ? material.borderWidth : num(node.props.borderWidth, 1);
    const borderColor =
      material.borderWidth > 0 ? material.borderColor : str(node.props.borderColor, "rgba(255,255,255,0.35)");
    const borderStyle =
      material.borderWidth > 0
        ? material.borderStyle
        : str(node.props.borderStyle, "solid");
    const radius = num(node.props.radius, 18);
    const surfaceStyle: CSSProperties = {
      background: artwork ? undefined : material.background || fallbackFill,
      backgroundImage: artwork
        ? `linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)),url("${artwork.replaceAll('"', "%22")}")`
        : undefined,
      backgroundPosition: "center",
      backgroundSize: artwork ? "cover" : material.backgroundSize,
      borderWidth,
      borderStyle: borderStyle as CSSProperties["borderStyle"],
      borderColor,
      borderRadius: radius,
      boxShadow: material.boxShadow || surfaceShadowCss(node.props),
      opacity: material.opacity,
      color: str(node.props.color, "#17100a"),
    };
    const surfaceAttrs = {
      "data-material-fill-authority": artwork ? "image" : material.fillAuthority,
      "data-material-stop-count": artwork ? undefined : String(material.gradientStopCount),
      "data-material-highlight": !artwork && material.highlight ? "true" : "false",
      "data-surface-texture": !artwork ? material.textureToken || undefined : undefined,
    } as const;
    const materialLayers =
      !artwork ? <MaterialSurfaceLayers surface={material} testIdPrefix={`${componentKind}-${node.id}`} /> : null;
    if (!coupon) {
      return <div className="relative flex h-full w-full flex-col justify-between overflow-hidden p-4 shadow-xl" style={surfaceStyle} data-component-kind="ticket" data-layout-variant={variant} data-surface-mode={artwork ? "uploaded_artwork" : "preset"} {...surfaceAttrs}>{materialLayers}<div className="relative z-[1]"><span className="text-[9px] font-black uppercase tracking-[.22em]">TapConnect Ticket</span><strong className="mt-1 block text-xl leading-none">{str(node.props.title, "ADMIT ONE")}</strong></div><div className="relative z-[1] flex items-end justify-between gap-2"><span className="rounded bg-black/80 px-2 py-1 font-mono text-[10px] text-white">{str(node.props.ticketId, "TICKET-001")}</span><span className="grid h-10 w-10 place-items-center rounded bg-white text-[8px] font-black" aria-label="QR context">QR</span></div><p className="relative z-[1] mt-2 text-[8px] leading-tight">{str(node.props.terms, "Draft terms — review before publishing.")}</p></div>;
    }
    if (variant === "perforated_stub" || node.props.perforated === true) {
      return <div className="relative flex h-full w-full overflow-hidden text-[#17100a]" style={surfaceStyle} data-component-kind="coupon" data-layout-variant="perforated_stub" data-coupon-perforation="true" {...surfaceAttrs}>{materialLayers}<div className="relative z-[1] flex w-[62%] flex-col justify-between p-3"><span className="text-[8px] font-black uppercase tracking-widest">Coupon</span><strong className="text-xl font-black leading-none">{str(node.props.offerValue, "20% OFF")}</strong><span className="text-[11px] font-bold">{str(node.props.headline, "TEAR HERE")}</span><p className="text-[7px] leading-tight opacity-80">{str(node.props.terms, "Draft terms — review before publishing.")}</p></div><div className="absolute inset-y-2 left-[62%] z-[1] w-0 border-l-2 border-dashed border-black/45" data-testid="coupon-perforation" aria-hidden /><div className="relative z-[1] flex w-[38%] flex-col items-center justify-between border-l border-transparent p-2"><span className="rounded bg-black/80 px-2 py-1 font-mono text-[9px] text-white">{str(node.props.code, "TEAR10")}</span><span className="grid h-14 w-14 place-items-center rounded bg-white text-[8px] font-black shadow" aria-label="QR placeholder">QR</span><span className="text-[7px] opacity-70">{str(node.props.expiration, "Expires soon")}</span></div></div>;
    }
    if (variant === "split_image" || node.props.showArtwork === true) {
      return <div className="relative flex h-full w-full overflow-hidden text-[#17100a]" style={surfaceStyle} data-component-kind="coupon" data-layout-variant="split_image" data-coupon-split="true" {...surfaceAttrs}>{materialLayers}<div className="relative z-[1] h-full w-[42%] bg-black/20" data-coupon-split="image" style={artwork ? { backgroundImage: `url("${artwork.replaceAll('"', "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} /><div className="relative z-[1] flex w-[58%] flex-col justify-between p-3" data-coupon-split="content"><strong className="text-xl font-black leading-none">{str(node.props.offerValue, "BUY 1 GET 1")}</strong><span className="text-[11px] font-bold">{str(node.props.headline, "LOOK BOOK")}</span><p className="text-[8px] leading-tight opacity-80">{str(node.props.description, str(node.props.terms, ""))}</p><div className="flex items-center gap-2"><span className="rounded bg-black/80 px-2 py-1 font-mono text-[9px] text-white">{str(node.props.code, "LOOKBOGO")}</span><span className="rounded-full bg-black px-2 py-1 text-[8px] font-semibold text-white">{str(node.props.ctaLabel, "Claim")}</span></div></div></div>;
    }
    if (variant === "qr_first" || node.props.qrFirst === true) {
      return <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden p-3 text-[#17100a]" style={surfaceStyle} data-component-kind="coupon" data-layout-variant="qr_first" data-coupon-qr-first="true" {...surfaceAttrs}>{materialLayers}<span className="relative z-[1] grid h-[42%] aspect-square max-h-28 place-items-center rounded-lg bg-white text-[10px] font-black shadow" aria-label="QR placeholder">QR</span><strong className="relative z-[1] text-center text-xl font-black leading-none">{str(node.props.offerValue, "FREE GIFT")}</strong><span className="relative z-[1] text-center text-[11px] font-bold">{str(node.props.headline, "SCAN TO CLAIM")}</span><span className="relative z-[1] font-mono text-[11px] font-bold">{str(node.props.code, "SCANME")}</span><p className="relative z-[1] text-center text-[7px] leading-tight opacity-80">{str(node.props.description, "Scan the code or enter the offer code to claim.")}</p></div>;
    }
    return <div className="relative flex h-full w-full flex-col justify-between overflow-hidden p-4 text-[#17100a]" style={surfaceStyle} data-component-kind="coupon" data-layout-variant="retail_card" data-surface-mode={artwork ? "uploaded_artwork" : "preset"} {...surfaceAttrs}>{materialLayers}<div className="relative z-[1]"><span className="text-[9px] font-black uppercase tracking-[.22em]">TapConnect Coupon</span><strong className="mt-1 block text-2xl font-black leading-none">{str(node.props.offerValue, "20% OFF")}</strong><span className="mt-1 block text-sm font-bold">{str(node.props.headline, "SPECIAL OFFER")}</span><p className="mt-1 text-[8px] leading-tight opacity-80">{str(node.props.description, "")}</p></div><div className="relative z-[1] flex items-end justify-between gap-2"><span className="rounded bg-black/80 px-2 py-1 font-mono text-[10px] text-white">{str(node.props.code, "SAVE20")}</span><span className="rounded-full bg-black px-3 py-1 text-[9px] font-semibold text-white">{str(node.props.ctaLabel, "Use offer")}</span></div><p className="relative z-[1] mt-2 text-[8px] leading-tight">{str(node.props.terms, "Draft terms — review before publishing.")}</p></div>;
  }

  if (componentKind === "form") {
    const fields = Array.isArray(node.props.fields) ? node.props.fields as Array<{ id?: string; label?: string; type?: string }> : [];
    return <form className="flex h-full w-full flex-col gap-2 rounded-xl border border-white/15 bg-white/5 p-3" aria-label={str(node.props.accessibleLabel, "Contact form")} onSubmit={(event) => event.preventDefault()} data-component-kind="form" data-live-submission="false"><strong className="text-sm">{str(node.props.heading, "Stay in touch")}</strong>{fields.map((field, index) => <label key={field.id || index} className="text-[9px]">{field.label || "Field"}<input type={field.type || "text"} disabled={!editMode} className="mt-1 h-8 w-full rounded border border-white/15 bg-black/20 px-2" /></label>)}<label className="flex items-start gap-2 text-[8px]"><input type="checkbox" disabled={!editMode} />{str(node.props.consent, "I agree to be contacted.")}</label><button type="button" className="min-h-9 rounded bg-[#b8ff2c] text-xs font-semibold text-black">Submit</button></form>;
  }

  if (node.primitive === "text") {
    const text = str(node.props.text, "Text");
    const curve = str(node.props.textCurve, "none");
    const glyphStyle: CSSProperties = {
      display: "inline-block",
      backgroundImage: node.props.gradientFill ? str(node.props.gradientFill) : undefined,
      backgroundClip: node.props.gradientFill ? "text" : undefined,
      WebkitBackgroundClip: node.props.gradientFill ? "text" : undefined,
      WebkitTextFillColor: node.props.gradientFill ? "transparent" : undefined,
      color: node.props.gradientFill ? "transparent" : undefined,
      WebkitTextStroke: num(node.props.outlineWidth, 0) > 0 ? `${num(node.props.outlineWidth, 0)}px ${str(node.props.outlineColor, str(node.props.color, "#f8fafc"))}` : undefined,
      textShadow: effectLayersCss("glyph", {
        effectPreset: str(node.props.effectPreset, str(node.props.glyphEffect, "")),
        glow: num(node.props.glow, 0),
        shadow: num(node.props.shadow, 0),
        glowColor: str(node.props.glowColor, str(node.props.color, "#f8fafc")),
        secondaryGlow: num(node.props.secondaryGlow, 0),
        coreBrightness: num(node.props.coreBrightness, 1),
        edgeWidth: num(node.props.edgeWidth, 1.25),
        auraIntensity: num(node.props.auraIntensity, 0.45),
        textShadowLayers: str(node.props.textShadowLayers) || null,
        color: str(node.props.color, "#f8fafc"),
      }).textShadow,
      transform: node.props.transformMode === "stretch_glyphs"
        ? `scale(${num(node.props.glyphScaleX, 100) / 100}, ${num(node.props.glyphScaleY, 100) / 100})`
        : undefined,
      transformOrigin: "center",
    };
    if (curve !== "none") {
      const radius = Math.max(8, Math.min(48, num(node.props.curveRadius, 38)));
      const arcWidth = Math.max(30, Math.min(96, num(node.props.curveArcWidth, 84)));
      const left = (100 - arcWidth) / 2;
      const right = 100 - left;
      const inside = node.props.curveInside === true;
      const down = (curve === "arch_down") !== inside;
      const path = curve === "circle"
        ? `M 50,50 m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`
        : down
          ? `M ${left} 18 Q 50 ${18 + radius} ${right} 18`
          : `M ${left} 82 Q 50 ${82 - radius} ${right} 82`;
      const color = str(node.props.color, "#f8fafc");
      const [start, middle, end] = gradientStops(node.props.gradientFill, color);
      const gradientId = `curve-gradient-${node.id}`;
      return (
        <svg viewBox={curve === "circle" ? "0 0 100 100" : "0 14 100 72"} className="h-full w-full overflow-visible bg-transparent" role="img" aria-label={text} data-text-curve={curve} data-text-box-background="transparent">
          <defs><linearGradient id={gradientId} x1="0" x2="1"><stop offset="0" stopColor={start} /><stop offset=".5" stopColor={middle} /><stop offset="1" stopColor={end} /></linearGradient></defs>
          <path id={`curve-${node.id}`} d={path} fill="none" />
          <text
            fill={node.props.gradientFill ? `url(#${gradientId})` : color}
            fontFamily={str(node.props.fontFamily, "Inter, system-ui, sans-serif")}
            fontSize={Math.max(6, num(node.props.fontSize, 18) / 2.5)}
            fontWeight={num(node.props.fontWeight, 600)}
            letterSpacing={`${num(node.props.letterSpacingEm, 0)}em`}
            stroke={num(node.props.outlineWidth, 0) > 0 ? str(node.props.outlineColor, color) : undefined}
            strokeWidth={num(node.props.outlineWidth, 0)}
            style={{
              filter: effectLayersCss("icon_artwork", {
                effectPreset: str(node.props.effectPreset, str(node.props.glyphEffect, "")),
                glow: num(node.props.glow, 0),
                shadow: num(node.props.shadow, 0),
                glowColor: str(node.props.glowColor, color),
                secondaryGlow: num(node.props.secondaryGlow, 0),
                coreBrightness: num(node.props.coreBrightness, 1),
                edgeWidth: num(node.props.edgeWidth, 1.25),
                auraIntensity: num(node.props.auraIntensity, 0.45),
                color,
              }).filter,
            }}
          >
            <textPath href={`#curve-${node.id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
          </text>
        </svg>
      );
    }
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1"
        data-text-box-background={node.props.boxGradient || (node.props.boxFill && str(node.props.boxFill) !== "transparent") ? "filled" : "transparent"}
        data-glyph-effect={str(node.props.effectPreset, str(node.props.glyphEffect, node.props.materialPreset ? String(node.props.materialPreset) : node.props.gradientFill ? "gradient" : node.props.glow ? "glow" : "none"))}
        data-glyph-gradient={node.props.gradientFill ? "true" : "false"}
        data-text-box={node.props.boxFill || node.props.boxGradient || node.props.boxBorder ? "true" : "false"}
        style={{
          color: str(node.props.color, "#f8fafc"),
          fontSize: num(node.props.fontSize, 18),
          fontFamily: str(node.props.fontFamily, "Inter, system-ui, sans-serif"),
          fontWeight: num(node.props.fontWeight, 600),
          fontStyle: node.props.italic === true ? "italic" : "normal",
          textDecoration: [
            node.props.underline === true ? "underline" : "",
            node.props.strikethrough === true ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined,
          letterSpacing: `${num(node.props.letterSpacingEm, 0)}em`,
          lineHeight: num(node.props.lineHeight, 1.2),
          textTransform: str(node.props.textTransform, "none") as
            | "none"
            | "uppercase"
            | "lowercase"
            | "capitalize",
          textAlign: (str(node.props.align, "center") as
            | "left"
            | "center"
            | "right"
            | "justify"),
          justifyContent:
            str(node.props.align, "center") === "left"
              ? "flex-start"
              : str(node.props.align, "center") === "right"
                ? "flex-end"
                : "center",
          // Text Box fill only — never glyph gradientFill.
          background: node.props.boxGradient ? str(node.props.boxGradient) : node.props.boxFill ? str(node.props.boxFill) : "transparent",
          border: node.props.boxBorder ? `1px solid ${str(node.props.boxBorder)}` : undefined,
          borderRadius: node.props.boxRadius != null ? num(node.props.boxRadius, 0) : undefined,
          padding: node.props.boxPadding != null ? num(node.props.boxPadding, 0) : undefined,
          boxShadow: effectLayersCss("text_box", {
            effectPreset: str(node.props.effectPreset, ""),
            glow: num(node.props.boxGlow, 0),
            shadow: num(node.props.boxShadow, 0),
            glowColor: str(node.props.glowColor, str(node.props.color, "#b8ff2c")),
            secondaryGlow: num(node.props.secondaryGlow, 0),
            coreBrightness: num(node.props.coreBrightness, 1),
            edgeWidth: num(node.props.edgeWidth, 1.25),
            auraIntensity: num(node.props.auraIntensity, 0.45),
            color: str(node.props.color, "#b8ff2c"),
          }).boxShadow,
        }}
      >
        <InlineEditableText
          nodeId={node.id}
          value={str(node.props.text, "Text")}
          editing={Boolean(editMode && textEditing)}
          style={glyphStyle}
          onCommit={onEditText}
          onFinish={onFinishTextEdit}
        />
      </div>
    );
  }

  if (node.primitive === "image") {
    const src = str(node.props.src);
    const fit = str(node.props.fit, "cover") as "cover" | "contain" | "fill" | "none";
    const flipX = node.props.flipX === true ? -1 : 1;
    const flipY = node.props.flipY === true ? -1 : 1;
    const mediaRotation = num(node.props.mediaRotation, 0);
    const mediaScale = num(node.props.mediaScale, 1);
    const positionX = num(node.props.positionX, 0.5);
    const positionY = num(node.props.positionY, 0.5);
    const cropX = Math.max(0, Math.min(1, num(node.props.cropX, 0)));
    const cropY = Math.max(0, Math.min(1, num(node.props.cropY, 0)));
    const cropWidth = Math.max(
      0.05,
      Math.min(1 - cropX, num(node.props.cropWidth, 1))
    );
    const cropHeight = Math.max(
      0.05,
      Math.min(1 - cropY, num(node.props.cropHeight, 1))
    );
    const temperature = num(node.props.temperature, 0);
    const tint = num(node.props.tint, 0);
    const highlights = num(node.props.highlights, 0);
    const shadows = num(node.props.shadows, 0);
    const clarity = num(node.props.clarity, 0);
    const vignette = num(node.props.vignette, 0);
    const duotoneStrength = num(node.props.duotoneStrength, 0);
    const imageRadius = num(node.props.outlineRadius, 6);
    return (
      <VisualPartsShell props={node.props} radius={imageRadius} testIdPrefix={`image-${node.id}`}>
      <div
        className="relative h-full w-full overflow-hidden rounded-md bg-white/10"
        {...visualPartsDataAttrs(node.props)}
        style={{
          opacity: num(node.props.opacity, 1),
          borderWidth:
            str(node.props.outlinePlacement, "center") === "outside"
              ? undefined
              : num(node.props.outlineWidth, 0),
          borderStyle: str(node.props.outlineStyle, "solid") as
            | "solid"
            | "dashed"
            | "dotted",
          borderColor: colorWithOpacity(
            str(node.props.outlineColor, "#ffffff"),
            num(node.props.outlineOpacity, 1)
          ),
          borderRadius: imageRadius,
          boxShadow: [
            num(node.props.boxShadow, 0) ? `0 8px ${num(node.props.boxShadow, 18)}px rgba(0,0,0,.4)` : "",
            num(node.props.boxGlow, 0) ? `0 0 ${num(node.props.boxGlow, 18)}px ${str(node.props.glowColor, "#b8ff2c")}` : "",
          ].filter(Boolean).join(", ") || undefined,
          outline:
            str(node.props.outlinePlacement, "center") === "outside" &&
            num(node.props.outlineWidth, 0) > 0
              ? `${num(node.props.outlineWidth, 0)}px ${str(
                  node.props.outlineStyle,
                  "solid"
                )} ${colorWithOpacity(
                  str(node.props.outlineColor, "#ffffff"),
                  num(node.props.outlineOpacity, 1)
                )}`
              : undefined,
          outlineOffset: 0,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={node.props.decorative === true ? "" : str(node.props.alt, "Image")}
            className="h-full w-full"
            style={{
              objectFit: fit,
              objectPosition: `${num(node.props.focalX, 0.5) * 100}% ${
                num(node.props.focalY, 0.5) * 100
              }%`,
              clipPath: `inset(${cropY * 100}% ${
                (1 - cropX - cropWidth) * 100
              }% ${(1 - cropY - cropHeight) * 100}% ${cropX * 100}%)`,
              transform: `translate(${(positionX - 0.5) * 200}%, ${
                (positionY - 0.5) * 200
              }%) scale(${mediaScale * flipX}, ${mediaScale * flipY}) rotate(${mediaRotation}deg)`,
              filter: [
                `brightness(${
                  num(node.props.brightness, 1) + highlights * 0.18 + shadows * 0.12
                })`,
                `contrast(${num(node.props.contrast, 1) + clarity * 0.2})`,
                `saturate(${num(node.props.saturation, 1)})`,
                `sepia(${Math.max(0, temperature) * 0.35})`,
                `hue-rotate(${Math.max(0, -temperature) * 18 + tint * 14}deg)`,
                `blur(${num(node.props.blur, 0)}px)`,
                node.props.grayscale === true ? "grayscale(1)" : "",
                node.props.sepia === true ? "sepia(1)" : "",
              ]
                .filter(Boolean)
                .join(" "),
            }}
            draggable={false}
          />
        ) : editMode ? (
          <div className="flex h-full items-center justify-center text-[10px] text-white/80">
            <span data-editor-placeholder="media">Add media</span>
          </div>
        ) : null}
        {src && duotoneStrength > 0 ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${str(
                node.props.duotoneShadow,
                "#0b0f19"
              )}, ${str(node.props.duotoneHighlight, "#9cff57")})`,
              mixBlendMode: "color",
              opacity: duotoneStrength,
            }}
            aria-hidden
          />
        ) : null}
        {src && vignette > 0 ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle, transparent 35%, rgba(0,0,0,.95) 100%)",
              opacity: vignette,
            }}
            aria-hidden
          />
        ) : null}
      </div>
      </VisualPartsShell>
    );
  }

  if (node.primitive === "frame") {
    const mask = str(node.props.mask, "rounded") as FrameMaskId;
    const clipId = `mask-${node.id}`;
    const src = str(node.props.mediaSrc) || str(node.props.src);
    const fit = str(node.props.fit, "cover");
    const fx = num(node.props.focalX, 0.5) * 100;
    const fy = num(node.props.focalY, 0.5) * 100;
    const borderW = num(node.props.borderWidth, 0);
    const borderColor = str(node.props.borderColor, "#ffffff");
    const borderOpacity = num(node.props.borderOpacity, 1);
    const borderStyle = str(node.props.borderStyle, "solid");
    const borderAlignment = str(node.props.borderAlignment, "center");
    const scaleStroke = node.props.scaleStroke !== false;
    const borderGlow = num(node.props.borderGlow, 0);
    const borderShadow = num(node.props.borderShadow, 0);
    const mediaScale = num(node.props.mediaScale, 1);
    return (
      <div className="relative h-full w-full">
        <svg className="absolute h-0 w-0" aria-hidden>
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path
                d={frameMaskPath(mask)}
                transform="scale(0.01 0.01)"
              />
            </clipPath>
          </defs>
        </svg>
        <div
          className="h-full w-full overflow-hidden bg-white/10"
          style={{
            clipPath: `url(#${clipId})`,
            WebkitClipPath: `url(#${clipId})`,
            padding: num(node.props.padding, 0),
          }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={str(node.props.alt, "Framed media")}
              className="h-full w-full"
              style={{
                objectFit: fit as "cover" | "contain",
                objectPosition: `${fx}% ${fy}%`,
                transform: mediaScale !== 1 ? `scale(${mediaScale})` : undefined,
                transformOrigin: `${fx}% ${fy}%`,
              }}
              draggable={false}
            />
          ) : editMode ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-[10px] text-white/45">
              <span>{FRAME_MASK_CATALOG.find((m) => m.id === mask)?.label || "Frame"}</span>
              <span data-editor-placeholder="media">Add media</span>
            </div>
          ) : null}
        </div>
        {borderW > 0 ? (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
            style={{
              clipPath:
                borderAlignment === "inside"
                  ? `url(#${clipId}-outline-inside)`
                  : undefined,
              mask:
                borderAlignment === "outside"
                  ? `url(#${clipId}-outline-outside)`
                  : undefined,
              filter:
                borderGlow > 0
                  ? `drop-shadow(0 0 ${borderGlow}px ${borderColor})`
                  : borderShadow > 0
                    ? `drop-shadow(0 ${Math.max(1, borderShadow / 2)}px ${borderShadow}px rgba(0,0,0,.55))`
                    : undefined,
            }}
          >
            <defs>
              <clipPath id={`${clipId}-outline-inside`}>
                <path d={frameMaskPath(mask)} />
              </clipPath>
              <mask id={`${clipId}-outline-outside`}>
                <rect width="100" height="100" fill="white" />
                <path d={frameMaskPath(mask)} fill="black" />
              </mask>
            </defs>
            <path
              d={frameMaskPath(mask)}
              fill="none"
              stroke={borderColor}
              strokeOpacity={borderOpacity}
              strokeWidth={
                borderAlignment === "inside" || borderAlignment === "outside"
                  ? borderW * 2
                  : borderW
              }
              strokeDasharray={
                borderStyle === "dashed"
                  ? "8 5"
                  : borderStyle === "dotted"
                    ? "1 5"
                    : undefined
              }
              strokeLinecap={borderStyle === "dotted" ? "round" : "butt"}
              strokeLinejoin="round"
              vectorEffect={scaleStroke ? undefined : "non-scaling-stroke"}
            />
          </svg>
        ) : null}
      </div>
    );
  }

  if (node.primitive === "shape") {
    const elementKind = str(node.props.elementKind);
    if (elementKind === "icon") {
      const fill = str(node.props.fill, "#b8ff2c");
      const stroke = str(node.props.stroke, fill);
      const strokeWidth = num(node.props.strokeWidth, 0);
      const opacity = num(node.props.opacity, 1);
      const glow = num(node.props.glow, 0);
      const shadow = num(node.props.shadow, 0);
      const blur = num(node.props.blur, 0);
      const backingEnabled = node.props.backingSurfaceEnabled === true;
      const radius = backingEnabled ? num(node.props.radius, 0) : 0;
      const backingMaterial = backingEnabled
        ? resolveMaterialSurfaceFromProps(node.props, "icon_backing")
        : null;
      // Path-aware artwork effects — never box-shadow on the Icon Element wrapper.
      const glowColor = str(node.props.glowColor, fill);
      const effectFilter = effectLayersCss("icon_artwork", {
        effectPreset: str(node.props.effectPreset, str(node.props.glyphEffect, "")),
        glow,
        shadow,
        glowColor,
        secondaryGlow: num(node.props.secondaryGlow, 0),
        coreBrightness: num(node.props.coreBrightness, 1),
        edgeWidth: num(node.props.edgeWidth, 1.25),
        auraIntensity: num(node.props.auraIntensity, 0.45),
        color: fill,
      }).filter;
      const artworkFilter = [effectFilter, blur > 0 ? `blur(${blur}px)` : ""].filter(Boolean).join(" ") || undefined;
      const artwork = typeof node.props.iconSvg === "string" && node.props.iconSvg.includes("<svg") ? (
        <span
          className="grid h-full w-full place-items-center overflow-visible [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible"
          data-icon-provider={str(node.props.iconProvider, "native")}
          data-icon-svg="true"
          data-icon-canonical={str(node.props.icon, "")}
          data-icon-artwork="true"
          style={{ color: fill, filter: artworkFilter }}
          aria-hidden
          dangerouslySetInnerHTML={{ __html: String(node.props.iconSvg) }}
        />
      ) : node.props.iconProvider === "iconify" && node.props.iconCollection && node.props.iconName ? (
        <img /* eslint-disable-line @next/next/no-img-element */
          src={`https://api.iconify.design/${encodeURIComponent(str(node.props.iconCollection))}/${encodeURIComponent(str(node.props.iconName))}.svg?color=${encodeURIComponent(fill)}`}
          alt={node.props.decorative === true ? "" : str(node.props.accessibleLabel, "Icon")}
          className="h-full w-full object-contain"
          data-icon-provider="iconify"
          data-icon-artwork="true"
          style={{ filter: artworkFilter }}
        />
      ) : (
        <span data-icon-artwork="true" style={{ filter: artworkFilter }} className="grid h-full w-full place-items-center">
          <ElementIcon name={str(node.props.iconName || node.props.icon, "sparkles")} size={num(node.props.iconSize, 48)} />
        </span>
      );
      return (
        <div
          className="relative flex h-full w-full items-center justify-center overflow-visible bg-transparent"
          style={{
            color: fill,
            opacity,
            borderRadius: radius,
            background:
              backingMaterial && backingMaterial.fillAuthority !== "transparent"
                ? backingMaterial.background
                : "transparent",
            backgroundSize: backingMaterial?.backgroundSize,
            border:
              backingMaterial &&
              backingMaterial.borderWidth > 0 &&
              backingMaterial.borderStyle !== "none"
                ? `${backingMaterial.borderWidth}px ${backingMaterial.borderStyle} ${backingMaterial.borderColor}`
                : "none",
            boxShadow: backingMaterial?.boxShadow,
          }}
          role={node.props.decorative === true ? undefined : "img"}
          aria-hidden={node.props.decorative === true ? true : undefined}
          aria-label={node.props.decorative === true ? undefined : str(node.props.accessibleLabel, "Icon")}
          data-icon-id={str(node.props.icon, "sparkles")}
          data-icon-fill={fill}
          data-icon-stroke={stroke}
          data-icon-stroke-width={String(strokeWidth)}
          data-icon-opacity={String(opacity)}
          data-icon-radius={String(radius)}
          data-icon-backing={backingEnabled ? "on" : "off"}
          data-icon-glow={String(glow)}
          data-icon-effect-target="artwork"
          data-material-fill-authority={backingMaterial?.fillAuthority}
          data-material-stop-count={
            backingMaterial ? String(backingMaterial.gradientStopCount) : undefined
          }
          data-material-highlight={backingMaterial?.highlight ? "true" : "false"}
          data-surface-texture={backingMaterial?.textureToken || undefined}
        >
          {backingMaterial ? (
            <MaterialSurfaceLayers surface={backingMaterial} testIdPrefix={`icon-backing-${node.id}`} />
          ) : null}
          <span className="relative z-[1] grid h-full w-full place-items-center">{artwork}</span>
        </div>
      );
    }
    if (elementKind === "badge") {
      const badgeShape = str(node.props.badgeShape, "pill");
      const badgeClip = badgeShapeClipPath(badgeShape);
      const badgeMaterial = resolveMaterialSurfaceFromProps(
        {
          ...node.props,
          // Badge defaults fill when no Material / gradient authored.
          fill: node.props.fill ?? "#ef4444",
          gradientFill: node.props.gradientFill,
        },
        "badge"
      );
      const borderWidth = badgeMaterial.borderWidth;
      const borderStyle = badgeMaterial.borderStyle;
      const borderColor = badgeMaterial.borderColor === "transparent" ? str(node.props.borderColor, "#fff") : badgeMaterial.borderColor;
      const pathStroke = badgeUsesPathStroke(badgeShape) && borderWidth > 0 && borderStyle !== "none";
      const svgPoints = pathStroke ? badgeShapeSvgPoints(badgeShape) : null;
      const dash =
        borderStyle === "dashed" ? "6 4" : borderStyle === "dotted" ? "1.5 3" : undefined;
      const fillBackground = badgeMaterial.background || str(node.props.fill, "#ef4444");
      return (
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden px-2 text-center"
          data-surface-texture={badgeMaterial.textureToken || undefined}
          data-material-fill-authority={badgeMaterial.fillAuthority}
          data-material-stop-count={String(badgeMaterial.gradientStopCount)}
          style={{
            background: pathStroke ? "transparent" : fillBackground,
            color: str(node.props.color, "#ffffff"),
            borderRadius: badgeShapeBorderRadius(badgeShape, num(node.props.radius, 999)),
            clipPath: pathStroke ? undefined : badgeClip,
            border: !pathStroke && borderWidth > 0 && borderStyle !== "none"
              ? `${borderWidth}px ${borderStyle} ${borderColor}`
              : undefined,
            boxShadow: badgeMaterial.boxShadow,
            fontFamily: str(node.props.fontFamily, "Inter, system-ui, sans-serif"),
            fontSize: num(node.props.fontSize, 18),
            fontWeight: num(node.props.fontWeight, 800),
            letterSpacing: `${num(node.props.letterSpacingEm, .04)}em`,
            lineHeight: num(node.props.lineHeight, 1.15),
            opacity: badgeMaterial.opacity,
            textAlign: str(node.props.textAlign, "center") as CSSProperties["textAlign"],
          }}
          data-badge-shape={badgeShape}
          data-badge-path-stroke={pathStroke ? "true" : "false"}
          data-material={str(node.props.materialPreset, "")}
          data-effect={str(node.props.effectPreset, "")}
        >
          {pathStroke && svgPoints ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: fillBackground, clipPath: badgeClip }}
                data-testid="badge-shape-fill"
              />
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                data-testid="badge-shape-stroke"
              >
                <polygon
                  points={svgPoints}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth={borderWidth}
                  strokeDasharray={dash}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </>
          ) : null}
          <MaterialSurfaceLayers surface={badgeMaterial} clipPath={badgeClip} testIdPrefix={`badge-${node.id}`} />
          <span className="relative z-[1] whitespace-pre-wrap" data-testid="badge-text">{str(node.props.text, "SALE")}</span>
        </div>
      );
    }
    const shape = str(node.props.shape, "rounded");
    const fillKind = str(node.props.fillKind, "solid");
    const radius =
      shape === "ellipse"
        ? "50%"
        : shape === "rectangle"
          ? 0
          : num(node.props.radius, 12);
    const clipPaths: Record<string, string | undefined> = {
      triangle: "polygon(50% 0, 100% 100%, 0 100%)",
      polygon: "polygon(25% 7%, 75% 7%, 100% 50%, 75% 93%, 25% 93%, 0 50%)",
      star: "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 94%, 50% 72%, 21% 94%, 32% 57%, 2% 35%, 39% 35%)",
      arrow: "polygon(0 30%, 60% 30%, 60% 0, 100% 50%, 60% 100%, 60% 70%, 0 70%)",
      badge: "polygon(50% 0, 62% 20%, 85% 15%, 80% 38%, 100% 50%, 80% 62%, 85% 85%, 62% 80%, 50% 100%, 38% 80%, 15% 85%, 20% 62%, 0 50%, 20% 38%, 15% 15%, 38% 20%)",
      speech: "polygon(0 0, 100% 0, 100% 78%, 65% 78%, 50% 100%, 45% 78%, 0 78%)",
      organic: "polygon(10% 25%, 30% 5%, 60% 12%, 86% 5%, 95% 35%, 88% 70%, 65% 92%, 35% 85%, 8% 95%, 2% 55%)",
    };
    const shapeMaterial =
      node.props.materialPreset || node.props.gradientFill || node.props.highlight || node.props.shine
        ? resolveMaterialSurfaceFromProps(node.props, "container")
        : null;
    const fill =
      fillKind === "gradient" && node.props.gradient
        ? gradientToCss(node.props.gradient as typeof DEFAULT_GRADIENT)
        : fillKind === "image" && str(node.props.imageSrc)
          ? `url("${str(node.props.imageSrc).replaceAll('"', "%22")}") center / cover no-repeat`
          : shapeMaterial
            ? shapeMaterial.background
            : str(node.props.gradientFill, str(node.props.fill, "#22c55e"));
    const shadow = num(node.props.shadow, 0);
    const glow = num(node.props.glow, 0);
    const shapeShadow =
      shapeMaterial?.boxShadow ||
      [
        shadow > 0 ? `0 ${Math.max(2, shadow / 3)}px ${shadow}px rgba(0,0,0,.55)` : "",
        glow > 0 ? `0 0 ${glow}px ${str(node.props.stroke, "#9cff57")}` : "",
      ]
        .filter(Boolean)
        .join(", ") || undefined;
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        data-material-fill-authority={shapeMaterial?.fillAuthority}
        data-material-stop-count={shapeMaterial ? String(shapeMaterial.gradientStopCount) : undefined}
        style={{
          background: fill,
          opacity: shapeMaterial?.opacity ?? num(node.props.opacity, 1),
          borderRadius: radius,
          clipPath: clipPaths[shape],
          border:
            num(node.props.strokeWidth, 0) > 0
              ? `${num(node.props.strokeWidth, 0)}px solid ${str(node.props.stroke, "#fff")}`
              : shapeMaterial && shapeMaterial.borderWidth > 0
                ? `${shapeMaterial.borderWidth}px ${shapeMaterial.borderStyle} ${shapeMaterial.borderColor}`
                : undefined,
          boxShadow: shapeShadow,
          mixBlendMode: str(node.props.blendMode, "normal") as
            | "normal"
            | "multiply"
            | "screen"
            | "overlay"
            | "soft-light",
          transform: `scale(${node.props.flipX === true ? -1 : 1}, ${
            node.props.flipY === true ? -1 : 1
          })`,
        }}
      >
        {shapeMaterial ? <MaterialSurfaceLayers surface={shapeMaterial} testIdPrefix={`shape-${node.id}`} /> : null}
      </div>
    );
  }

  if (node.primitive === "border") {
    const vpDivider = readVisualPartsState(node.props);
    const botanical = str(node.props.vpDividerTreatment) === "copper_botanical" || vpDivider.dividerLinePartId === "divider_copper_botanical";
    const style = botanical ? "solid" : str(node.props.style, "solid");
    const thickness = botanical ? Math.max(num(node.props.thickness, 2), 4) : num(node.props.thickness, 2);
    const color = botanical ? "#c56a2d" : str(node.props.color, "#fff");
    const opacity = num(node.props.opacity, 1);
    const cap = str(node.props.cap, "round");
    const startMarker = str(node.props.startMarker, "none");
    const endMarker = str(node.props.endMarker, "none");
    const endcapSvg = botanical
      ? ornamentSvg(str(node.props.vpDividerEndcapAssetId, "copper_divider_endcap"))
      : "";
    const markerId = (side: "start" | "end", type: string) =>
      `divider-${node.id}-${side}-${type}`;
    const dash =
      style === "dashed"
        ? "10 7"
        : style === "dotted"
          ? "1 7"
          : style === "custom"
            ? str(node.props.customDash, "12 5 3 5")
            : undefined;
    const linePath =
      style === "wavy"
        ? "M2 10 C8 1 14 19 20 10 S32 1 38 10 S50 19 56 10 S68 1 74 10 S86 19 98 10"
        : "M2 10 H98";
    const markerShape = (type: string) => {
      if (type === "arrow") return <path d="M0 0 L10 5 L0 10 Z" fill={color} />;
      if (type === "diamond")
        return <path d="M0 5 L5 0 L10 5 L5 10 Z" fill={color} />;
      if (type === "circle") return <circle cx="5" cy="5" r="4" fill={color} />;
      if (type === "square") return <rect x="1" y="1" width="8" height="8" fill={color} />;
      return null;
    };
    return (
      <div className="relative h-full w-full" {...visualPartsDataAttrs(node.props)} data-vp-divider-treatment={botanical ? "copper_botanical" : "minimal"}>
      {botanical && endcapSvg ? (
        <>
          <span className="pointer-events-none absolute left-0 top-1/2 z-[1] h-5 w-5 -translate-y-1/2 [&_svg]:h-full [&_svg]:w-full" data-testid={`divider-endcap-start-${node.id}`} dangerouslySetInnerHTML={{ __html: endcapSvg }} />
          <span className="pointer-events-none absolute right-0 top-1/2 z-[1] h-5 w-5 -translate-y-1/2 scale-x-[-1] [&_svg]:h-full [&_svg]:w-full" data-testid={`divider-endcap-end-${node.id}`} dangerouslySetInnerHTML={{ __html: endcapSvg }} />
        </>
      ) : null}
      <svg
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        data-border-style={style}
        role="img"
        aria-label={str(node.props.label, "Divider")}
      >
        <defs>
          {(["start", "end"] as const).map((side) => {
            const type = side === "start" ? startMarker : endMarker;
            return type === "none" ? null : (
              <marker
                key={side}
                id={markerId(side, type)}
                viewBox="0 0 10 10"
                refX={side === "start" ? 1 : 9}
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                {markerShape(type)}
              </marker>
            );
          })}
        </defs>
        {style === "double" ? (
          <>
            <path
              d="M2 7 H98"
              fill="none"
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={Math.max(1, thickness / 2)}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M2 13 H98"
              fill="none"
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={Math.max(1, thickness / 2)}
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeOpacity={opacity}
            strokeWidth={thickness}
            strokeDasharray={dash}
            strokeLinecap={cap === "square" ? "square" : "round"}
            vectorEffect="non-scaling-stroke"
            markerStart={
              startMarker === "none"
                ? undefined
                : `url(#${markerId("start", startMarker)})`
            }
            markerEnd={
              endMarker === "none"
                ? undefined
                : `url(#${markerId("end", endMarker)})`
            }
          />
        )}
      </svg>
      </div>
    );
  }

  if (node.primitive === "button") {
    const nestedLabel = buttonContentNode(node.props, "label", node.id);
    const labelProps = nestedLabel?.props ?? node.props;
    const labelValue = str(labelProps.text, str(node.props.label, "Button"));
    const presentation = str(node.props.presentation, "rounded");
    const showLabel = node.props.showLabel !== false && presentation !== "icon_circle";
    const showDescription = node.props.showDescription === true || presentation === "icon_description";
    const icon = str(node.props.icon, "arrow-up-right");
    const showIcon = node.props.showIcon !== false && icon !== "none" && icon !== "";
    const circle = presentation === "circle" || presentation === "icon_circle" || presentation === "icon_label" || presentation === "icon_description";
    const labelBelow = presentation === "icon_label" || presentation === "icon_description";
    const actionHref = buildButtonHref(node.props);
    const linkedRadius = presentation === "rectangle" ? 0 : presentation === "square" ? num(node.props.radius, 0) : (circle || presentation === "pill") ? 999 : num(node.props.radius, 14);
    const radius = node.props.cornersLinked === false && presentation === "custom"
      ? `${num(node.props.radiusTopLeft, linkedRadius)}px ${num(node.props.radiusTopRight, linkedRadius)}px ${num(node.props.radiusBottomRight, linkedRadius)}px ${num(node.props.radiusBottomLeft, linkedRadius)}px`
      : linkedRadius;
    const materialSurface = resolveMaterialSurfaceFromProps(node.props, "button");
    const surfaceKind = str(node.props.buttonSurfaceKind, "solid");
    const surfaceBackground = materialSurface.background;
    const shadowParts = materialSurface.boxShadow;
    // Button content door writes parent labelColor/textColor AND syncs nested label.color.
    // Parent mirrors must win over a stale ephemeral nested default (#0b0f19).
    const resolvedLabelColor = str(
      node.props.labelColor,
      str(node.props.textColor, str(labelProps.color, "#0b0f19"))
    );
    const labelStyle: CSSProperties = {
      color: resolvedLabelColor,
      fontFamily: str(labelProps.fontFamily, str(node.props.fontFamily, "Inter, system-ui, sans-serif")),
      fontSize: num(labelProps.fontSize, num(node.props.fontSize, 14)),
      fontWeight: num(labelProps.fontWeight, num(node.props.fontWeight, 600)),
      letterSpacing: `${num(labelProps.letterSpacingEm, num(node.props.letterSpacingEm, 0))}em`,
      textTransform: str(labelProps.textTransform, str(node.props.textTransform, "none")) as CSSProperties["textTransform"],
      transform: `translate(${num(node.props.labelOffsetX, 0)}px, ${num(node.props.labelOffsetY, 0)}px)`,
      textAlign: str(node.props.textAlign, "center") as CSSProperties["textAlign"],
      // Label glyph gradient only — never Button Surface gradientFill.
      background: (labelProps.gradientFill || node.props.labelGradientFill) ? str(labelProps.gradientFill || node.props.labelGradientFill) : undefined,
      backgroundClip: (labelProps.gradientFill || node.props.labelGradientFill) ? "text" : undefined,
      WebkitBackgroundClip: (labelProps.gradientFill || node.props.labelGradientFill) ? "text" : undefined,
      WebkitTextFillColor: (labelProps.gradientFill || node.props.labelGradientFill) ? "transparent" : undefined,
      textShadow: effectLayersCss("glyph", {
        effectPreset: str(labelProps.effectPreset, str(node.props.effectPreset, "")),
        glow: num(labelProps.glow, num(node.props.glow, 0)),
        shadow: num(labelProps.shadow, num(node.props.shadow, 0)),
        glowColor: str(labelProps.glowColor, str(node.props.glowColor, "currentColor")),
        secondaryGlow: num(labelProps.secondaryGlow, num(node.props.secondaryGlow, 0)),
        coreBrightness: num(node.props.coreBrightness, 1),
        edgeWidth: num(node.props.edgeWidth, 1.25),
        auraIntensity: num(node.props.auraIntensity, 0.45),
        color: str(labelProps.color, str(node.props.labelColor, "currentColor")),
      }).textShadow,
    };
    const nestedIcon = buttonContentNode(node.props, "icon", node.id);
    const iconSvg = str(node.props.iconSvg, str(nestedIcon?.props.iconSvg));
    const iconPosition = str(node.props.iconPosition, "before");
    const freeLayout = str(node.props.buttonContentLayout, "auto") === "free";
    const verticalIcon = iconPosition === "above" || iconPosition === "below" || labelBelow;
    const vpState = readVisualPartsState(node.props);
    const iconStationActive = Boolean(vpState.iconStationGeometryPartId);
    const iconInner = iconSvg.includes("<svg") ? (
      <span className="grid h-full w-full place-items-center [&_svg]:h-full [&_svg]:w-full" aria-hidden dangerouslySetInnerHTML={{ __html: iconSvg }} />
    ) : (
      <ElementIcon name={icon} size={num(node.props.iconSize, iconStationActive ? 18 : 20)} />
    );
    const makeIconEl = (side: "primary" | "mirror") =>
      showIcon ? (
        <span
          data-testid={side === "primary" ? `button-icon-${node.id}` : `button-icon-mirror-${node.id}`}
          data-icon-canonical={icon}
          data-icon-svg={iconSvg.includes("<svg") ? "true" : "false"}
          data-vp-icon-station={iconStationActive ? "true" : undefined}
          style={{
            width: num(node.props.iconSize, iconStationActive ? 28 : 20),
            height: num(node.props.iconSize, iconStationActive ? 28 : 20),
            color: str(node.props.iconColor, str(node.props.textColor, "#0b0f19")),
            transform: `translate(${num(node.props.iconOffsetX, 0)}px, ${num(node.props.iconOffsetY, 0)}px)`,
            position: freeLayout ? "absolute" : undefined,
            left: freeLayout ? `${num(node.props.iconFreeX, 12)}px` : undefined,
            top: freeLayout ? `${num(node.props.iconFreeY, 12)}px` : undefined,
          }}
        >
          {iconStationActive ? <IconStationShell props={node.props}>{iconInner}</IconStationShell> : iconInner}
        </span>
      ) : null;
    const buttonIconEl = makeIconEl("primary");
    const mirrorIconEl = node.props.iconStationBoth === true ? makeIconEl("mirror") : null;
    const buttonLabelEl = !labelBelow && showLabel
      ? (node.props.contentEditing === true
        ? <InlineEditableText nodeId={node.id} value={labelValue} editing={Boolean(editMode && textEditing)} style={{ ...labelStyle, position: freeLayout ? "absolute" : undefined, left: freeLayout ? `${num(node.props.labelFreeX, 40)}px` : undefined, top: freeLayout ? `${num(node.props.labelFreeY, 14)}px` : undefined }} onCommit={onEditText} onFinish={onFinishTextEdit} />
        : <span style={{ ...labelStyle, whiteSpace: "pre-wrap", position: freeLayout ? "absolute" : undefined, left: freeLayout ? `${num(node.props.labelFreeX, 40)}px` : undefined, top: freeLayout ? `${num(node.props.labelFreeY, 14)}px` : undefined }}>{labelValue}</span>)
      : null;
    const rails = readActionRailLayout(node.props);
    const surfaceInner = (
      <span
        className="relative inline-flex h-full w-full shrink-0 items-center justify-center overflow-visible"
        style={{
          minHeight: 44,
          background: surfaceBackground,
          backgroundSize: materialSurface.backgroundSize ?? (surfaceKind === "texture" ? "8px 8px" : undefined),
          color: str(node.props.iconColor, str(node.props.textColor, "#0b0f19")),
          borderRadius: radius,
          borderWidth: vpState.rimPartId ? 0 : materialSurface.borderWidth,
          borderStyle: materialSurface.borderStyle as CSSProperties["borderStyle"],
          borderColor: materialSurface.borderColor,
          boxShadow: vpState.rimPartId ? undefined : shadowParts,
          opacity: materialSurface.opacity,
          padding: num(node.props.padding, 8),
          gap: num(node.props.spacing, rails.gapPx),
          flexDirection: verticalIcon ? "column" : "row",
          ...(rails.railAware ? (railStyleVars(rails) as CSSProperties) : {}),
        }}
        data-button-surface-kind={surfaceKind}
        data-button-radius={String(linkedRadius)}
        data-button-content-layout={str(node.props.buttonContentLayout, "auto")}
        data-button-high-gloss={materialSurface.shine ? "true" : "false"}
        data-material-fill-authority={materialSurface.fillAuthority}
        data-material-stop-count={String(materialSurface.gradientStopCount)}
        data-material-highlight={materialSurface.highlight ? "true" : "false"}
        data-surface-texture={materialSurface.textureToken || undefined}
        data-vp-rail-aware={rails.railAware ? "true" : "false"}
        data-vp-rail-left={String(rails.railLeftPct)}
        data-vp-rail-right={String(rails.railRightPct)}
      >
        <MaterialSurfaceLayers surface={materialSurface} testIdPrefix={`button-${node.id}`} />
        {(iconPosition === "before" || iconPosition === "above") ? buttonIconEl : null}
        {buttonLabelEl ? (
          <span className="min-w-0 flex-1 text-left" data-vp-text-zone="true">
            {buttonLabelEl}
          </span>
        ) : null}
        {(iconPosition === "after" || iconPosition === "below") ? buttonIconEl : null}
        {mirrorIconEl}
      </span>
    );
    const surface = (
      <span
        className="relative inline-flex shrink-0 overflow-visible"
        style={{
          width: circle ? Math.max(44, num(node.props.touchTargetPx, 52)) : "100%",
          height: circle ? Math.max(44, num(node.props.touchTargetPx, 52)) : "100%",
          minHeight: 44,
        }}
      >
        <MountShell props={node.props}>
          <VisualPartsShell props={node.props} radius={radius} testIdPrefix={`button-${node.id}`}>
            {surfaceInner}
          </VisualPartsShell>
        </MountShell>
      </span>
    );
    return (
      <a
        href={editMode ? undefined : actionHref}
        aria-disabled={!actionHref}
        onClick={(event) => { if (editMode || !actionHref) event.preventDefault(); }}
        className="flex h-full w-full flex-col items-center justify-center text-center"
        style={{
          color: str(node.props.textColor, "#0b0f19"),
          fontFamily: str(node.props.fontFamily, "Inter, system-ui, sans-serif"),
          fontSize: num(node.props.fontSize, 14),
          fontWeight: num(node.props.fontWeight, 600),
          letterSpacing: `${num(node.props.letterSpacingEm, 0)}em`,
          textTransform: str(node.props.textTransform, "none") as CSSProperties["textTransform"],
          padding: labelBelow ? 2 : 0,
          opacity: num(node.props.opacity, 1),
          gap: num(node.props.spacing, 6),
        }}
        tabIndex={editMode ? undefined : 0}
        aria-label={str(node.props.accessibleLabel, labelValue)}
        data-button-presentation={presentation}
        data-button-content-count={buttonContent(node.props, node.id).nodes.length}
        data-vp-family={vpState.curatedFamilyId || undefined}
        data-vp-finish={vpState.finishPartId || undefined}
        data-vp-rim={vpState.rimPartId || undefined}
        data-vp-layout={vpState.layoutIntent || undefined}
        data-vp-icon-position={vpState.iconStationPosition || undefined}
        data-vp-icon-scale={vpState.iconStationScale != null ? String(vpState.iconStationScale) : undefined}
        data-vp-icon-anchor={vpState.iconStationAnchor || undefined}
        data-vp-mount={vpState.mountPartId || undefined}
        data-vp-action-role={vpState.actionRole || undefined}
        data-vp-phone-stack={
          vpState.layoutIntent === "two_column" || vpState.layoutIntent === "round_team_grid" ? "auto" : "off"
        }
        data-action-role={vpState.actionRole || (node.props.actionRole as string) || undefined}
        {...visualPartsDataAttrs(node.props)}
      >
        {surface}
        {labelBelow && showLabel ? <strong className="block" style={labelStyle}>{labelValue}</strong> : null}
        {showDescription && str(node.props.description) ? <span className="block leading-snug" style={{ color: str(node.props.descriptionColor, "#cbd5e1"), fontSize: num(node.props.descriptionSize, 11) }}>{str(node.props.description)}</span> : null}
      </a>
    );
  }

  return null;
}

export function CreativeCompositionCanvas({
  block,
  editMode = false,
  selectedNodeIds = [],
  onSelectNodes,
  onChangeBlock,
  forceMobileFallback = false,
  previewMotion = false,
  reducedMotionSimulation = false,
  editorZoom = 1,
  className,
  aspectRatio = 4 / 5,
  layoutMode = "free",
  gapPx = 12,
  align = "stretch",
  distribute = "start",
  minHeightPx,
  onEditNodeText,
  mediaUploadReady = false,
  onNotify,
  containerActions,
}: CreativeCompositionCanvasProps) {
  const chromeScale = 1 / Math.max(0.25, Math.min(4, editorZoom || 1));
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [surfaceSize, setSurfaceSize] = useState({ width: 180, height: 220 });
  const [draftNodes, setDraftNodes] = useState<CreativeCompositionNode[] | null>(
    null
  );
  const [guides, setGuides] = useState<CompositionGuide[]>([]);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    window.addEventListener("studio:dismiss-composition-menu", dismiss as EventListener);
    return () => window.removeEventListener("studio:dismiss-composition-menu", dismiss as EventListener);
  }, []);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize" | "rotate";
    handle?: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    startX: number;
    startY: number;
    orig: CreativeCompositionNode;
    /** Snapshot of all nodes at drag start (for group/multi move). */
    origNodes: CreativeCompositionNode[];
    moveIds: string[];
    groupId?: string | null;
    groupBounds?: { left: number; top: number; width: number; height: number; rotationDeg: number } | null;
  } | null>(null);
  const groupParentSelection = isGroupParentSelection(block.nodes, selectedNodeIds);
  const activeGroupId =
    resolveActiveGroupId(block.nodes, selectedNodeIds) ||
    (() => {
      const first = block.nodes.find((node) => selectedNodeIds.includes(node.id));
      return first?.groupId && isGroupContentScope(block.nodes, first.groupId) ? first.groupId : null;
    })();
  const groupContentScopeActive = Boolean(activeGroupId && isGroupContentScope(block.nodes, activeGroupId));
  const groupBounds = activeGroupId ? computeGroupUnionBounds(block.nodes, activeGroupId, true) : null;

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setNarrow(w > 0 && w < 420);
      setSurfaceSize({ width: w || 180, height: entries[0]?.contentRect.height || 220 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const applyFallback = compositionAppliesMobileFallback({
    editMode,
    forceMobileFallback: forceMobileFallback || narrow,
  });
  const useStack = applyFallback && block.mobileFallback === "stack";
  const hideDecorative =
    applyFallback && block.mobileFallback === "hide_decorative";
  /** scale (default) keeps freeform relative layout — same renderer as edit */

  const workingNodes = draftNodes ?? block.nodes;

  const visibleNodes = useMemo(() => {
    let nodes = sortCompositionNodes(workingNodes).filter((n) => n.visible !== false);
    if (!editMode) {
      nodes = nodes.filter((node) => {
        if (node.props.componentKind === "gallery") return Array.isArray(node.props.media) && node.props.media.some(Boolean);
        if (node.primitive === "image") return Boolean(node.props.src);
        if (node.primitive === "frame" && !node.props.componentKind) return Boolean(node.props.mediaSrc || node.props.src);
        return true;
      });
    }
    if (hideDecorative) {
      nodes = nodes.filter((n) => n.primitive === "text" || n.primitive === "button");
    }
    return nodes;
  }, [workingNodes, hideDecorative, editMode]);

  const readingOrder = useMemo(
    () => accessibleReadingOrder(visibleNodes),
    [visibleNodes]
  );
  const commitNodes = useCallback(
    (nodes: CreativeCompositionNode[], label: string) => {
      onChangeBlock?.({ ...block, nodes }, label);
    },
    [block, onChangeBlock]
  );

  const importImageFiles = useCallback(
    async (files: File[], point?: { x: number; y: number }, replaceNodeId?: string) => {
      const images = files.filter(
        (file) =>
          IMAGE_FILE_TYPES.has(file.type) ||
          /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
      );
      if (!images.length) return;
      if (!mediaUploadReady) {
        onNotify?.("Media upload is not ready — connect Studio Media storage first");
        return;
      }
      // V1 multi-file policy: place each image individually (offset grid), never silently keep only the first.
      onNotify?.(
        images.length > 1
          ? `Placing ${images.length} images individually…`
          : "Importing image…"
      );
      const uploaded: Array<{ url: string; mediaAssetId: string }> = [];
      for (const file of images) {
        const asset = await uploadCanvasImageFile(file);
        if (asset) uploaded.push(asset);
      }
      if (!uploaded.length) {
        onNotify?.("Could not import image — check upload permissions");
        return;
      }
      if (replaceNodeId && uploaded[0]) {
        const asset = uploaded[0];
        commitNodes(
          block.nodes.map((node) =>
            node.id === replaceNodeId
              ? {
                  ...node,
                  props: {
                    ...node.props,
                    src: asset.url,
                    mediaSrc: asset.url,
                    mediaAssetId: asset.mediaAssetId,
                    alt: str(node.props.alt, images[0]?.name || "Image"),
                  },
                }
              : node
          ),
          "Replaced media from drop"
        );
        onSelectNodes?.([replaceNodeId]);
        onNotify?.(null);
        return;
      }
      const maxZ = block.nodes.reduce((value, node) => Math.max(value, node.zIndex), 0);
      const baseX = point ? Math.min(0.72, Math.max(0.04, point.x - 0.14)) : 0.12;
      const baseY = point ? Math.min(0.72, Math.max(0.04, point.y - 0.12)) : 0.14;
      const created = uploaded.map((asset, index) =>
        createCompositionNode("image", {
          x: Math.min(0.78, baseX + (index % 3) * 0.06),
          y: Math.min(0.78, baseY + Math.floor(index / 3) * 0.08),
          width: 0.28,
          height: 0.22,
          zIndex: maxZ + index + 1,
          props: {
            src: asset.url,
            mediaAssetId: asset.mediaAssetId,
            alt: images[index]?.name || "Image",
            fit: "cover",
            opacity: 1,
            elementKind: "image",
          },
        })
      );
      commitNodes([...block.nodes, ...created], uploaded.length > 1 ? "Placed dropped images" : "Placed dropped image");
      onSelectNodes?.(created.map((node) => node.id));
      onNotify?.(null);
    },
    [block.nodes, commitNodes, mediaUploadReady, onNotify, onSelectNodes]
  );

  useEffect(() => {
    if (!editMode) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable=true]")) {
        return;
      }
      if (e.key === "Escape") {
        // Composition More menu owns Escape before selection-clear / Exit layering.
        if (contextMenu) {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu(null);
          return;
        }
      }
      if (e.key === "Escape" && selectedNodeIds.length) {
        e.preventDefault();
        e.stopPropagation();
        // Content mode exit: Escape returns to the parent Container/Button
        // instead of clearing selection entirely.
        const selectedNode = block.nodes.find((node) => node.id === selectedNodeIds[0]);
        const contentParent =
          selectedNode && selectedNode.props.contentEditing === true
            ? selectedNode
            : selectedNode
              ? resolveContainerParent(block.nodes, selectedNode.id)
              : null;
        if (
          contentParent &&
          contentParent.props.contentEditing === true &&
          selectedNode &&
          selectedNode.id !== contentParent.id
        ) {
          commitNodes(
            block.nodes.map((node) =>
              node.id === contentParent.id
                ? {
                    ...node,
                    props: {
                      ...node.props,
                      contentEditing: false,
                      selectionMode: "parent",
                      activeButtonContentNodeId: undefined,
                      activeComponentContentNodeId: undefined,
                    },
                  }
                : node
            ),
            "Finished editing contents"
          );
          onSelectNodes?.([contentParent.id]);
          return;
        }
        if (selectedNode?.props.groupContentEditing === true && selectedNode.groupId) {
          const gid = selectedNode.groupId;
          commitNodes(exitGroupContentEditing(block.nodes, gid), "Finished editing Group contents");
          onSelectNodes?.(expandSelectionToGroups(block.nodes, [selectedNode.id]));
          return;
        }
        if (selectedNode?.props.contentEditing === true) {
          commitNodes(
            block.nodes.map((node) =>
              node.id === selectedNode.id
                ? {
                    ...node,
                    props: {
                      ...node.props,
                      contentEditing: false,
                      selectionMode: "parent",
                      activeButtonContentNodeId: undefined,
                      activeComponentContentNodeId: undefined,
                    },
                  }
                : node
            ),
            "Finished editing contents"
          );
          onSelectNodes?.([selectedNode.id]);
          return;
        }
        onSelectNodes?.([]);
        return;
      }
      if (e.key === "Enter" && selectedNodeIds.length === 1) {
        const selectedNode = block.nodes.find((node) => node.id === selectedNodeIds[0]);
        if ((selectedNode?.primitive === "text" && str(selectedNode.props.textCurve, "none") === "none") || (selectedNode?.primitive === "button" && selectedNode.props.contentEditing === true)) {
          e.preventDefault();
          setEditingNodeId(selectedNode.id);
          return;
        }
      }
      if (!selectedNodeIds.length) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyCompositionNodes(block.nodes, selectedNodeIds);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        commitNodes(
          deleteNodes(block.nodes, selectedNodeIds),
          "Deleted composition items"
        );
        onSelectNodes?.([]);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const { nodes, newIds } = duplicateNodes(block.nodes, selectedNodeIds);
        commitNodes(nodes, "Duplicated composition items");
        if (newIds.length) onSelectNodes?.(newIds);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g" && !e.shiftKey) {
        if (selectedNodeIds.length < 2) return;
        e.preventDefault();
        const next = groupNodes(block.nodes, selectedNodeIds);
        commitNodes(next, "Grouped Elements");
        onSelectNodes?.(expandSelectionToGroups(next, selectedNodeIds));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        const gid = resolveActiveGroupId(block.nodes, selectedNodeIds);
        if (!gid) return;
        e.preventDefault();
        const next = ungroupNodes(block.nodes, gid);
        commitNodes(next, "Ungrouped Elements");
        onSelectNodes?.(selectedNodeIds);
        return;
      }
      // Arrow nudge — responsive relative units
      const rect = surfaceRef.current?.getBoundingClientRect();
      const stepPx = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -stepPx / Math.max(rect?.width || 1, 1);
      if (e.key === "ArrowRight") dx = stepPx / Math.max(rect?.width || 1, 1);
      if (e.key === "ArrowUp") dy = -stepPx / Math.max(rect?.height || 1, 1);
      if (e.key === "ArrowDown") dy = stepPx / Math.max(rect?.height || 1, 1);
      if (dx || dy) {
        e.preventDefault();
        if (e.altKey && selectedNodeIds.length === 1) {
          const selectedId = selectedNodeIds[0];
          commitNodes(
            block.nodes.map((node) => node.id === selectedId
              ? {
                  ...node,
                  width: Math.max(.02, Math.min(1 - node.x, node.width + dx)),
                  height: Math.max(.02, Math.min(1 - node.y, node.height + dy)),
                }
              : node),
            "Resized composition item with keyboard"
          );
          return;
        }
        const ids = expandSelectionToGroups(block.nodes, selectedNodeIds);
        commitNodes(
          translateNodesOnPasteboard(block.nodes, ids, dx, dy),
          "Nudged composition items"
        );
      }
    }
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable=true]")) return;
      const imageFiles = Array.from(e.clipboardData?.files || []).filter((file) =>
        IMAGE_FILE_TYPES.has(file.type)
      );
      if (imageFiles.length) {
        e.preventDefault();
        void importImageFiles(imageFiles);
        return;
      }
      if (hasCompositionClipboard()) {
        e.preventDefault();
        const result = pasteCompositionNodes(block.nodes);
        commitNodes(result.nodes, "Pasted composition items");
        onSelectNodes?.(result.newIds);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [editMode, selectedNodeIds, block.nodes, commitNodes, onSelectNodes, contextMenu, importImageFiles]);

  const onPointerDownNode = (
    e: React.PointerEvent,
    node: CreativeCompositionNode,
    mode: "move" | "resize" | "rotate",
    handle?: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
  ) => {
    if (!editMode || node.locked) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    // Parent vs content law: children of a Container are only directly
    // selectable while the parent is in content mode.
    let target = node;
    const containerParent = resolveContainerParent(block.nodes, node.id);
    if (containerParent && containerParent.id !== node.id) {
      const parentMode = selectionModeForNode(containerParent);
      if (parentMode !== "content") {
        target = containerParent;
      }
    }

    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    // Group content scope: Owner chooses a single child — do not re-expand to the full Group.
    const targetGroupId = target.groupId && isTrueGroupMember(target) ? target.groupId : null;
    const inGroupContentScope = Boolean(targetGroupId && isGroupContentScope(block.nodes, targetGroupId));
    let nextIds: string[];
    if (inGroupContentScope && !multi) {
      commitNodes(
        activateGroupContentChild(block.nodes, targetGroupId!, target.id),
        "Selected Group child"
      );
      nextIds = [target.id];
    } else if (multi) {
      nextIds = selectedSet.has(target.id)
        ? selectedNodeIds.filter((id) => id !== target.id)
        : [...selectedNodeIds, target.id];
    } else if (!selectedSet.has(target.id) || selectedNodeIds.length > 1) {
      nextIds = expandSelectionToGroups(block.nodes, [target.id]);
    } else {
      nextIds = expandSelectionToGroups(block.nodes, selectedNodeIds);
    }
    // Never paint child selection chrome when a Container parent is selected.
    if (nextIds.length === 1) {
      const only = block.nodes.find((candidate) => candidate.id === nextIds[0]);
      if (only && isContainerNode(only) && selectionModeForNode(only) !== "content") {
        nextIds = [only.id];
      }
    }
    onSelectNodes?.(nextIds);

    const groupIdForTransform = resolveActiveGroupId(block.nodes, nextIds);
    const groupParent = Boolean(groupIdForTransform) && !isGroupContentEditing(block.nodes, nextIds);
    const moveIds =
      mode === "move"
        ? isContainerNode(target)
          ? [target.id, ...containerChildIds(block.nodes, target.id)]
          : expandSelectionToGroups(block.nodes, nextIds)
        : groupParent && groupIdForTransform
          ? expandSelectionToGroups(block.nodes, nextIds)
          : [target.id];
    const bounds = groupParent && groupIdForTransform
      ? computeGroupUnionBounds(block.nodes, groupIdForTransform, true)
      : null;
    setDrag({
      id: target.id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...target },
      origNodes: block.nodes.map((n) => ({ ...n, props: { ...n.props } })),
      moveIds,
      groupId: groupParent ? groupIdForTransform : null,
      groupBounds: bounds
        ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, rotationDeg: bounds.rotationDeg }
        : null,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (marquee && surfaceRef.current && editMode) {
      setMarquee((current) => current ? { ...current, currentX: e.clientX, currentY: e.clientY } : null);
      return;
    }
    if (!drag || !surfaceRef.current || !editMode) return;
    autoScrollForPointer(surfaceRef.current, e.clientX, e.clientY);
    const rect = surfaceRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    if (drag.mode === "move") {
      const primary = drag.origNodes.find((node) => node.id === drag.id);
      const translated =
        primary && isContainerNode(primary)
          ? moveContainerWithChildren(drag.origNodes, drag.id, dx, dy)
          : translateNodesOnPasteboard(drag.origNodes, drag.moveIds, dx, dy);
      const snapped = snapCompositionNodes({
        nodes: translated,
        movingIds: drag.moveIds,
      });
      setDraftNodes(snapped.nodes);
      setGuides(snapped.guides);
      return;
    }
    if (drag.mode === "rotate") {
      const bounds = drag.groupBounds;
      const centerX = rect.left + ((bounds ? bounds.left + bounds.width / 2 : drag.orig.x + drag.orig.width / 2)) * rect.width;
      const centerY = rect.top + ((bounds ? bounds.top + bounds.height / 2 : drag.orig.y + drag.orig.height / 2)) * rect.height;
      const angle =
        (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI +
        90;
      const resolvedAngle = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
      if (drag.groupId) {
        setDraftNodes(rotateGroupComposition(drag.origNodes, drag.groupId, resolvedAngle));
        return;
      }
      setDraftNodes(
        drag.origNodes.map((node) =>
          node.id === drag.id ? { ...node, rotationDeg: resolvedAngle } : node
        )
      );
      return;
    }
    const handle = drag.handle || "se";
    const west = handle.includes("w");
    const east = handle.includes("e");
    const north = handle.includes("n");
    const south = handle.includes("s");
    const n = drag.orig;
    let x = west ? Math.min(n.x + n.width - 0.02, Math.max(-1, n.x + dx)) : n.x;
    let y = north ? Math.min(n.y + n.height - 0.02, Math.max(-1, n.y + dy)) : n.y;
    let width = west
      ? n.width + (n.x - x)
      : east
        ? Math.min(2, Math.max(0.02, n.width + dx))
        : n.width;
    let height = north
      ? n.height + (n.y - y)
      : south
        ? Math.min(2, Math.max(0.02, n.height + dy))
        : n.height;
    if (e.altKey) {
      if (east) { x = n.x - dx; width = n.width + dx * 2; }
      if (west) { x = n.x + dx; width = n.width - dx * 2; }
      if (south) { y = n.y - dy; height = n.height + dy * 2; }
      if (north) { y = n.y + dy; height = n.height - dy * 2; }
    }
    const cornerResize = (east || west) && (north || south);
    const preservesAspect =
      n.primitive === "image"
        ? n.props.aspectLocked !== false
        : n.primitive === "text"
          ? n.props.transformMode !== "stretch_glyphs"
          : n.props.aspectLocked === true;
    if ((e.shiftKey || preservesAspect) && cornerResize && !isContainerNode(n)) {
      const aspect = drag.orig.width / drag.orig.height;
      if (Math.abs(dx) >= Math.abs(dy)) height = width / aspect;
      else width = height * aspect;
      if (west) x = drag.orig.x + drag.orig.width - width;
      if (north) y = drag.orig.y + drag.orig.height - height;
    }
    const frame = {
      x: Math.max(-1, Math.min(2, x)),
      y: Math.max(-1, Math.min(2, y)),
      width: Math.min(2, Math.max(0.02, width)),
      height: Math.min(2, Math.max(0.02, height)),
    };
    if (drag.groupId && drag.groupBounds) {
      const gb = drag.groupBounds;
      const gx = west ? Math.min(gb.left + gb.width - 0.04, Math.max(-1, gb.left + dx)) : gb.left;
      const gy = north ? Math.min(gb.top + gb.height - 0.04, Math.max(-1, gb.top + dy)) : gb.top;
      const gw = west ? gb.width + (gb.left - gx) : east ? Math.min(2, Math.max(0.04, gb.width + dx)) : gb.width;
      const gh = north ? gb.height + (gb.top - gy) : south ? Math.min(2, Math.max(0.04, gb.height + dy)) : gb.height;
      setDraftNodes(
        resizeGroupComposition(drag.origNodes, drag.groupId, {
          left: gx,
          top: gy,
          width: Math.max(0.04, gw),
          height: Math.max(0.04, gh),
        })
      );
      return;
    }
    if (isContainerNode(n)) {
      setDraftNodes(
        applyContainerResize(
          drag.origNodes,
          n.id,
          frame,
          normalizeResizePolicy(n.props.resizePolicy)
        )
      );
      return;
    }
    const isTextCorner = n.primitive === "text" && (east || west) && (north || south);
    const scale = isTextCorner
      ? Math.max(
          0.2,
          Math.min(
            8,
            Math.sqrt(
              (frame.width / Math.max(drag.orig.width, 0.02)) *
                (frame.height / Math.max(drag.orig.height, 0.02))
            )
          )
        )
      : 1;
    setDraftNodes(
      drag.origNodes.map((candidate) =>
        candidate.id !== drag.id
          ? candidate
          : {
              ...candidate,
              ...frame,
              props: isTextCorner
                ? {
                    ...candidate.props,
                    fontSize: Math.max(
                      6,
                      Math.min(320, num(drag.orig.props.fontSize, 18) * scale)
                    ),
                    lineHeight: Math.max(
                      0.7,
                      Math.min(3, num(drag.orig.props.lineHeight, 1.2) * scale)
                    ),
                    curveRadius: Math.max(
                      8,
                      Math.min(80, num(drag.orig.props.curveRadius, 38) * scale)
                    ),
                  }
                : candidate.props,
            }
      )
    );
  };

  const onPointerUp = () => {
    if (marquee && surfaceRef.current) {
      const rect = surfaceRef.current.getBoundingClientRect();
      const moved = Math.hypot(marquee.currentX - marquee.startX, marquee.currentY - marquee.startY);
      if (moved >= 4) {
        const left = (Math.min(marquee.startX, marquee.currentX) - rect.left) / Math.max(rect.width, 1);
        const right = (Math.max(marquee.startX, marquee.currentX) - rect.left) / Math.max(rect.width, 1);
        const top = (Math.min(marquee.startY, marquee.currentY) - rect.top) / Math.max(rect.height, 1);
        const bottom = (Math.max(marquee.startY, marquee.currentY) - rect.top) / Math.max(rect.height, 1);
        const hit = visibleNodes.filter((node) => {
          const box = resolveNodeBox(node, editMode);
          return box.left < right && box.left + box.width > left && box.top < bottom && box.top + box.height > top;
        }).map((node) => node.id);
        onSelectNodes?.(expandSelectionToGroups(block.nodes, hit));
      }
      setMarquee(null);
      return;
    }
    if (!drag) return;
    const nodes = draftNodes ?? block.nodes;
    const mode = drag.mode;
    const groupMove = mode === "move" && drag.moveIds.length > 1;
    setDrag(null);
    setDraftNodes(null);
    setGuides([]);
    commitNodes(
      nodes,
      mode === "resize"
        ? "Resized composition item"
        : mode === "rotate"
          ? "Rotated composition item"
        : groupMove
          ? "Moved composition group"
          : "Moved composition item"
    );
  };

  const pageMaterialProps = materialPropsFromCompositionBackground(block.background);
  const pageMaterial = pageMaterialProps
    ? resolveMaterialSurfaceFromProps(pageMaterialProps, "generic")
    : null;
  const bg =
    pageMaterial
      ? pageMaterial.background
      : block.background?.kind === "solid"
      ? block.background.value || "#0b0f19"
      : block.background?.kind === "gradient"
        ? // Prefer durable full CSS value (may include rgba) over hex-only gradient model.
          block.background.value ||
          (block.background.gradient
            ? gradientToCss(block.background.gradient)
            : gradientToCss(DEFAULT_GRADIENT))
        : "transparent";
  const backgroundImage = block.background?.image;
  // Material page backgrounds resolve fill + texture/highlight via shared authority.
  // Non-Material Visual Plane paths keep pattern/image/solid/gradient as before.
  const backgroundStyle = pageMaterial
    ? {
        background: pageMaterial.background,
        backgroundSize: pageMaterial.backgroundSize,
      }
    : block.background?.kind === "image" && backgroundImage?.src
      ? {
          backgroundColor: "#0b0f19",
          backgroundImage: `${
            backgroundImage.overlayColor && (backgroundImage.overlayOpacity || 0) > 0
              ? `linear-gradient(${backgroundImage.overlayColor}${Math.round(
                  (backgroundImage.overlayOpacity || 0) * 255
                )
                  .toString(16)
                  .padStart(2, "0")}, ${backgroundImage.overlayColor}${Math.round(
                  (backgroundImage.overlayOpacity || 0) * 255
                )
                  .toString(16)
                  .padStart(2, "0")}), `
              : ""
          }url("${backgroundImage.src.replaceAll('"', "%22")}")`,
          backgroundSize:
            backgroundImage.fit === "fill"
              ? "100% 100%"
              : backgroundImage.fit === "original"
                ? `${Math.round(backgroundImage.scale * 100)}% auto`
                : backgroundImage.fit,
          backgroundPosition: `${backgroundImage.focalX * 100}% ${
            backgroundImage.focalY * 100
          }%`,
          backgroundRepeat: backgroundImage.repeat,
          backgroundBlendMode: backgroundImage.blendMode || "normal",
        }
      : (block.background?.kind === "pattern" ||
            block.background?.kind === "texture") &&
          block.background.pattern
        ? surfacePatternStyle(block.background.pattern)
        : { background: bg };
  const backgroundTreatmentStyle =
    block.background?.kind === "image" && backgroundImage
      ? {
          filter: `blur(${backgroundImage.blur || 0}px) brightness(${
            backgroundImage.brightness || 1
          }) contrast(${backgroundImage.contrast || 1})`,
          transform:
            (backgroundImage.blur || 0) > 0
              ? `scale(${1 + Math.min(backgroundImage.blur || 0, 20) / 100})`
              : undefined,
        }
      : undefined;

  const compositionBackgroundNode = (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        ...backgroundStyle,
        ...backgroundTreatmentStyle,
        opacity: block.background?.opacity ?? 1,
        filter: [
          backgroundTreatmentStyle?.filter,
          `saturate(${block.background?.saturation ?? 1}) brightness(${block.background?.brightness ?? 1}) contrast(${block.background?.contrast ?? 1})`,
        ]
          .filter(Boolean)
          .join(" "),
      }}
      data-testid="composition-background-renderer"
      data-background-opacity={String(block.background?.opacity ?? 1)}
      data-material-preset={block.background?.materialPreset || undefined}
      data-material-fill-authority={pageMaterial?.fillAuthority}
      data-material-stop-count={pageMaterial ? String(pageMaterial.gradientStopCount) : undefined}
      data-material-highlight={pageMaterial?.highlight ? "true" : "false"}
      data-surface-texture={pageMaterial?.textureToken || undefined}
      aria-hidden
    >
      {pageMaterial ? (
        <MaterialSurfaceLayers surface={pageMaterial} testIdPrefix="page-background" />
      ) : null}
    </div>
  );

  const structured = useStack || layoutMode !== "free";
  if (structured) {
    const structuredMode = useStack ? "stack" : layoutMode;
    return (
      <div
        ref={surfaceRef}
        className={cn(
          "relative overflow-hidden rounded-xl",
          structuredMode === "grid" ? "grid grid-cols-2" : "flex",
          structuredMode === "row" ? "flex-row flex-wrap" : structuredMode !== "grid" ? "flex-col" : "",
          className
        )}
        style={{
          gap: gapPx,
          minHeight: minHeightPx,
          alignItems: align === "start" ? "flex-start" : align === "end" ? "flex-end" : align,
          justifyContent: distribute === "between" ? "space-between" : distribute === "around" ? "space-around" : distribute === "start" ? "flex-start" : distribute === "end" ? "flex-end" : distribute,
        }}
        data-testid="creative-composition-canvas"
        data-reduced-motion-simulation={reducedMotionSimulation ? "true" : "false"}
        data-edit-mode={editMode ? "true" : "false"}
        data-mobile-fallback="stack"
        role="group"
        aria-label={block.label}
        onPointerDown={(event) => {
          if (!editMode || event.button !== 0) return;
          const target = event.target as HTMLElement | null;
          if (!target || !event.currentTarget.contains(target)) return;
          if (target.closest("[data-composition-node]")) return;
          onSelectNodes?.([]);
        }}
      >
        {compositionBackgroundNode}
        <ol className="sr-only" data-testid="composition-reading-order">
          {readingOrder.map((n) => (
            <li key={n.id}>
              {n.primitive}:{" "}
              {str(n.props.text) ||
                str(n.props.alt) ||
                str(n.props.label) ||
                n.id}
            </li>
          ))}
        </ol>
        {readingOrder.map((node) => (
          <div
            key={node.id}
            draggable={editMode && !node.locked}
            className={cn(
              "relative z-[1] min-h-[56px]",
              structuredMode === "row" ? "min-w-[120px] flex-1" : "w-full",
              editMode && "rounded-md outline outline-1 outline-transparent focus-within:outline-white/50"
            )}
            data-composition-node={node.id}
            data-primitive={node.primitive}
            data-element-kind={String(node.props.elementKind || node.primitive)}
            data-selected={selectedSet.has(node.id) ? "true" : "false"}
            data-effect={String(node.props.effectPreset || "") || undefined}
            data-material={String(node.props.materialPreset || "") || undefined}
            {...visualPartsDataAttrs(node.props)}
            onClick={(e) => {
              if (!editMode) return;
              e.stopPropagation();
              onSelectNodes?.([node.id]);
            }}
            onDoubleClick={(event) => {
              if (!editMode || !((node.primitive === "text" && str(node.props.textCurve, "none") === "none") || (node.primitive === "button" && node.props.contentEditing === true))) return;
              event.preventDefault();
              event.stopPropagation();
              onSelectNodes?.([node.id]);
              setEditingNodeId(node.id);
            }}
            onPointerDown={(event) => {
              if (!editMode) return;
              event.stopPropagation();
              onSelectNodes?.([node.id]);
            }}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("application/x-composition-node", node.id);
            }}
            onDragOver={(event) => {
              if (!editMode) return;
              if (event.dataTransfer.types.includes("Files") || event.dataTransfer.getData("application/x-composition-node")) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              if (!editMode) return;
              const files = Array.from(event.dataTransfer.files || []);
              const replaceable =
                node.primitive === "image" ||
                str(node.props.elementKind) === "logo" ||
                str(node.props.elementKind) === "image" ||
                Boolean(node.props.src || node.props.mediaSrc);
              if (files.length && replaceable) {
                event.preventDefault();
                event.stopPropagation();
                void importImageFiles(files, undefined, node.id);
                return;
              }
              const fromId = event.dataTransfer.getData("application/x-composition-node");
              if (!fromId || fromId === node.id) return;
              event.preventDefault();
              event.stopPropagation();
              const current = [...block.nodes];
              const from = current.findIndex((candidate) => candidate.id === fromId);
              const to = current.findIndex((candidate) => candidate.id === node.id);
              if (from < 0 || to < 0) return;
              const [moved] = current.splice(from, 1);
              current.splice(to, 0, moved!);
              commitNodes(current.map((candidate, index) => ({ ...candidate, zIndex: index + 1 })), "Reordered Elements");
            }}
          >
            <ActionVisual node={node} editMode={editMode}>
              <MotionVisual node={node} active={(!editMode || previewMotion) && !reducedMotionSimulation}>
                <NodeVisual
                  node={node}
                  editMode={editMode}
                  textEditing={editingNodeId === node.id}
                  onEditText={(value) => onEditNodeText?.(node.id, value)}
                  onFinishTextEdit={() => setEditingNodeId(null)}
                />
              </MotionVisual>
            </ActionVisual>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative w-full rounded-xl border border-white/10",
        editMode ? "overflow-visible" : "overflow-hidden",
        editMode && "touch-none",
        className
      )}
      style={{
        aspectRatio: minHeightPx == null ? String(aspectRatio) : undefined,
        height: minHeightPx,
        padding: block.safeAreaPaddingPx ?? 12,
      }}
      data-testid="creative-composition-canvas"
      data-reduced-motion-simulation={reducedMotionSimulation ? "true" : "false"}
      data-edit-mode={editMode ? "true" : "false"}
      data-mobile-fallback={
        applyFallback ? block.mobileFallback : "freeform"
      }
      data-surface-narrow={narrow ? "true" : "false"}
      data-media-drop={mediaUploadReady ? "ready" : "unavailable"}
      role="group"
      aria-label={block.label}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(event) => {
        if (!editMode || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        if (!editMode) return;
        if (event.defaultPrevented) return;
        const files = Array.from(event.dataTransfer.files || []);
        if (!files.length) return;
        // Replace-on-node owns file drops on Image/Logo; do not also place a new object.
        const hit = event.target as HTMLElement | null;
        const overNode = hit?.closest?.("[data-composition-node]") as HTMLElement | null;
        if (overNode) {
          const primitive = overNode.getAttribute("data-primitive") || "";
          const elementKind = overNode.getAttribute("data-element-kind") || "";
          const replaceable =
            primitive === "image" ||
            primitive === "frame" ||
            elementKind === "logo" ||
            elementKind === "image" ||
            Boolean(overNode.getAttribute("data-media-asset-id"));
          if (replaceable) {
            const replaceId = overNode.getAttribute("data-composition-node");
            if (replaceId) {
              event.preventDefault();
              event.stopPropagation();
              void importImageFiles(files, undefined, replaceId);
              return;
            }
          }
        }
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const point = {
          x: (event.clientX - rect.left) / Math.max(1, rect.width),
          y: (event.clientY - rect.top) / Math.max(1, rect.height),
        };
        void importImageFiles(files, point);
      }}
      onPointerDown={(event) => {
        setContextMenu(null);
        if (!editMode || event.button !== 0) return;
        const target = event.target as HTMLElement | null;
        if (!target || !event.currentTarget.contains(target)) return;
        // Empty Card plane selects Card Root. Do not require target===currentTarget —
        // safe-area guides / reading-order / background layers must not steal the Owner click.
        if (
          target.closest(
            "[data-composition-node], [data-testid^='composition-resize-'], [data-testid^='composition-rotate-'], [data-testid^='composition-more-'], [data-testid^='composition-group-'], [data-testid='composition-context-menu']"
          )
        ) {
          return;
        }
        onSelectNodes?.([]);
        setMarquee({ startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY });
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
    >
      {compositionBackgroundNode}
      {editMode && (block.safeAreaPaddingPx || 0) > 0 ? (
        <div
          className="pointer-events-none absolute z-[998] border border-dashed border-[#9cff57]/45"
          style={{ inset: block.safeAreaPaddingPx }}
          data-testid="composition-safe-area-guide"
          aria-hidden
        />
      ) : null}
      {/* Accessible reading order (visually hidden list for SR) */}
      <ol className="sr-only" data-testid="composition-reading-order">
        {readingOrder.map((n) => (
          <li key={n.id}>
            {n.primitive}: {str(n.props.text) || str(n.props.alt) || str(n.props.label) || n.id}
          </li>
        ))}
      </ol>

      {editMode
        ? guides.map((guide, index) => (
            <div
              key={`${guide.axis}-${guide.value}-${index}`}
              className="pointer-events-none absolute z-[999] bg-[#b8ff2c] shadow-[0_0_6px_rgba(184,255,44,.65)]"
              style={
                guide.axis === "x"
                  ? {
                      left: `${guide.value * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                    }
                  : {
                      top: `${guide.value * 100}%`,
                      left: 0,
                      right: 0,
                      height: 1,
                    }
              }
              data-testid={`composition-guide-${guide.axis}`}
              data-guide-kind={guide.kind}
              aria-hidden
            />
          ))
        : null}
      {editMode && marquee ? (
        <div
          className="pointer-events-none fixed z-[1001] border border-[#b8ff2c] bg-[#b8ff2c]/10"
          style={{
            left: Math.min(marquee.startX, marquee.currentX),
            top: Math.min(marquee.startY, marquee.currentY),
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
          }}
          data-testid="composition-marquee"
          aria-hidden
        />
      ) : null}

      {visibleNodes.map((node) => {
        const selected = selectedSet.has(node.id);
        const box = resolveNodeBox(node, editMode);
        const contentParentActive =
          isContainerNode(node) &&
          selectionModeForNode(node) === "content" &&
          !selected &&
          selectedNodeIds.some((id) => {
            const child = block.nodes.find((candidate) => candidate.id === id);
            return child && String(child.props.containerId || "") === node.id;
          });
        return (
          <div
            key={node.id}
            className={cn(
              "absolute",
              editMode && !node.locked && "cursor-move",
              contentParentActive && "outline outline-1 outline-dashed outline-[#b8ff2c]/45"
            )}
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
              zIndex: node.zIndex,
              minWidth: node.minWidthPx,
              maxWidth: node.maxWidthPx,
              transform: node.rotationDeg
                ? `rotate(${node.rotationDeg}deg)`
                : undefined,
              opacity: node.visible === false ? 0 : 1,
            }}
            data-composition-node={node.id}
            data-primitive={node.primitive}
            data-element-kind={String(node.props.elementKind || node.primitive)}
            data-media-asset-id={
              typeof node.props.mediaAssetId === "string" && node.props.mediaAssetId
                ? node.props.mediaAssetId
                : undefined
            }
            data-font-family={
              typeof node.props.fontFamily === "string" && node.props.fontFamily
                ? node.props.fontFamily
                : undefined
            }
            data-selected={selected ? "true" : "false"}
            data-selection-mode={selectionModeForNode(node)}
            data-content-parent={contentParentActive ? "true" : undefined}
            data-locked={node.locked ? "true" : "false"}
            data-group={node.groupId || undefined}
            data-anchor={node.anchor || "top-left"}
            data-effect={String(node.props.effectPreset || "") || undefined}
            data-material={String(node.props.materialPreset || "") || undefined}
            {...visualPartsDataAttrs(node.props)}
            onPointerDown={(e) => onPointerDownNode(e, node, "move")}
            onDoubleClick={(event) => {
              if (!editMode || !((node.primitive === "text" && str(node.props.textCurve, "none") === "none") || (node.primitive === "button" && node.props.contentEditing === true))) return;
              event.preventDefault();
              event.stopPropagation();
              onSelectNodes?.([node.id]);
              setEditingNodeId(node.id);
            }}
            onContextMenu={(event) => {
              if (!editMode) return;
              event.preventDefault();
              event.stopPropagation();
              const rect = surfaceRef.current?.getBoundingClientRect();
              if (!rect) return;
              // Preserve multi-selection when right-clicking an already-selected node
              // so Group / arrange commands remain available.
              if (!selectedSet.has(node.id) || selectedNodeIds.length <= 1) {
                onSelectNodes?.(expandSelectionToGroups(block.nodes, [node.id]));
              }
              setContextMenu({ id: node.id, x: event.clientX - rect.left, y: event.clientY - rect.top });
            }}
            onKeyDown={(event) => {
              if (editMode && event.key === "Tab") {
                event.preventDefault();
                event.stopPropagation();
                const ordered = [...visibleNodes].sort((left, right) => right.zIndex - left.zIndex);
                const current = ordered.findIndex((candidate) => candidate.id === node.id);
                const nextIndex = (current + (event.shiftKey ? -1 : 1) + ordered.length) % ordered.length;
                const next = ordered[nextIndex];
                if (next) {
                  onSelectNodes?.([next.id]);
                  requestAnimationFrame(() => surfaceRef.current?.querySelector<HTMLElement>(`[data-composition-node="${next.id}"]`)?.focus());
                }
                return;
              }
              if (
                !editMode ||
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key
                )
              ) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              event.nativeEvent.stopImmediatePropagation();
              const rect = surfaceRef.current?.getBoundingClientRect();
              const stepPx = event.shiftKey ? 10 : 1;
              const dx =
                event.key === "ArrowLeft"
                  ? -stepPx / Math.max(rect?.width || 1, 1)
                  : event.key === "ArrowRight"
                    ? stepPx / Math.max(rect?.width || 1, 1)
                    : 0;
              const dy =
                event.key === "ArrowUp"
                  ? -stepPx / Math.max(rect?.height || 1, 1)
                  : event.key === "ArrowDown"
                    ? stepPx / Math.max(rect?.height || 1, 1)
                    : 0;
              const ids = expandSelectionToGroups(block.nodes, selectedNodeIds);
              commitNodes(
                translateNodesOnPasteboard(block.nodes, ids, dx, dy),
                event.shiftKey
                  ? "Nudged composition items 10 pixels"
                  : "Nudged composition items 1 pixel"
              );
            }}
            role={editMode ? (selected && !node.locked ? "group" : "button") : undefined}
            tabIndex={editMode ? 0 : undefined}
            aria-label={`${node.primitive}${node.locked ? " locked" : ""}`}
          >
            <ActionVisual node={node} editMode={editMode}>
              <MotionVisual node={node} active={(!editMode || previewMotion) && !reducedMotionSimulation}>
                <NodeVisual
                  node={node}
                  editMode={editMode}
                  textEditing={editingNodeId === node.id}
                  onEditText={(value) => onEditNodeText?.(node.id, value)}
                  onFinishTextEdit={() => setEditingNodeId(null)}
                />
              </MotionVisual>
            </ActionVisual>
          </div>
        );
      })}
      {editMode && groupContentScopeActive && groupBounds && activeGroupId && !groupParentSelection ? (
        <div
          key={`group-content-scope-${activeGroupId}`}
          className="pointer-events-none absolute z-[999] outline outline-1 outline-dashed outline-white/35"
          style={{
            left: `${groupBounds.left * 100}%`,
            top: `${groupBounds.top * 100}%`,
            width: `${groupBounds.width * 100}%`,
            height: `${groupBounds.height * 100}%`,
          }}
          data-testid="composition-group-content-scope-overlay"
          data-group-id={activeGroupId}
        >
          <span className="pointer-events-none absolute left-0 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white/70" style={{ top: `calc(-1.35rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "bottom left" }}>Group · editing contents</span>
        </div>
      ) : null}
      {editMode && groupParentSelection && groupBounds && activeGroupId ? (
        <div
          key={`group-selection-${activeGroupId}`}
          // Overlay body stays pointer-events-none so Group drag/resize still hits members + handles.
          // The Group chip is the Owner-visible reselect target.
          className="pointer-events-none absolute z-[1000] outline outline-1 outline-white/80"
          style={{
            left: `${groupBounds.left * 100}%`,
            top: `${groupBounds.top * 100}%`,
            width: `${groupBounds.width * 100}%`,
            height: `${groupBounds.height * 100}%`,
          }}
          data-testid="composition-group-selection-overlay"
          data-group-id={activeGroupId}
          data-chrome-scale={String(chromeScale)}
        >
          <button
            type="button"
            className="pointer-events-auto absolute left-0 rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white"
            style={{ top: `calc(-1.35rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "bottom left" }}
            data-testid="composition-group-label"
            aria-label="Select Group"
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectNodes?.(groupBounds.memberIds);
            }}
          >
            Group
          </button>
          {([
            // Handles sit half-outside the frame so small Groups keep a body hit target.
            ["nw", "left-0 top-0 cursor-nwse-resize", "center", "translate(-50%, -50%) ", "corner"],
            ["n", "left-1/2 top-0 cursor-ns-resize", "center", "translate(-50%, -50%) ", "edge"],
            ["ne", "right-0 top-0 cursor-nesw-resize", "center", "translate(50%, -50%) ", "corner"],
            ["e", "right-0 top-1/2 cursor-ew-resize", "center", "translate(50%, -50%) ", "edge"],
            ["se", "bottom-0 right-0 cursor-nwse-resize", "center", "translate(50%, 50%) ", "corner"],
            ["s", "left-1/2 bottom-0 cursor-ns-resize", "center", "translate(-50%, 50%) ", "edge"],
            ["sw", "bottom-0 left-0 cursor-nesw-resize", "center", "translate(-50%, 50%) ", "corner"],
            ["w", "left-0 top-1/2 cursor-ew-resize", "center", "translate(-50%, -50%) ", "edge"],
          ] as const).map(([handle, position, origin, translate, kind]) => {
            const seed = block.nodes.find((node) => node.id === groupBounds.memberIds[0]);
            if (!seed) return null;
            return <button key={handle} type="button" className={`pointer-events-auto absolute h-5 w-5 rounded-sm border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-[1px] after:border after:border-white/85 after:bg-white ${kind === "corner" ? "after:h-1.5 after:w-1.5" : "after:h-[5px] after:w-[5px]"} ${position}`} style={{ transform: `${translate}scale(${chromeScale})`, transformOrigin: origin }} data-testid={`composition-group-resize-${handle}`} data-handle-kind={kind} data-handle-placement="outside" aria-label={`Resize group ${handle}`} onPointerDown={(event) => onPointerDownNode(event, seed, "resize", handle)} />;
          })}
          {(() => {
            const seed = block.nodes.find((node) => node.id === groupBounds.memberIds[0]);
            if (!seed) return null;
            return <button type="button" className="pointer-events-auto absolute left-1/2 h-5 w-5 cursor-grab rounded-full border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-white/85 after:bg-[#9cff57]" style={{ top: `calc(-1.85rem * ${chromeScale})`, transform: `translateX(-50%) scale(${chromeScale})`, transformOrigin: "bottom center" }} data-testid="composition-group-rotate" data-handle-kind="rotate" aria-label="Rotate group" onPointerDown={(event) => onPointerDownNode(event, seed, "rotate")} />;
          })()}
        </div>
      ) : null}
      {editMode ? visibleNodes.filter((node) => selectedSet.has(node.id) && !node.locked && !(groupParentSelection && node.groupId && node.groupId === activeGroupId) && !(groupContentScopeActive && !isGroupContentEditing(block.nodes, selectedNodeIds) && node.groupId === activeGroupId)).map((node) => {
        const box = resolveNodeBox(node, editMode);
        const beneath = [...visibleNodes]
          .filter((candidate) => candidate.id !== node.id)
          .filter((candidate) => {
            const candidateBox = resolveNodeBox(candidate, editMode);
            const cx = box.left + box.width / 2;
            const cy = box.top + box.height / 2;
            return cx >= candidateBox.left && cx <= candidateBox.left + candidateBox.width && cy >= candidateBox.top && cy <= candidateBox.top + candidateBox.height;
          })
          .sort((left, right) => right.zIndex - left.zIndex)[0];
        const boxPx = Math.min(box.width * surfaceSize.width, box.height * surfaceSize.height);
        const compactHandles = boxPx < 56;
        const handleHit = compactHandles ? "h-3 w-3" : "h-5 w-5";
        // Selection chrome sits above the object toolbar (z-1550) so More/handles stay Owner-reachable
        // when a small object sits under the floating contextual bar.
        const moreBelow = box.top * surfaceSize.height < 56;
        return <div key={`selection-${node.id}`} className="pointer-events-none absolute z-[1600] outline outline-1 outline-white/70" style={{ left: `${box.left * 100}%`, top: `${box.top * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, transform: node.rotationDeg ? `rotate(${node.rotationDeg}deg)` : undefined }} data-testid={`composition-selection-overlay-${node.id}`} data-chrome-scale={String(chromeScale)} data-compact-handles={compactHandles ? "true" : "false"} data-more-placement={moreBelow ? "below" : "above"}>
          {drag?.id === node.id && drag.mode === "resize" ? <span className="absolute left-0 top-0 -translate-y-full rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white" style={{ transform: `scale(${chromeScale})`, transformOrigin: "bottom left" }} data-testid="composition-size-feedback">{Math.round(box.width * 100)}% × {Math.round(box.height * 100)}%</span> : null}
          <button type="button" className="pointer-events-auto absolute left-0 min-h-5 rounded bg-black/80 px-1.5 text-[9px] text-white" style={moreBelow ? { bottom: `calc(-1.65rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "top left" } : { top: `calc(-1.65rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "bottom left" }} aria-label={`More actions for ${node.name || node.primitive}`} data-testid={`composition-more-${node.id}`} aria-expanded={contextMenu?.id === node.id ? "true" : "false"} onClick={() => setContextMenu((prev) => (prev?.id === node.id ? null : { id: node.id, x: box.left * surfaceSize.width, y: box.top * surfaceSize.height }))}>•••</button>
          {beneath ? <button type="button" className="pointer-events-auto absolute right-0 min-h-5 rounded bg-black/80 px-1.5 text-[9px] text-white" style={{ bottom: `calc(-1.65rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "top right" }} data-testid={`composition-select-beneath-${node.id}`} onClick={() => onSelectNodes?.([beneath.id])}>Select beneath</button> : null}
          {([
            // Half-outside placement keeps body clicks usable on badges/icons and other small frames.
            ["nw", "left-0 top-0 cursor-nwse-resize", "center", "translate(-50%, -50%) ", "corner"],
            ["n", "left-1/2 top-0 cursor-ns-resize", "center", "translate(-50%, -50%) ", "edge"],
            ["ne", "right-0 top-0 cursor-nesw-resize", "center", "translate(50%, -50%) ", "corner"],
            ["e", "right-0 top-1/2 cursor-ew-resize", "center", "translate(50%, -50%) ", "edge"],
            ["se", "bottom-0 right-0 cursor-nwse-resize", "center", "translate(50%, 50%) ", "corner"],
            ["s", "left-1/2 bottom-0 cursor-ns-resize", "center", "translate(-50%, 50%) ", "edge"],
            ["sw", "bottom-0 left-0 cursor-nesw-resize", "center", "translate(-50%, 50%) ", "corner"],
            ["w", "left-0 top-1/2 cursor-ew-resize", "center", "translate(-50%, -50%) ", "edge"],
          ] as const).map(([handle, position, origin, translate, kind]) => <button key={handle} type="button" className={`pointer-events-auto absolute ${handleHit} rounded-sm border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-[1px] after:border after:border-white/85 after:bg-white ${kind === "corner" ? "after:h-1.5 after:w-1.5" : "after:h-[5px] after:w-[5px]"} ${position}`} style={{ transform: `${translate}scale(${chromeScale})`, transformOrigin: origin }} data-testid={`composition-resize-${node.id}-${handle}`} data-handle-kind={kind} data-handle-placement="outside" data-handle-screen-px={kind === "corner" ? (compactHandles ? "4" : "6") : (compactHandles ? "3" : "5")} aria-label={`Resize ${handle}`} onPointerDown={(event) => onPointerDownNode(event, node, "resize", handle)} />)}
          <button type="button" className="pointer-events-auto absolute left-1/2 h-5 w-5 cursor-grab rounded-full border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-white/85 after:bg-[#9cff57]" style={{ top: `calc(-1.85rem * ${chromeScale})`, transform: `translateX(-50%) scale(${chromeScale})`, transformOrigin: "bottom center" }} data-testid={`composition-rotate-${node.id}`} data-handle-kind="rotate" data-handle-screen-px="8" aria-label="Rotate" onPointerDown={(event) => onPointerDownNode(event, node, "rotate")} />
        </div>;
      }) : null}
      {editMode && contextMenu ? (() => {
        const node = block.nodes.find((candidate) => candidate.id === contextMenu.id);
        if (!node) return null;
        const action = (nodes: CreativeCompositionNode[], label: string) => {
          commitNodes(nodes, label);
          setContextMenu(null);
        };
        return <div role="menu" aria-label={`Actions for ${node.name || node.primitive}`} className="absolute z-[1200] min-w-44 rounded-lg border border-white/15 bg-[#0b1019] p-1 text-[10px] text-white shadow-2xl" style={{ left: Math.min(contextMenu.x, Math.max(0, surfaceSize.width - 185)), top: Math.min(contextMenu.y, Math.max(0, surfaceSize.height - 390)) }} data-testid="composition-context-menu" onPointerDown={(event) => event.stopPropagation()}>
          {!node.locked ? <>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { copyCompositionNodes(block.nodes, [node.id]); setContextMenu(null); }}>Copy</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { copyCompositionNodeStyle(node); setContextMenu(null); }}>Copy style</button>
            <button role="menuitem" type="button" disabled={!hasCompositionClipboard()} className="block w-full rounded px-2 py-2 text-left hover:bg-white/5 disabled:opacity-35" onClick={() => { const result = pasteCompositionNodes(block.nodes); action(result.nodes, "Pasted Element"); onSelectNodes?.(result.newIds); }}>Paste</button>
            <button role="menuitem" type="button" disabled={!hasCompositionStyleClipboard()} className="block w-full rounded px-2 py-2 text-left hover:bg-white/5 disabled:opacity-35" onClick={() => action(pasteCompositionNodeStyle(block.nodes, node.id), "Pasted Element style")}>Paste style</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { const duplicated = duplicateNodes(block.nodes, [node.id]); action(duplicated.nodes, "Duplicated Element"); onSelectNodes?.(duplicated.newIds); }}>Duplicate</button>
            {selectedNodeIds.length > 1 ? <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" data-testid="composition-context-group" onClick={() => { const next = groupNodes(block.nodes, selectedNodeIds); action(next, "Grouped Elements"); onSelectNodes?.(expandSelectionToGroups(next, selectedNodeIds)); }}>Group</button> : null}
            {node.groupId ? <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" data-testid="composition-context-ungroup" onClick={() => { action(ungroupNodes(block.nodes, node.groupId!), "Ungrouped Elements"); onSelectNodes?.(selectedNodeIds); }}>Ungroup</button> : null}
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(bringForward(block.nodes, node.id), "Brought Element forward")}>Bring forward</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(sendBackward(block.nodes, node.id), "Sent Element backward")}>Send backward</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(bringToFront(block.nodes, node.id), "Brought Element to front")}>Bring to front</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(sendToBack(block.nodes, node.id), "Sent Element to back")}>Send to back</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(block.nodes.map((candidate) => candidate.id === node.id ? { ...candidate, visible: false } : candidate), "Hid Element")}>Hide</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(block.nodes.map((candidate) => candidate.id === node.id ? { ...candidate, locked: true } : candidate), "Locked Element")}>Lock</button>
            {containerActions?.current === "section" && containerActions.onMoveToCard ? <>
              <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { containerActions.onMoveToCard?.(node.id); setContextMenu(null); }}>Move to Card</button>
              <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { containerActions.onMoveToCard?.(node.id); setContextMenu(null); }}>Remove from Section</button>
            </> : null}
            {containerActions?.sections.map((section) => <button key={section.id} role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { containerActions.onMoveToSection?.(node.id, section.id); setContextMenu(null); }}>Move to Section… {section.label}</button>)}
            {containerActions?.onWrap ? <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { containerActions.onWrap?.(node.id); setContextMenu(null); }}>Wrap in new Section</button> : null}
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left text-red-300 hover:bg-white/5" onClick={() => { action(deleteNodes(block.nodes, [node.id]), "Deleted Element"); onSelectNodes?.([]); }}>Delete</button>
          </> : <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(block.nodes.map((candidate) => candidate.id === node.id ? { ...candidate, locked: false } : candidate), "Unlocked Element")}>Unlock to edit or delete</button>}
        </div>;
      })() : null}
    </div>
  );
}
