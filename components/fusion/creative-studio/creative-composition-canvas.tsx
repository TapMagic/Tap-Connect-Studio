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
import { surfacePatternStyle } from "@/lib/fusion/creative-studio/patterns";
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
  resolveContainerParent,
  selectionModeForNode,
} from "@/lib/fusion/creative-studio/selection-mode";

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
  containerActions?: {
    current: "card" | "section";
    sections: Array<{ id: string; label: string }>;
    onMoveToCard?: (nodeId: string) => void;
    onMoveToSection?: (nodeId: string, sectionId: string) => void;
    onWrap?: (nodeId: string) => void;
  };
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
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
    const fill = str(node.props.fill, "transparent");
    const gradientStart = str(node.props.gradientStart);
    const gradientEnd = str(node.props.gradientEnd);
    return <div
      className="h-full w-full"
      data-component-kind="container"
      data-container-layout={str(node.props.layout, "free")}
      data-container-resize-policy={str(node.props.resizePolicy, "reflow")}
      style={{
        background: gradientStart && gradientEnd ? `linear-gradient(${num(node.props.gradientAngle, 145)}deg,${gradientStart},${gradientEnd})` : fill,
        border: `${num(node.props.borderWidth, 0)}px ${str(node.props.borderStyle, "solid")} ${str(node.props.borderColor, "transparent")}`,
        borderRadius: num(node.props.radius, 0),
        boxShadow: num(node.props.boxShadow, 0) ? `0 10px ${num(node.props.boxShadow, 0)}px rgba(0,0,0,.35)` : undefined,
        opacity: num(node.props.opacity, 1),
      }}
    />;
  }
  if (componentKind === "gallery") {
    const media = Array.isArray(node.props.media) ? node.props.media.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
    if (!media.length && !editMode) return null;
    return <div className="grid h-full w-full overflow-hidden rounded-xl border border-white/15 bg-white/5 p-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, media.length))},minmax(0,1fr))`, gap: num(node.props.gap, 10), opacity: num(node.props.opacity, 1) }} data-component-kind="gallery">{media.length ? media.map((src, index) => <img /* eslint-disable-line @next/next/no-img-element */ key={`${src}-${index}`} src={src} alt={`Gallery image ${index + 1}`} className="h-full min-h-0 w-full rounded-lg object-cover" />) : <div className="col-span-full grid h-full place-items-center rounded-lg border border-dashed border-white/25 text-[10px] text-white/55" data-editor-placeholder="media">Add gallery media</div>}</div>;
  }

  if (componentKind === "coupon" || componentKind === "ticket") {
    const coupon = componentKind === "coupon";
    const artwork = str(node.props.artworkSrc);
    return <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 p-4 text-[#17100a] shadow-xl" style={artwork ? { backgroundImage: `linear-gradient(rgba(255,255,255,.2),rgba(255,255,255,.2)),url("${artwork.replaceAll('"', "%22")}")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} data-component-kind={componentKind} data-surface-mode={artwork ? "uploaded_artwork" : "preset"}><div><span className="text-[9px] font-black uppercase tracking-[.22em]">{coupon ? "TapConnect Coupon" : "TapConnect Ticket"}</span><strong className="mt-1 block text-xl leading-none">{str(node.props.headline, str(node.props.title, coupon ? "SPECIAL OFFER" : "ADMIT ONE"))}</strong>{coupon ? <span className="mt-2 block text-2xl font-black">{str(node.props.offerValue, "20% OFF")}</span> : null}</div><div className="flex items-end justify-between gap-2"><span className="rounded bg-black/80 px-2 py-1 font-mono text-[10px] text-white">{str(node.props.code, str(node.props.ticketId, coupon ? "SAVE20" : "TICKET-001"))}</span><span className="grid h-10 w-10 place-items-center rounded bg-white text-[8px] font-black" aria-label="QR context">QR</span></div><p className="mt-2 text-[8px] leading-tight">{str(node.props.terms, "Draft terms — review before publishing.")}</p></div>;
  }

  if (componentKind === "form") {
    const fields = Array.isArray(node.props.fields) ? node.props.fields as Array<{ id?: string; label?: string; type?: string }> : [];
    return <form className="flex h-full w-full flex-col gap-2 rounded-xl border border-white/15 bg-white/5 p-3" aria-label={str(node.props.accessibleLabel, "Contact form")} onSubmit={(event) => event.preventDefault()} data-component-kind="form" data-live-submission="false"><strong className="text-sm">{str(node.props.heading, "Stay in touch")}</strong>{fields.map((field, index) => <label key={field.id || index} className="text-[9px]">{field.label || "Field"}<input type={field.type || "text"} disabled={!editMode} className="mt-1 h-8 w-full rounded border border-white/15 bg-black/20 px-2" /></label>)}<label className="flex items-start gap-2 text-[8px]"><input type="checkbox" disabled={!editMode} />{str(node.props.consent, "I agree to be contacted.")}</label><button type="button" className="min-h-9 rounded bg-[#b8ff2c] text-xs font-semibold text-black">Submit</button></form>;
  }

  if (node.primitive === "text") {
    const text = str(node.props.text, "Text");
    const curve = str(node.props.textCurve, "none");
    const glyphStyle: CSSProperties = {
      background: node.props.gradientFill ? str(node.props.gradientFill) : undefined,
      backgroundClip: node.props.gradientFill ? "text" : undefined,
      WebkitBackgroundClip: node.props.gradientFill ? "text" : undefined,
      WebkitTextFillColor: node.props.gradientFill ? "transparent" : undefined,
      WebkitTextStroke: num(node.props.outlineWidth, 0) > 0 ? `${num(node.props.outlineWidth, 0)}px ${str(node.props.outlineColor, str(node.props.color, "#f8fafc"))}` : undefined,
      textShadow: [
        str(node.props.textShadowLayers),
        num(node.props.glow, 0) > 0 ? `0 0 ${num(node.props.glow, 0)}px ${str(node.props.color, "#f8fafc")}` : "",
        num(node.props.shadow, 0) > 0 ? `0 ${Math.max(1, num(node.props.shadow, 0) / 3)}px ${num(node.props.shadow, 0)}px rgba(0,0,0,.7)` : "",
      ].filter(Boolean).join(", ") || undefined,
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
            style={{ filter: num(node.props.glow, 0) > 0 ? `drop-shadow(0 0 ${num(node.props.glow, 0)}px ${color})` : undefined }}
          >
            <textPath href={`#curve-${node.id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
          </text>
        </svg>
      );
    }
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1"
        data-text-box-background="transparent"
        data-glyph-effect={node.props.glyphEffect ? String(node.props.glyphEffect) : node.props.materialPreset ? String(node.props.materialPreset) : node.props.gradientFill ? "gradient" : node.props.glow ? "glow" : "none"}
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
          background: node.props.boxGradient ? str(node.props.boxGradient) : node.props.boxFill ? str(node.props.boxFill) : "transparent",
          border: node.props.boxBorder ? `1px solid ${str(node.props.boxBorder)}` : undefined,
          borderRadius: node.props.boxRadius != null ? num(node.props.boxRadius, 0) : undefined,
          padding: node.props.boxPadding != null ? num(node.props.boxPadding, 0) : undefined,
          boxShadow: num(node.props.boxShadow, 0)
            ? `0 8px ${num(node.props.boxShadow, 0)}px rgba(0,0,0,.35)`
            : num(node.props.boxGlow, 0)
              ? `0 0 ${num(node.props.boxGlow, 0)}px ${str(node.props.color, "#b8ff2c")}`
              : undefined,
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
    return (
      <div
        className="relative h-full w-full overflow-hidden rounded-md bg-white/10"
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
          borderRadius: num(node.props.outlineRadius, 6),
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
      const radius = num(node.props.radius, 0);
      const backing = str(node.props.boxFill, "transparent");
      return (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            color: fill,
            opacity,
            borderRadius: radius,
            background: backing === "transparent" ? undefined : backing,
            boxShadow: num(node.props.boxShadow, 0)
              ? `0 8px ${num(node.props.boxShadow, 0)}px rgba(0,0,0,.35)`
              : num(node.props.boxGlow, 0) || num(node.props.glow, 0)
                ? `0 0 ${num(node.props.boxGlow, num(node.props.glow, 0))}px ${fill}`
                : undefined,
            filter: num(node.props.glow, 0) ? `drop-shadow(0 0 ${num(node.props.glow, 0)}px ${fill})` : undefined,
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
        >
          {typeof node.props.iconSvg === "string" && node.props.iconSvg.includes("<svg") ? (
            <span
              className="grid h-full w-full place-items-center [&_svg]:h-full [&_svg]:w-full"
              data-icon-provider={str(node.props.iconProvider, "native")}
              data-icon-svg="true"
              data-icon-canonical={str(node.props.icon, "")}
              style={{ color: fill }}
              aria-hidden
              dangerouslySetInnerHTML={{ __html: String(node.props.iconSvg) }}
            />
          ) : node.props.iconProvider === "iconify" && node.props.iconCollection && node.props.iconName ? <img /* eslint-disable-line @next/next/no-img-element */
            src={`https://api.iconify.design/${encodeURIComponent(str(node.props.iconCollection))}/${encodeURIComponent(str(node.props.iconName))}.svg?color=${encodeURIComponent(fill)}`}
            alt={node.props.decorative === true ? "" : str(node.props.accessibleLabel, "Icon")}
            className="h-full w-full object-contain"
            data-icon-provider="iconify"
            style={strokeWidth > 0 ? { filter: `drop-shadow(0 0 0 ${stroke})` } : undefined}
          /> : <ElementIcon name={str(node.props.iconName || node.props.icon, "sparkles")} size={num(node.props.iconSize, 48)} />}
        </div>
      );
    }
    if (elementKind === "badge") {
      const badgeShape = str(node.props.badgeShape, "pill");
      const badgeClip = badgeShape === "burst" || badgeShape === "starburst"
        ? "polygon(50% 0,61% 20%,82% 10%,80% 35%,100% 50%,80% 65%,82% 90%,61% 80%,50% 100%,39% 80%,18% 90%,20% 65%,0 50%,20% 35%,18% 10%,39% 20%)"
        : badgeShape === "ticket" ? "polygon(8% 0,92% 0,92% 12%,100% 20%,92% 28%,92% 72%,100% 80%,92% 88%,92% 100%,8% 100%,8% 88%,0 80%,8% 72%,8% 28%,0 20%,8% 12%)"
          : badgeShape === "ribbon" || badgeShape === "corner-ribbon" ? "polygon(8% 0,92% 0,82% 50%,92% 100%,8% 100%,18% 50%)"
            : badgeShape === "tag" ? "polygon(0 0,82% 0,100% 50%,82% 100%,0 100%,10% 50%)"
              : badgeShape === "shield" ? "polygon(50% 0,94% 16%,88% 65%,50% 100%,12% 65%,6% 16%)"
                : badgeShape === "hexagon" ? "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)" : undefined;
      return (
        <div
          className="flex h-full w-full items-center justify-center px-2 text-center"
          style={{
            background: str(node.props.gradientFill, str(node.props.fill, "#ef4444")),
            color: str(node.props.color, "#ffffff"),
            borderRadius: badgeShape === "circle" ? "50%" : badgeShape === "square" ? 0 : num(node.props.radius, 999),
            clipPath: badgeClip,
            border: num(node.props.borderWidth, 0) ? `${num(node.props.borderWidth, 0)}px solid ${str(node.props.borderColor, "#fff")}` : undefined,
            boxShadow: num(node.props.shadow, 0) ? `0 8px ${num(node.props.shadow, 18)}px rgba(0,0,0,.4)` : undefined,
            fontFamily: str(node.props.fontFamily, "Inter, system-ui, sans-serif"),
            fontSize: num(node.props.fontSize, 18),
            fontWeight: num(node.props.fontWeight, 800),
            letterSpacing: `${num(node.props.letterSpacingEm, .04)}em`,
          }}
          data-badge-shape={badgeShape}
        >{str(node.props.text, "SALE")}</div>
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
    const fill =
      fillKind === "gradient" && node.props.gradient
        ? gradientToCss(node.props.gradient as typeof DEFAULT_GRADIENT)
        : fillKind === "image" && str(node.props.imageSrc)
          ? `url("${str(node.props.imageSrc).replaceAll('"', "%22")}") center / cover no-repeat`
          : str(node.props.gradientFill, str(node.props.fill, "#22c55e"));
    const shadow = num(node.props.shadow, 0);
    const glow = num(node.props.glow, 0);
    return (
      <div
        className="h-full w-full"
        style={{
          background: fill,
          opacity: num(node.props.opacity, 1),
          borderRadius: radius,
          clipPath: clipPaths[shape],
          border:
            num(node.props.strokeWidth, 0) > 0
              ? `${num(node.props.strokeWidth, 0)}px solid ${str(node.props.stroke, "#fff")}`
              : undefined,
          boxShadow: [
            shadow > 0 ? `0 ${Math.max(2, shadow / 3)}px ${shadow}px rgba(0,0,0,.55)` : "",
            glow > 0
              ? `0 0 ${glow}px ${str(node.props.stroke, "#9cff57")}`
              : "",
          ]
            .filter(Boolean)
            .join(", ") || undefined,
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
      />
    );
  }

  if (node.primitive === "border") {
    const style = str(node.props.style, "solid");
    const thickness = num(node.props.thickness, 2);
    const color = str(node.props.color, "#fff");
    const opacity = num(node.props.opacity, 1);
    const cap = str(node.props.cap, "round");
    const startMarker = str(node.props.startMarker, "none");
    const endMarker = str(node.props.endMarker, "none");
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
    const surfaceKind = str(node.props.buttonSurfaceKind, "solid");
    const surfaceBackground = surfaceKind === "transparent"
      ? "transparent"
      : surfaceKind === "gradient"
        ? `linear-gradient(${num(node.props.gradientAngle, 120)}deg, ${str(node.props.gradientStart, "#22c55e")}, ${str(node.props.gradientEnd, "#a3e635")})`
        : surfaceKind === "image" && str(node.props.backgroundImageUrl)
          ? `url("${str(node.props.backgroundImageUrl).replaceAll('"', "%22")}") center / cover no-repeat`
          : surfaceKind === "pattern"
            ? `repeating-linear-gradient(135deg, ${str(node.props.fill, "#22c55e")} 0 10px, ${str(node.props.gradientEnd, "#a3e635")} 10px 20px)`
            : surfaceKind === "texture"
              ? `radial-gradient(circle at 25% 25%, #ffffff28 0 1px, transparent 2px), ${str(node.props.fill, "#22c55e")}`
              : str(node.props.fill, "#22c55e");
    const shadowParts = [
      num(node.props.boxShadow, 0) ? `0 8px ${num(node.props.boxShadow, 18)}px rgba(0,0,0,.4)` : "",
      num(node.props.boxGlow, 0) ? `0 0 ${num(node.props.boxGlow, 18)}px ${str(node.props.glowColor, "#b8ff2c")}` : "",
    ].filter(Boolean).join(", ") || undefined;
    const labelStyle: CSSProperties = {
      color: str(labelProps.color, str(node.props.labelColor, str(node.props.textColor, "#0b0f19"))),
      fontFamily: str(labelProps.fontFamily, str(node.props.fontFamily, "Inter, system-ui, sans-serif")),
      fontSize: num(labelProps.fontSize, num(node.props.fontSize, 14)),
      fontWeight: num(labelProps.fontWeight, num(node.props.fontWeight, 600)),
      letterSpacing: `${num(labelProps.letterSpacingEm, num(node.props.letterSpacingEm, 0))}em`,
      textTransform: str(labelProps.textTransform, str(node.props.textTransform, "none")) as CSSProperties["textTransform"],
      transform: `translate(${num(node.props.labelOffsetX, 0)}px, ${num(node.props.labelOffsetY, 0)}px)`,
      textAlign: str(node.props.textAlign, "center") as CSSProperties["textAlign"],
      background: node.props.gradientFill ? str(node.props.gradientFill) : undefined,
      backgroundClip: node.props.gradientFill ? "text" : undefined,
      WebkitBackgroundClip: node.props.gradientFill ? "text" : undefined,
      WebkitTextFillColor: node.props.gradientFill ? "transparent" : undefined,
      textShadow: num(node.props.glow, 0) ? `0 0 ${num(node.props.glow, 12)}px ${str(node.props.glowColor, "currentColor")}` : num(node.props.shadow, 0) ? `0 3px ${num(node.props.shadow, 12)}px rgba(0,0,0,.45)` : undefined,
    };
    const surface = (
      <span
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          width: circle ? Math.max(44, num(node.props.touchTargetPx, 52)) : "100%",
          height: circle ? Math.max(44, num(node.props.touchTargetPx, 52)) : "100%",
          minHeight: 44,
          background: surfaceBackground,
          backgroundSize: surfaceKind === "texture" ? "8px 8px" : undefined,
          color: str(node.props.iconColor, str(node.props.textColor, "#0b0f19")),
          borderRadius: radius,
          borderWidth: num(node.props.borderWidth, 0),
          borderStyle: "solid",
          borderColor: str(node.props.borderColor, "transparent"),
          boxShadow: shadowParts,
          opacity: num(node.props.surfaceOpacity, 1),
          padding: num(node.props.padding, 8),
          gap: num(node.props.spacing, 6),
        }}
        data-button-surface-kind={surfaceKind}
        data-button-radius={String(linkedRadius)}
        data-button-high-gloss={node.props.shine === true ? "true" : "false"}
      >
        {node.props.shine === true ? <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent" aria-hidden data-testid={`button-shine-${node.id}`} /> : null}
        {showIcon && str(node.props.iconPosition, "before") === "before" ? <span data-testid={`button-icon-${node.id}`} style={{ transform: `translate(${num(node.props.iconOffsetX, 0)}px, ${num(node.props.iconOffsetY, 0)}px)` }}><ElementIcon name={icon} size={num(node.props.iconSize, 20)} /></span> : null}
        {!labelBelow && showLabel ? (node.props.contentEditing === true ? <InlineEditableText nodeId={node.id} value={labelValue} editing={Boolean(editMode && textEditing)} style={labelStyle} onCommit={onEditText} onFinish={onFinishTextEdit} /> : <span style={labelStyle}>{labelValue}</span>) : null}
        {showIcon && str(node.props.iconPosition, "before") === "after" ? <span data-testid={`button-icon-${node.id}`} style={{ transform: `translate(${num(node.props.iconOffsetX, 0)}px, ${num(node.props.iconOffsetY, 0)}px)` }}><ElementIcon name={icon} size={num(node.props.iconSize, 20)} /></span> : null}
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
  } | null>(null);

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

  useEffect(() => {
    if (!editMode) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable=true]")) {
        return;
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v" && hasCompositionClipboard()) {
        e.preventDefault();
        const result = pasteCompositionNodes(block.nodes);
        commitNodes(result.nodes, "Pasted composition items");
        onSelectNodes?.(result.newIds);
        return;
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, selectedNodeIds, block.nodes, commitNodes, onSelectNodes]);

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
    let nextIds: string[];
    if (multi) {
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

    const moveIds =
      mode === "move"
        ? isContainerNode(target)
          ? [target.id, ...containerChildIds(block.nodes, target.id)]
          : expandSelectionToGroups(block.nodes, nextIds)
        : [target.id];
    setDrag({
      id: target.id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...target },
      origNodes: block.nodes.map((n) => ({ ...n, props: { ...n.props } })),
      moveIds,
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
      const centerX = rect.left + (drag.orig.x + drag.orig.width / 2) * rect.width;
      const centerY = rect.top + (drag.orig.y + drag.orig.height / 2) * rect.height;
      const angle =
        (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI +
        90;
      const resolvedAngle = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
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
        onSelectNodes?.(visibleNodes.filter((node) => {
          const box = resolveNodeBox(node, editMode);
          return box.left < right && box.left + box.width > left && box.top < bottom && box.top + box.height > top;
        }).map((node) => node.id));
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

  const bg =
    block.background?.kind === "solid"
      ? block.background.value || "#0b0f19"
      : block.background?.kind === "gradient"
        ? block.background.gradient
          ? gradientToCss(block.background.gradient)
          : block.background.value || gradientToCss(DEFAULT_GRADIENT)
        : "transparent";
  const backgroundImage = block.background?.image;
  const backgroundStyle =
    block.background?.kind === "image" && backgroundImage?.src
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
          if (editMode && event.target === event.currentTarget) onSelectNodes?.([]);
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ ...backgroundStyle, ...backgroundTreatmentStyle, opacity: block.background?.opacity ?? 1, filter: [backgroundTreatmentStyle?.filter, `saturate(${block.background?.saturation ?? 1}) brightness(${block.background?.brightness ?? 1}) contrast(${block.background?.contrast ?? 1})`].filter(Boolean).join(" ") }}
          data-testid="composition-background-renderer"
          data-background-opacity={String(block.background?.opacity ?? 1)}
          aria-hidden
        />
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
              if (editMode) event.preventDefault();
            }}
            onDrop={(event) => {
              if (!editMode) return;
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
      role="group"
      aria-label={block.label}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerDown={(event) => {
        setContextMenu(null);
        if (editMode && event.target === event.currentTarget && event.button === 0) {
          onSelectNodes?.([]);
          setMarquee({ startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY });
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
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
        aria-hidden
      />
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
            data-selected={selected ? "true" : "false"}
            data-selection-mode={selectionModeForNode(node)}
            data-content-parent={contentParentActive ? "true" : undefined}
            data-locked={node.locked ? "true" : "false"}
            data-group={node.groupId || undefined}
            data-anchor={node.anchor || "top-left"}
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
              onSelectNodes?.([node.id]);
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
      {editMode ? visibleNodes.filter((node) => selectedSet.has(node.id) && !node.locked).map((node) => {
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
        return <div key={`selection-${node.id}`} className="pointer-events-none absolute z-[1000] outline outline-1 outline-white/70" style={{ left: `${box.left * 100}%`, top: `${box.top * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, transform: node.rotationDeg ? `rotate(${node.rotationDeg}deg)` : undefined }} data-testid={`composition-selection-overlay-${node.id}`} data-chrome-scale={String(chromeScale)}>
          {drag?.id === node.id && drag.mode === "resize" ? <span className="absolute left-0 top-0 -translate-y-full rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white" style={{ transform: `scale(${chromeScale})`, transformOrigin: "bottom left" }} data-testid="composition-size-feedback">{Math.round(box.width * 100)}% × {Math.round(box.height * 100)}%</span> : null}
          <button type="button" className="pointer-events-auto absolute left-0 min-h-5 rounded bg-black/80 px-1.5 text-[9px] text-white" style={{ top: `calc(-1.65rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "bottom left" }} aria-label={`More actions for ${node.name || node.primitive}`} data-testid={`composition-more-${node.id}`} onClick={() => setContextMenu({ id: node.id, x: box.left * surfaceSize.width, y: box.top * surfaceSize.height })}>•••</button>
          {beneath ? <button type="button" className="pointer-events-auto absolute right-0 min-h-5 rounded bg-black/80 px-1.5 text-[9px] text-white" style={{ bottom: `calc(-1.65rem * ${chromeScale})`, transform: `scale(${chromeScale})`, transformOrigin: "top right" }} data-testid={`composition-select-beneath-${node.id}`} onClick={() => onSelectNodes?.([beneath.id])}>Select beneath</button> : null}
          {([
            ["nw", "left-0 top-0 cursor-nwse-resize", "top left", ""],
            ["n", "left-1/2 top-0 cursor-ns-resize", "top center", "translateX(-50%) "],
            ["ne", "right-0 top-0 cursor-nesw-resize", "top right", ""],
            ["e", "right-0 top-1/2 cursor-ew-resize", "center right", "translateY(-50%) "],
            ["se", "bottom-0 right-0 cursor-nwse-resize", "bottom right", ""],
            ["s", "left-1/2 bottom-0 cursor-ns-resize", "bottom center", "translateX(-50%) "],
            ["sw", "bottom-0 left-0 cursor-nesw-resize", "bottom left", ""],
            ["w", "left-0 top-1/2 cursor-ew-resize", "center left", "translateY(-50%) "],
          ] as const).map(([handle, position, origin, translate]) => <button key={handle} type="button" className={`pointer-events-auto absolute h-5 w-5 rounded-sm border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-[1px] after:border after:border-white/90 after:bg-white ${position}`} style={{ transform: `${translate}scale(${chromeScale})`, transformOrigin: origin }} data-testid={`composition-resize-${node.id}-${handle}`} data-handle-screen-px="8" aria-label={`Resize ${handle}`} onPointerDown={(event) => onPointerDownNode(event, node, "resize", handle)} />)}
          <button type="button" className="pointer-events-auto absolute left-1/2 h-5 w-5 cursor-grab rounded-full border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-white/90 after:bg-[#9cff57]" style={{ top: `calc(-1.85rem * ${chromeScale})`, transform: `translateX(-50%) scale(${chromeScale})`, transformOrigin: "bottom center" }} data-testid={`composition-rotate-${node.id}`} aria-label="Rotate" onPointerDown={(event) => onPointerDownNode(event, node, "rotate")} />
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
            {selectedNodeIds.length > 1 ? <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(groupNodes(block.nodes, selectedNodeIds), "Grouped Elements")}>Group</button> : null}
            {node.groupId ? <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(ungroupNodes(block.nodes, node.groupId!), "Ungrouped Elements")}>Ungroup</button> : null}
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
