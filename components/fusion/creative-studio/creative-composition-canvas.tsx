"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
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
  resolveNodeBox,
  sendBackward,
  sendToBack,
  sortCompositionNodes,
  translateNodes,
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

export type CreativeCompositionCanvasProps = {
  block: CreativeCompositionBlock;
  editMode?: boolean;
  selectedNodeIds?: string[];
  onSelectNodes?: (ids: string[]) => void;
  onChangeBlock?: (next: CreativeCompositionBlock, label?: string) => void;
  /** Force mobile fallback layout (narrow preview). */
  forceMobileFallback?: boolean;
  className?: string;
  aspectRatio?: number;
  layoutMode?: "stack" | "row" | "grid" | "free";
  gapPx?: number;
  align?: "start" | "center" | "end" | "stretch";
  distribute?: "start" | "center" | "end" | "between" | "around";
  minHeightPx?: number;
  onEditNodeText?: (nodeId: string, value: string) => void;
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function colorWithOpacity(color: string, opacity: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${alpha}`;
}

function ElementIcon({ name, size = 20 }: { name: string; size?: number }) {
  const props = { width: size, height: size, "aria-hidden": true } as const;
  if (name.includes("phone")) return <Phone {...props} />;
  if (name.includes("mail")) return <Mail {...props} />;
  if (name.includes("map") || name.includes("pin")) return <MapPin {...props} />;
  return <ArrowUpRight {...props} />;
}

function NodeVisual({
  node,
  editMode,
  textEditing,
  onEditText,
}: {
  node: CreativeCompositionNode;
  editMode?: boolean;
  textEditing?: boolean;
  onEditText?: (value: string) => void;
}) {
  const elementKind = str(node.props.elementKind);

  if (elementKind === "map") {
    const props = node.props as MapElementProps;
    const mode = str(props.mapDisplayMode, "location_card");
    const name = str(props.locationName, "Choose a location");
    const address = str(props.address, "Select a Workspace Location or enter an address");
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
          {!href ? <span className="text-[9px] text-amber-200">Complete Map setup in the inspector</span> : null}
        </div>
      </div>
    );
  }

  if (node.primitive === "text") {
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1"
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
        }}
      >
        <span
          className="w-full whitespace-pre-wrap leading-tight outline-none"
          contentEditable={Boolean(editMode && textEditing)}
          suppressContentEditableWarning
          data-testid={`composition-inline-text-${node.id}`}
          onPointerDown={(event) => {
            if (textEditing) event.stopPropagation();
          }}
          onInput={(event) => onEditText?.(event.currentTarget.innerText)}
        >
          {str(node.props.text, "Text")}
        </span>
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
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/80">
            {editMode ? "Add image URL in inspector" : "Image"}
          </div>
        )}
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
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-[10px] text-white/45">
              <span>{FRAME_MASK_CATALOG.find((m) => m.id === mask)?.label || "Frame"}</span>
              {editMode ? <span>Set media in inspector</span> : null}
            </div>
          )}
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
          : str(node.props.fill, "#22c55e");
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
    const presentation = str(node.props.presentation, "rounded");
    const showLabel = node.props.showLabel !== false && presentation !== "icon_circle";
    const showDescription = node.props.showDescription === true || presentation === "icon_description";
    const icon = str(node.props.icon, "arrow-up-right");
    const circle = presentation === "circle" || presentation === "icon_circle" || presentation === "icon_label" || presentation === "icon_description";
    const labelBelow = presentation === "icon_label" || presentation === "icon_description";
    const actionHref = buildButtonHref(node.props);
    const radius = presentation === "rectangle" ? 0 : presentation === "square" ? num(node.props.radius, 6) : (circle || presentation === "pill") ? 999 : num(node.props.radius, 14);
    const surface = (
      <span
        className="inline-flex shrink-0 items-center justify-center gap-2"
        style={{
          width: circle ? Math.max(44, num(node.props.touchTargetPx, 52)) : "100%",
          height: circle ? Math.max(44, num(node.props.touchTargetPx, 52)) : "100%",
          minHeight: 44,
          background: str(node.props.fill, "#22c55e"),
          color: str(node.props.iconColor, str(node.props.textColor, "#0b0f19")),
          borderRadius: radius,
          borderWidth: num(node.props.borderWidth, 0),
          borderStyle: "solid",
          borderColor: str(node.props.borderColor, "transparent"),
          boxShadow: num(node.props.shadow, 0) ? `0 8px ${num(node.props.shadow, 18)}px rgba(0,0,0,.35)` : undefined,
        }}
      >
        <ElementIcon name={icon} size={num(node.props.iconSize, 20)} />
        {!labelBelow && showLabel ? <span>{str(node.props.label, "Button")}</span> : null}
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
          padding: labelBelow ? 2 : num(node.props.padding, 8),
          opacity: num(node.props.opacity, 1),
          gap: num(node.props.spacing, 6),
        }}
        tabIndex={editMode ? undefined : 0}
        aria-label={str(node.props.accessibleLabel, str(node.props.label, "Button"))}
        data-button-presentation={presentation}
      >
        {surface}
        {labelBelow && showLabel ? <strong className="block" style={{ color: str(node.props.labelColor, str(node.props.textColor, "#f8fafc")) }}>{str(node.props.label, "Button")}</strong> : null}
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
  className,
  aspectRatio = 4 / 5,
  layoutMode = "free",
  gapPx = 12,
  align = "stretch",
  distribute = "start",
  minHeightPx,
  onEditNodeText,
}: CreativeCompositionCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [surfaceSize, setSurfaceSize] = useState({ width: 180, height: 220 });
  const [draftNodes, setDraftNodes] = useState<CreativeCompositionNode[] | null>(
    null
  );
  const [guides, setGuides] = useState<CompositionGuide[]>([]);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
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
    if (hideDecorative) {
      nodes = nodes.filter((n) => n.primitive === "text" || n.primitive === "button");
    }
    return nodes;
  }, [workingNodes, hideDecorative]);

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
        onSelectNodes?.([]);
        return;
      }
      if (!selectedNodeIds.length) return;
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
          translateNodes(block.nodes, ids, dx, dy),
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
    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    let nextIds: string[];
    if (multi) {
      nextIds = selectedSet.has(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
    } else if (!selectedSet.has(node.id) || selectedNodeIds.length > 1) {
      nextIds = expandSelectionToGroups(block.nodes, [node.id]);
    } else {
      nextIds = expandSelectionToGroups(block.nodes, selectedNodeIds);
    }
    onSelectNodes?.(nextIds);
    const moveIds =
      mode === "move"
        ? expandSelectionToGroups(block.nodes, nextIds)
        : [node.id];
    setDrag({
      id: node.id,
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...node },
      origNodes: block.nodes.map((n) => ({ ...n, props: { ...n.props } })),
      moveIds,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !surfaceRef.current || !editMode) return;
    autoScrollForPointer(surfaceRef.current, e.clientX, e.clientY);
    const rect = surfaceRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    if (drag.mode === "move") {
      const translated = translateNodes(drag.origNodes, drag.moveIds, dx, dy);
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
      setDraftNodes(
        drag.origNodes.map((node) =>
          node.id === drag.id ? { ...node, rotationDeg: Math.round(angle) } : node
        )
      );
      return;
    }
    const nodes = drag.origNodes.map((n) => {
      if (n.id !== drag.id) return n;
      const handle = drag.handle || "se";
      const west = handle.includes("w");
      const east = handle.includes("e");
      const north = handle.includes("n");
      const south = handle.includes("s");
      let x = west ? Math.min(n.x + n.width - 0.02, Math.max(0, n.x + dx)) : n.x;
      let y = north ? Math.min(n.y + n.height - 0.02, Math.max(0, n.y + dy)) : n.y;
      let width = west
        ? n.width + (n.x - x)
        : east
          ? Math.min(1 - n.x, Math.max(0.02, n.width + dx))
          : n.width;
      let height = north
        ? n.height + (n.y - y)
        : south
          ? Math.min(1 - n.y, Math.max(0.02, n.height + dy))
          : n.height;
      if (e.altKey) {
        if (east) { x = n.x - dx; width = n.width + dx * 2; }
        if (west) { x = n.x + dx; width = n.width - dx * 2; }
        if (south) { y = n.y - dy; height = n.height + dy * 2; }
        if (north) { y = n.y + dy; height = n.height - dy * 2; }
      }
      if ((e.shiftKey || n.props.aspectLocked === true) && (east || west) && (north || south)) {
        const aspect = drag.orig.width / drag.orig.height;
        if (Math.abs(dx) >= Math.abs(dy)) height = width / aspect;
        else width = height * aspect;
        if (west) x = drag.orig.x + drag.orig.width - width;
        if (north) y = drag.orig.y + drag.orig.height - height;
      }
      return {
        ...n,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(1 - x, Math.max(0.02, width)),
        height: Math.min(1 - y, Math.max(0.02, height)),
      };
    });
    setDraftNodes(nodes);
  };

  const onPointerUp = () => {
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
          style={{ ...backgroundStyle, ...backgroundTreatmentStyle }}
          data-testid="composition-background-renderer"
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
            data-selected={selectedSet.has(node.id) ? "true" : "false"}
            onClick={(e) => {
              if (!editMode) return;
              e.stopPropagation();
              onSelectNodes?.([node.id]);
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
            <NodeVisual
              node={node}
              editMode={editMode}
              textEditing={selectedSet.has(node.id)}
              onEditText={(value) => onEditNodeText?.(node.id, value)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-white/10",
        editMode && "touch-none",
        className
      )}
      style={{
        aspectRatio: minHeightPx == null ? String(aspectRatio) : undefined,
        height: minHeightPx,
        padding: block.safeAreaPaddingPx ?? 12,
      }}
      data-testid="creative-composition-canvas"
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
        if (editMode && event.target === event.currentTarget) onSelectNodes?.([]);
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ ...backgroundStyle, ...backgroundTreatmentStyle }}
        data-testid="composition-background-renderer"
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

      {visibleNodes.map((node) => {
        const selected = selectedSet.has(node.id);
        const box = resolveNodeBox(node);
        return (
          <div
            key={node.id}
            className={cn(
              "absolute",
              editMode && !node.locked && "cursor-move"
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
            data-selected={selected ? "true" : "false"}
            data-locked={node.locked ? "true" : "false"}
            data-group={node.groupId || undefined}
            data-anchor={node.anchor || "top-left"}
            onPointerDown={(e) => onPointerDownNode(e, node, "move")}
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
                translateNodes(block.nodes, ids, dx, dy),
                event.shiftKey
                  ? "Nudged composition items 10 pixels"
                  : "Nudged composition items 1 pixel"
              );
            }}
            role={editMode ? (selected && !node.locked ? "group" : "button") : undefined}
            tabIndex={editMode ? 0 : undefined}
            aria-label={`${node.primitive}${node.locked ? " locked" : ""}`}
          >
            <NodeVisual
              node={node}
              editMode={editMode}
              textEditing={selected}
              onEditText={(value) => onEditNodeText?.(node.id, value)}
            />
          </div>
        );
      })}
      {editMode ? visibleNodes.filter((node) => selectedSet.has(node.id) && !node.locked).map((node) => {
        const box = resolveNodeBox(node);
        const beneath = [...visibleNodes]
          .filter((candidate) => candidate.id !== node.id)
          .filter((candidate) => {
            const candidateBox = resolveNodeBox(candidate);
            const cx = box.left + box.width / 2;
            const cy = box.top + box.height / 2;
            return cx >= candidateBox.left && cx <= candidateBox.left + candidateBox.width && cy >= candidateBox.top && cy <= candidateBox.top + candidateBox.height;
          })
          .sort((left, right) => right.zIndex - left.zIndex)[0];
        return <div key={`selection-${node.id}`} className="pointer-events-none absolute z-[1000] outline outline-1 outline-white/80" style={{ left: `${box.left * 100}%`, top: `${box.top * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%`, transform: node.rotationDeg ? `rotate(${node.rotationDeg}deg)` : undefined }} data-testid={`composition-selection-overlay-${node.id}`}>
          {drag?.id === node.id && drag.mode === "resize" ? <span className="absolute left-0 top-0 -translate-y-full rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white" data-testid="composition-size-feedback">{Math.round(box.width * 100)}% × {Math.round(box.height * 100)}%</span> : null}
          <button type="button" className="pointer-events-auto absolute -top-7 left-0 min-h-6 rounded bg-black/80 px-2 text-[10px] text-white" aria-label={`More actions for ${node.name || node.primitive}`} data-testid={`composition-more-${node.id}`} onClick={() => setContextMenu({ id: node.id, x: box.left * surfaceSize.width, y: box.top * surfaceSize.height })}>•••</button>
          {beneath ? <button type="button" className="pointer-events-auto absolute bottom-1 right-1 min-h-6 rounded bg-black/80 px-1.5 text-[9px] text-white" data-testid={`composition-select-beneath-${node.id}`} onClick={() => onSelectNodes?.([beneath.id])}>Select beneath</button> : null}
          {([ ["nw", "-left-1.5 -top-1.5 cursor-nwse-resize"], ["n", "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize"], ["ne", "-right-1.5 -top-1.5 cursor-nesw-resize"], ["e", "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize"], ["se", "-bottom-1.5 -right-1.5 cursor-nwse-resize"], ["s", "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize"], ["sw", "-bottom-1.5 -left-1.5 cursor-nesw-resize"], ["w", "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize"] ] as const).map(([handle, position]) => <button key={handle} type="button" className={`pointer-events-auto absolute h-6 w-6 rounded-sm border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-[2px] after:border after:border-white/90 after:bg-white ${position}`} data-testid={`composition-resize-${node.id}-${handle}`} aria-label={`Resize ${handle}`} onPointerDown={(event) => onPointerDownNode(event, node, "resize", handle)} />)}
          <button type="button" className="pointer-events-auto absolute -top-8 left-1/2 h-6 w-6 -translate-x-1/2 cursor-grab rounded-full border-0 bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border after:border-white/90 after:bg-[#9cff57]" data-testid={`composition-rotate-${node.id}`} aria-label="Rotate" onPointerDown={(event) => onPointerDownNode(event, node, "rotate")} />
        </div>;
      }) : null}
      {editMode && contextMenu ? (() => {
        const node = block.nodes.find((candidate) => candidate.id === contextMenu.id);
        if (!node) return null;
        const action = (nodes: CreativeCompositionNode[], label: string) => {
          commitNodes(nodes, label);
          setContextMenu(null);
        };
        return <div role="menu" aria-label={`Actions for ${node.name || node.primitive}`} className="absolute z-[1200] min-w-40 rounded-lg border border-white/15 bg-[#0b1019] p-1 text-[10px] text-white shadow-2xl" style={{ left: Math.min(contextMenu.x, Math.max(0, surfaceSize.width - 170)), top: Math.min(contextMenu.y, Math.max(0, surfaceSize.height - 245)) }} data-testid="composition-context-menu">
          {!node.locked ? <>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => { const duplicated = duplicateNodes(block.nodes, [node.id]); action(duplicated.nodes, "Duplicated Element"); onSelectNodes?.(duplicated.newIds); }}>Duplicate</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(bringForward(block.nodes, node.id), "Brought Element forward")}>Bring forward</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(sendBackward(block.nodes, node.id), "Sent Element backward")}>Send backward</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(bringToFront(block.nodes, node.id), "Brought Element to front")}>Bring to front</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(sendToBack(block.nodes, node.id), "Sent Element to back")}>Send to back</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(block.nodes.map((candidate) => candidate.id === node.id ? { ...candidate, visible: false } : candidate), "Hid Element")}>Hide</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(block.nodes.map((candidate) => candidate.id === node.id ? { ...candidate, locked: true } : candidate), "Locked Element")}>Lock</button>
            <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left text-red-300 hover:bg-white/5" onClick={() => { action(deleteNodes(block.nodes, [node.id]), "Deleted Element"); onSelectNodes?.([]); }}>Delete</button>
          </> : <button role="menuitem" type="button" className="block w-full rounded px-2 py-2 text-left hover:bg-white/5" onClick={() => action(block.nodes.map((candidate) => candidate.id === node.id ? { ...candidate, locked: false } : candidate), "Unlocked Element")}>Unlock to edit or delete</button>}
        </div>;
      })() : null}
    </div>
  );
}
