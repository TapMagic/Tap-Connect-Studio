"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, X } from "lucide-react";
import { nanoid } from "nanoid";
import { MediaPicker } from "@/components/media/media-picker";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import { useDeepLeftEditorOptional } from "@/components/fusion/creative-studio/deep-left-editor-context";
import { applyGlyphEffect, ICON_LIBRARY, MATERIAL_PRESETS, MOTION_PRESETS } from "@/lib/fusion/creative-studio/card-creative-system";
import { copyCompositionNodeStyle, hasCompositionStyleClipboard, pasteCompositionNodeStyle } from "@/lib/fusion/creative-studio/composition-clipboard";
import { FONT_CATALOG, fontCssStack } from "@/lib/fusion/creative-studio/fonts/catalog";
import { ensureFontLoaded, ensureGoogleFontFamilyLoaded } from "@/lib/fusion/creative-studio/fonts/load";
import { updateButtonContentNode, updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";
import { bringForward, bringToFront, duplicateNodes, expandSelectionToGroups, groupNodes, sendBackward, sendToBack, ungroupNodes, type CreativeCompositionBlock, type CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { objectFamilyForNode } from "@/lib/fusion/creative-studio/capabilities";
import { appearanceCategoriesForFamily, tuningFieldsForEffect } from "@/lib/fusion/creative-studio/appearance-ia";
import {
  appearanceAdapterTargetForFamily,
  fanOutProps,
  fanOutScopeLabel,
  fanOutWithAdapter,
  groupAppearanceScopes,
  groupMembers,
  inferFanOutCapability,
  mixedValueForCapability,
  resolveActiveGroupId,
  enterGroupContentMode,
  exitGroupContentEditing,
  scaleFontSizes,
  setAllFontSizes,
  textDescendantsInScope,
  triStateForCapability,
} from "@/lib/fusion/creative-studio/group-authority";
import { resolveEditorContext, toolbarChromeForContext } from "@/lib/fusion/creative-studio/editor-context";
import { BADGE_SHAPE_DEFS, badgeShapePreviewStyle, badgeShapeProps } from "@/lib/fusion/creative-studio/badge-shape";
import { effectLayersCss } from "@/lib/fusion/creative-studio/effect-render";
import { type CouponChildRole } from "@/lib/fusion/creative-studio/coupon-composition";
import { ICON_BROWSE_CATEGORIES, ICON_COLLECTION_BROWSE } from "@/lib/fusion/creative-studio/icon-browse";
import { dispatchEditorCommand, focusForDrawerSection, type EditorDrawerSection } from "@/lib/fusion/creative-studio/editor-command-registry";
import { addGradientStop, DEFAULT_GRADIENT, GRADIENT_PRESETS, gradientToCss, normalizeGradient, removeGradientStop, reverseGradient, rotateGradient, mirrorGradient } from "@/lib/fusion/creative-studio/gradient";
import { setRootPageHeightPreservingBounds } from "@/lib/fusion/card/composer-model";
import { resolveContainerParent, selectionTargetLabelForNode } from "@/lib/fusion/creative-studio/selection-mode";
import { applyContainerResize } from "@/lib/fusion/creative-studio/container-resize";
import { buildPhotoColorSources, flattenSolidColors, PHOTO_COLORS_EMPTY_MESSAGE } from "@/lib/fusion/creative-studio/color-palettes";
import {
  aaPreviewStyles,
  applyEffectRecipe,
  applyGlyphMaterial,
  applyMaterialRecipe,
  applySurfaceMaterial,
  EFFECT_RECIPES,
  getMaterialRecipe,
  MATERIAL_UI_CATEGORIES,
  materialPreviewCss,
  materialsByCategory,
} from "@/lib/fusion/creative-studio/material-engine";
import { applyBorderProps, clearBorderProps } from "@/lib/fusion/creative-studio/border";
import { createIconAsset, iconAssetToNodeProps, nativeIconAsset, replaceIconContentProps } from "@/lib/fusion/creative-studio/icon-asset";
import { GradientStudio } from "@/components/fusion/creative-studio/gradient-studio";
import type { GradientModel } from "@/lib/fusion/creative-studio/gradient";

type Focus = "content" | "font" | "color" | "surface" | "media" | "crop" | "adjust" | "frame-appearance" | "action" | "effects" | "appearance" | "animate" | "position" | "layout" | "setup" | "fields" | "gallery" | "resize-policy" | "responsive" | "button-surface" | "button-content" | "button-action" | "button-styles" | "icon-appearance" | "divider-style" | "divider-thickness" | "divider-color" | "divider-appearance" | "map-action" | "text-box" | "more" | "coupon-content" | null;
type SectionFocus = "size" | "surface" | "layout" | "position" | "more" | null;
type RootFocus = "background" | "page-size" | "more" | null;


const RECENT_FONTS_KEY = "tapconnect.recent-fonts";
function readRecentFonts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_FONTS_KEY);
    const parsed = raw ? JSON.parse(raw) as string[] : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 5) : [];
  } catch { return []; }
}
function rememberRecentFont(family: string) {
  if (typeof window === "undefined" || !family.trim()) return;
  const next = [family, ...readRecentFonts().filter((item) => item !== family)].slice(0, 5);
  try { window.localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}
const fieldClass = "mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2 text-xs text-white";
const buttonClass = "min-h-9 rounded border border-white/15 px-2 text-xs hover:border-[#b8ff2c]/60";

/** Display-only hex for `<input type="color">` — never write this coercion into the document. */
function toColorInputValue(raw: unknown, fallback = "#fbbf24"): string {
  const value = String(raw || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
    return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
  }
  return fallback;
}

const BUILT_IN_BUTTON_STYLES: Array<{ id: string; name: string; props: Record<string, unknown> }> = [
  { id: "tapconnect-green-pill", name: "TapConnect Green Pill", props: { presentation: "pill", radius: 999, cornersLinked: true, buttonSurfaceKind: "solid", fill: "#b8ff2c", textColor: "#07100a", labelColor: "#07100a", borderWidth: 0, boxShadow: 14, boxGlow: 0, padding: 12, fontWeight: 750, motionPreset: "none" } },
  { id: "monkey-cage-gold", name: "Monkey Cage Gold Button", props: { presentation: "rounded", radius: 16, cornersLinked: true, buttonSurfaceKind: "gradient", gradientStart: "#7c4a03", gradientEnd: "#facc15", gradientAngle: 120, textColor: "#fff7cc", labelColor: "#fff7cc", borderWidth: 1, borderColor: "#ffe9a3", boxShadow: 20, boxGlow: 8, glowColor: "#facc15", padding: 12 } },
  { id: "neon-call-circle", name: "Neon Call Circle", props: { presentation: "circle", radius: 999, cornersLinked: true, buttonSurfaceKind: "solid", fill: "#07100a", textColor: "#b8ff2c", labelColor: "#b8ff2c", iconColor: "#b8ff2c", borderWidth: 2, borderColor: "#b8ff2c", boxGlow: 24, glowColor: "#b8ff2c", motionPreset: "subtle_pulse" } },
  { id: "glass-directions", name: "Glass Directions Button", props: { presentation: "soft", radius: 22, cornersLinked: true, buttonSurfaceKind: "gradient", gradientStart: "#ffffff4d", gradientEnd: "#ffffff0d", textColor: "#ffffff", labelColor: "#ffffff", borderWidth: 1, borderColor: "#ffffff80", boxShadow: 16, padding: 12 } },
  { id: "high-gloss-claim", name: "High-Gloss Claim Button", props: { presentation: "rounded", radius: 14, cornersLinked: true, buttonSurfaceKind: "gradient", gradientStart: "#f97316", gradientEnd: "#dc2626", textColor: "#ffffff", labelColor: "#ffffff", borderWidth: 1, borderColor: "#ffedd5", boxShadow: 22, shine: true, padding: 12, motionPreset: "shine_sweep" } },
];
const BUTTON_STYLE_KEYS = ["presentation", "radius", "cornersLinked", "radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft", "buttonSurfaceKind", "fill", "gradientStart", "gradientEnd", "gradientAngle", "backgroundImageUrl", "borderWidth", "borderColor", "boxShadow", "boxGlow", "glowColor", "shine", "surfaceOpacity", "fontFamily", "fontSize", "fontWeight", "textColor", "labelColor", "iconColor", "iconSize", "iconPosition", "spacing", "padding", "motionPreset", "motionIntensity", "motionSpeedSeconds", "motionDelaySeconds", "motionPlay", "motionTrigger", "reducedMotionFallback"] as const;

function useDeepLeftPanelHost(
  section: string | null,
  targetLabel: string,
  capabilityLabel: string,
  onSessionClosed?: () => void
) {
  const deepLeft = useDeepLeftEditorOptional();
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const openKeyRef = useRef<string>("");
  useEffect(() => {
    if (!deepLeft) return;
    if (!section) {
      // Closing ownership: only close if THIS host still owns the live edit session.
      // A sibling host may have already opened a different section (Color → Appearance);
      // never closeEdit() over that newer owner.
      const ownedKey = openKeyRef.current;
      if (deepLeft.session.mode === "edit" && ownedKey) {
        const ownedSection = ownedKey.split("|")[0];
        if (deepLeft.session.section === ownedSection) {
          deepLeft.closeEdit();
        }
      }
      openKeyRef.current = "";
      const clear = window.setTimeout(() => setPortalEl(null), 0);
      return () => window.clearTimeout(clear);
    }
    // Rail × / external closeEdit leaves local toolbar focus set. Without this sync,
    // the host re-opens the same section and Close becomes a no-op for the Owner.
    if (deepLeft.session.mode !== "edit" && openKeyRef.current) {
      openKeyRef.current = "";
      setPortalEl(null);
      onSessionClosed?.();
      return;
    }
    const key = `${section}|${targetLabel}|${capabilityLabel}`;
    // One authoritative transition — do not re-open / thrash when already owning this edit.
    if (openKeyRef.current !== key) {
      openKeyRef.current = key;
      deepLeft.openEdit({
        section,
        targetLabel,
        capabilityLabel,
        previousLibraryTool: deepLeft.session.previousLibraryTool || "templates",
        selectionGeneration: deepLeft.session.selectionGeneration,
      });
    }
    // Resolve portal mount without a timer loop — observe once until present.
    const existing = document.getElementById(deepLeft.portalId);
    if (existing) {
      const ready = window.setTimeout(() => setPortalEl(existing), 0);
      return () => window.clearTimeout(ready);
    }
    const observer = new MutationObserver(() => {
      const el = document.getElementById(deepLeft.portalId);
      if (el) {
        setPortalEl(el);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [deepLeft, section, targetLabel, capabilityLabel, onSessionClosed]);
  return { deepLeft, portalEl };
}

function EditorPanelShell({
  testId,
  title,
  targetLabel,
  onClose,
  children,
  portalEl,
}: {
  testId: string;
  title: string;
  targetLabel: string;
  onClose: () => void;
  children: ReactNode;
  portalEl: HTMLElement | null;
}) {
  const body = (
    <section className="flex h-full min-h-0 flex-col text-white" data-editor-placement="left" data-testid={testId} data-deep-left-panel="true">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-[#b8ff2c]">{targetLabel}</p>
          <h2 className="truncate text-sm font-semibold capitalize">{title}</h2>
        </div>
        <button type="button" className="grid h-8 w-8 place-items-center rounded hover:bg-white/10" onClick={onClose} aria-label="Close editor">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </section>
  );
  if (portalEl) return createPortal(body, portalEl);
  // Deep-left host unavailable — still render beside the rail geometry, never as a Card overlay form.
  return <div className="pointer-events-auto fixed bottom-2 left-[6.25rem] top-[13rem] z-[1560] w-[min(20rem,calc(100vw-5rem))] overflow-auto rounded-xl border border-white/15 bg-[#0b1019] p-3 shadow-2xl">{body}</div>;
}

function RootContextualToolbar({
  model,
  onAdvanced,
  onOpenCanvasAssistance,
}: {
  model: CardEditorLiveModel;
  onAdvanced: () => void;
  onOpenCanvasAssistance?: () => void;
}) {
  const [focus, setFocus] = useState<RootFocus>(null);
  const clearFocus = useCallback(() => setFocus(null), []);
  const { portalEl, deepLeft } = useDeepLeftPanelHost(
    focus,
    "Card root",
    focus === "background" ? "Background" : focus || "Editor",
    clearFocus
  );
  const root = model.config.rootComposition;
  if (!root) return null;
  const background = root.background || { kind: "none" as const };
  const setBackground = (next: typeof background, label: string) => model.patchConfig({ rootComposition: { ...root, background: next } }, label);
  const gradient = normalizeGradient(background.gradient || DEFAULT_GRADIENT);
  const setGradient = (next: typeof gradient, label: string) => setBackground({ ...background, kind: "gradient", gradient: next }, label);
  const toggle = (next: Exclude<RootFocus, null>) => setFocus((current) => current === next ? null : next);
  const close = () => {
    setFocus(null);
    deepLeft?.closeEdit();
  };
  useEffect(() => {
    if (!focus) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [focus]);
  const panel = focus ? (
    <EditorPanelShell testId={`contextual-root-${focus}-drawer`} title={`Card root / ${focus}`} targetLabel="Card root" onClose={close} portalEl={portalEl}>
      {focus === "background" ? <div className="space-y-3" data-testid="root-background-editor"><div className="grid grid-cols-3 gap-1">{(["none", "solid", "gradient"] as const).map((kind) => <button key={kind} type="button" aria-pressed={background.kind === kind} className={buttonClass} onClick={() => setBackground(kind === "gradient" ? { ...background, kind, gradient } : kind === "solid" ? { ...background, kind, value: model.config.surfaceColor } : { kind }, `Changed root background to ${kind}`)}>{kind === "none" ? "Transparent" : kind}</button>)}</div><label className="block text-[10px] text-white/65">Solid color<input aria-label="Card root solid color" type="color" value={background.kind === "solid" && background.value?.startsWith("#") ? background.value.slice(0, 7) : model.config.surfaceColor} onChange={(event) => setBackground({ ...background, kind: "solid", value: event.target.value }, "Changed root solid color")} className={fieldClass} /></label><div className="h-12 rounded border border-white/15" style={{ background: gradientToCss(gradient) }} data-testid="gradient-preview" /><div className="grid grid-cols-2 gap-2"><label className="text-[10px]">Type<select aria-label="Card root gradient type" value={gradient.kind} onChange={(event) => setGradient({ ...gradient, kind: event.target.value as "linear" | "radial" | "conic" }, "Changed gradient type")} className={fieldClass}><option value="linear">Linear</option><option value="radial">Radial</option><option value="conic">Conic</option></select></label><label className="text-[10px]">Angle<input aria-label="Card root gradient angle" type="number" min={0} max={360} value={gradient.angle} onChange={(event) => setGradient({ ...gradient, angle: Number(event.target.value) }, "Changed gradient angle")} className={fieldClass} /></label>{gradient.kind !== "linear" ? <><label className="text-[10px]">Center X<input aria-label="Card root gradient center X" type="range" min={0} max={100} value={gradient.centerX} onChange={(event) => setGradient({ ...gradient, centerX: Number(event.target.value) }, "Changed gradient center")} /></label><label className="text-[10px]">Center Y<input aria-label="Card root gradient center Y" type="range" min={0} max={100} value={gradient.centerY} onChange={(event) => setGradient({ ...gradient, centerY: Number(event.target.value) }, "Changed gradient center")} /></label></> : null}{gradient.kind === "radial" ? <label className="text-[10px]">Size<input aria-label="Card root radial gradient size" type="range" min={10} max={100} value={gradient.size ?? 50} onChange={(event) => setGradient({ ...gradient, size: Number(event.target.value) }, "Changed radial size")} /></label> : null}<label className="text-[10px]">Direction<svg viewBox="0 0 64 64" className="mt-1 h-16 w-16 cursor-crosshair rounded-full border border-white/20" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const dx = event.clientX - (rect.left + rect.width / 2); const dy = event.clientY - (rect.top + rect.height / 2); const angle = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360); setGradient({ ...gradient, angle }, "Changed gradient direction visually"); }} data-testid="gradient-direction-control"><circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,.25)" /><line x1="32" y1="32" x2={32 + 26 * Math.sin((gradient.angle * Math.PI) / 180)} y2={32 - 26 * Math.cos((gradient.angle * Math.PI) / 180)} stroke="#b8ff2c" strokeWidth="2" /></svg></label></div><div className="space-y-2">{gradient.stops.map((stop, stopIndex) => <div key={stop.id} className="grid grid-cols-[3rem_1fr_1fr_2rem] items-end gap-1"><input aria-label={`Gradient stop color · ${stop.id}`} type="color" value={stop.color} onChange={(event) => setGradient({ ...gradient, stops: gradient.stops.map((item) => item.id === stop.id ? { ...item, color: event.target.value } : item) }, "Changed gradient stop color")} className="h-9 w-12" data-gradient-stop-index={stopIndex} /><label className="text-[9px]">Position<input aria-label={`Gradient stop position · ${stop.id}`} type="range" min={0} max={100} value={stop.position} onChange={(event) => setGradient({ ...gradient, stops: gradient.stops.map((item) => item.id === stop.id ? { ...item, position: Number(event.target.value) } : item) }, "Moved gradient stop")} data-gradient-stop-index={stopIndex} /></label><label className="text-[9px]">Alpha<input aria-label={`Gradient stop alpha · ${stop.id}`} type="range" min={0} max={100} value={stop.opacity * 100} onChange={(event) => setGradient({ ...gradient, stops: gradient.stops.map((item) => item.id === stop.id ? { ...item, opacity: Number(event.target.value) / 100 } : item) }, "Changed gradient stop opacity")} data-gradient-stop-index={stopIndex} /></label><button type="button" disabled={gradient.stops.length <= 2} className={buttonClass} onClick={() => setGradient(removeGradientStop(gradient, stop.id), "Removed gradient stop")}>×</button></div>)}</div><div className="grid grid-cols-2 gap-2"><button type="button" className={buttonClass} onClick={() => setGradient(addGradientStop(gradient), "Added gradient stop")}>Add stop</button><button type="button" className={buttonClass} onClick={() => setGradient(reverseGradient(gradient), "Reversed gradient")}>Reverse</button><button type="button" className={buttonClass} onClick={() => setGradient(rotateGradient(gradient, 15), "Rotated gradient")}>Rotate</button><button type="button" className={buttonClass} onClick={() => setGradient(mirrorGradient(gradient), "Mirrored gradient")}>Mirror</button></div><label className="block text-[10px]">Background opacity · {Math.round((background.opacity ?? 1) * 100)}%<input aria-label="Card root background opacity" type="range" min={0} max={100} value={(background.opacity ?? 1) * 100} onChange={(event) => setBackground({ ...background, opacity: Number(event.target.value) / 100 }, "Changed Background opacity")} className="w-full" data-testid="root-background-opacity" /></label>
        <div data-testid="root-background-materials">
          <p className="mb-1 text-[9px] font-semibold uppercase text-white/45">Material</p>
          <div className="grid grid-cols-2 gap-2">
            {["matte", "frosted_glass", "brushed_metal", "paper", "linen", "grain", "holographic", "leather"].map((id) => {
              const recipe = getMaterialRecipe(id);
              if (!recipe) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className={buttonClass}
                  data-testid={`root-material-${id}`}
                  style={{ background: materialPreviewCss(recipe) }}
                  onClick={() => {
                    if (recipe.gradient) {
                      const colors = recipe.gradient.match(/#[0-9a-fA-F]{3,8}/g) || ["#111827", "#334155"];
                      const stops = colors.slice(0, 4).map((color, index, arr) => ({
                        id: `bg-${index}`,
                        color: color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color.slice(0, 7),
                        position: Math.round((index / Math.max(1, arr.length - 1)) * 100),
                        opacity: 1,
                      }));
                      setBackground({ kind: "gradient", gradient: normalizeGradient({ ...DEFAULT_GRADIENT, kind: "linear", angle: 135, stops }) }, `Applied ${recipe.label} background`);
                    } else {
                      setBackground({ kind: "solid", value: recipe.fill || "#0f172a" }, `Applied ${recipe.label} background`);
                    }
                  }}
                >
                  {recipe.label}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" className={`${buttonClass} w-full`} onClick={() => setBackground({ kind: "none" }, "Reset Background")}>Reset Background</button></div> : null}
      {focus === "page-size" ? <div className="space-y-3"><label className="block text-[10px]">Exact page height<input type="number" min={240} max={2400} step={8} value={root.pageHeightPx ?? 520} onChange={(event) => model.patchConfig({ rootComposition: setRootPageHeightPreservingBounds(root, Number(event.target.value), root.pageHeightPx ?? 520) }, "Changed exact Card page height")} className={fieldClass} /></label><p className="text-[10px] text-white/45">Page height changes preserve every object’s pixel bounds. Drag the bottom page edge for continuous resizing.</p></div> : null}
      {focus === "more" ? <div className="grid grid-cols-2 gap-2" data-testid="common-more-menu"><button type="button" className={buttonClass} onClick={model.onUndo} disabled={!model.canUndo}>Undo</button><button type="button" className={buttonClass} onClick={() => setBackground({ kind: "none" }, "Reset Background")}>Reset</button><button type="button" className={buttonClass} onClick={() => { close(); onAdvanced(); }}>Advanced</button></div> : null}
    </EditorPanelShell>
  ) : null;
  return <div className="pointer-events-none absolute inset-x-0 top-[9.5rem] z-[1550] flex flex-col items-center" data-testid="card-contextual-object-tools" data-contextual-object="card-root"><div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-[#0b1019]/95 p-1.5 text-white shadow-2xl"><span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#b8ff2c]">Card root</span>{([ ["background", "Background"], ["page-size", "Page size"] ] as const).map(([id, label]) => <button key={id} type="button" data-testid={`contextual-root-${id}`} className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => toggle(id)}>{label}</button>)}<button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" data-testid="contextual-root-guides" onClick={() => onOpenCanvasAssistance?.()}>Guides</button><button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" data-testid="contextual-root-more" onClick={() => toggle("more")} aria-label="More root actions"><MoreHorizontal className="h-4 w-4" /></button></div>{panel}</div>;
}

function SectionContextualToolbar({ model, onAdvanced }: { model: CardEditorLiveModel; onAdvanced: () => void }) {
  const [focus, setFocus] = useState<SectionFocus>(null);
  const sectionId = model.selectedObject?.type === "section" ? model.selectedObject.sectionId : null;
  const section = sectionId ? model.sorted.find((candidate) => candidate.id === sectionId) : null;
  // Never fall back to Card Root when a Section id is missing — Root requires explicit selection.
  if (!section) return null;
  const selection = model.selectionRef;
  const patch = (next: Partial<typeof section>, label: string) => model.patchSelection(selection, next, label);
  const open = (next: Exclude<SectionFocus, null>) => setFocus((current) => current === next ? null : next);
  const fit = () => {
    const padding = section.surfacePaddingPx ?? 24;
    const plane = section.surfaceCoordinateHeightPx ?? Math.max(80, (section.surfaceMinHeightPx ?? 260) - padding * 2);
    const bottom = (section.composition?.nodes ?? []).reduce((max, node) => Math.max(max, (node.y + node.height) * plane), 0);
    patch({ surfaceMinHeightPx: Math.max(32, Math.ceil(bottom + padding * 2)), surfaceExactHeightPx: undefined, surfaceHeightMode: "auto" }, "Fit Section to content");
  };
  return <div className="pointer-events-none absolute inset-x-0 top-[9.5rem] z-[1550] flex flex-col items-center" data-testid="card-contextual-object-tools" data-contextual-object="section">
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-white/15 bg-[#0b1019]/95 p-1.5 text-white shadow-2xl backdrop-blur">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#b8ff2c]">Section</span>
      <input aria-label="Section name" value={section.label || ""} onChange={(event) => patch({ label: event.target.value }, "Renamed Section")} className="h-9 w-32 rounded border border-white/15 bg-transparent px-2 text-xs" />
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("layout")}>Layout</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("size")}>Size</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("surface")}>Appearance</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("position")}>Position/order</button>
      <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" onClick={() => open("more")} aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></button>
    </div>
    {focus ? <section className="pointer-events-auto fixed inset-x-2 bottom-2 max-h-[68vh] overflow-auto rounded-xl border border-white/15 bg-[#0b1019] p-3 text-white shadow-2xl md:inset-x-auto md:bottom-auto md:left-[6.25rem] md:right-auto md:top-[13rem] md:max-h-[calc(100vh-14rem)] md:w-96" data-testid={`contextual-section-${focus}-drawer`} data-editor-placement="left">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Section {focus}</h2><button type="button" className="grid h-8 w-8 place-items-center rounded hover:bg-white/10" onClick={() => setFocus(null)} aria-label={`Close Section ${focus}`}><X className="h-4 w-4" /></button></div>
      {focus === "size" ? <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-white/65">Height behavior<select aria-label="Section height behavior" value={section.surfaceHeightMode || "fixed"} onChange={(event) => patch({ surfaceHeightMode: event.target.value as typeof section.surfaceHeightMode, surfaceExactHeightPx: event.target.value === "fixed" ? section.surfaceExactHeightPx ?? section.surfaceMinHeightPx ?? 260 : undefined }, "Changed Section height behavior")} className={fieldClass}><option value="auto">Auto</option><option value="fixed">Fixed</option></select></label>
        <label className="text-[10px] text-white/65">Exact height<input aria-label="Exact Section height" type="number" min={32} max={2400} value={section.surfaceExactHeightPx ?? section.surfaceMinHeightPx ?? 260} onChange={(event) => patch({ surfaceExactHeightPx: Number(event.target.value), surfaceMinHeightPx: Math.min(Number(event.target.value), section.surfaceMinHeightPx ?? Number(event.target.value)), surfaceHeightMode: "fixed" }, "Changed exact Section height")} className={fieldClass} /></label>
        <label className="text-[10px] text-white/65">Minimum height<input aria-label="Minimum Section height" type="number" min={32} max={2400} value={section.surfaceMinHeightPx ?? 260} onChange={(event) => patch({ surfaceMinHeightPx: Number(event.target.value) }, "Changed minimum Section height")} className={fieldClass} /></label>
        <button type="button" className={buttonClass} onClick={fit}>Fit content</button>
        <button type="button" className={buttonClass} onClick={() => patch({ surfaceMinHeightPx: (section.surfaceMinHeightPx ?? 260) + 24, surfaceExactHeightPx: (section.surfaceExactHeightPx ?? section.surfaceMinHeightPx ?? 260) + 24, surfaceHeightMode: "fixed" }, "Added space below")}>Add space below</button>
        <button type="button" className={buttonClass} onClick={() => patch({ surfaceMinHeightPx: (section.surfaceMinHeightPx ?? 260) + 24, surfaceExactHeightPx: (section.surfaceExactHeightPx ?? section.surfaceMinHeightPx ?? 260) + 24, surfacePaddingPx: (section.surfacePaddingPx ?? 24) + 12, surfaceHeightMode: "fixed" }, "Added space above")}>Add space above</button>
        <button type="button" className={`${buttonClass} col-span-2`} onClick={() => patch({ surfaceMinHeightPx: section.surfaceKind === "blank" ? 64 : 260, surfaceExactHeightPx: section.surfaceKind === "blank" ? 64 : 260, surfaceHeightMode: "fixed" }, "Reset Section height")}>Reset height</button>
      </div> : null}
      {focus === "surface" ? <div className="space-y-3" data-testid="section-surface-controls">
        <div className="grid grid-cols-3 gap-1">{(["transparent", "solid", "gradient", "image", "pattern", "texture"] as const).map((kind) => <button key={kind} type="button" aria-pressed={(section.surfaceBackgroundKind || "solid") === kind} className={buttonClass} onClick={() => patch({ surfaceBackgroundKind: kind }, `Changed Section background to ${kind}`)}>{kind}</button>)}</div>
        <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Solid<input aria-label="Section solid color" type="color" value={section.backgroundColor && section.backgroundColor !== "transparent" ? section.backgroundColor : "#171b24"} onChange={(event) => patch({ backgroundColor: event.target.value, surfaceBackgroundKind: "solid" }, "Changed Section solid background")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Gradient start<input aria-label="Section gradient start" type="color" value={section.surfaceGradientStart || "#171b24"} onChange={(event) => patch({ surfaceGradientStart: event.target.value, surfaceBackgroundKind: "gradient" }, "Changed Section gradient start")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Gradient end<input aria-label="Section gradient end" type="color" value={section.surfaceGradientEnd || "#0b0f19"} onChange={(event) => patch({ surfaceGradientEnd: event.target.value, surfaceBackgroundKind: "gradient" }, "Changed Section gradient end")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Angle<input aria-label="Section gradient angle" type="number" value={section.surfaceGradientAngle ?? 145} onChange={(event) => patch({ surfaceGradientAngle: Number(event.target.value), surfaceBackgroundKind: "gradient" }, "Changed Section gradient angle")} className={fieldClass} /></label></div>
        <MediaPicker label="Section background image" value={section.backgroundImageUrl || ""} valueAssetId={section.backgroundMediaAssetId} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => patch({ backgroundImageUrl: value, surfaceBackgroundKind: "image" }, "Changed Section background image")} onAssetChange={(asset) => patch({ backgroundMediaAssetId: asset?.id }, "Selected Section background Asset")} />
        <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Pattern<select aria-label="Section pattern" value={section.surfacePattern || "diagonal"} onChange={(event) => patch({ surfacePattern: event.target.value as typeof section.surfacePattern, surfaceBackgroundKind: "pattern" }, "Changed Section pattern")} className={fieldClass}><option value="diagonal">Diagonal</option><option value="dots">Dots</option><option value="grid">Grid</option></select></label><label className="text-[10px] text-white/65">Texture<select aria-label="Section texture" value={section.surfaceTexture || "noise"} onChange={(event) => patch({ surfaceTexture: event.target.value as typeof section.surfaceTexture, surfaceBackgroundKind: "texture" }, "Changed Section texture")} className={fieldClass}><option value="noise">Noise</option><option value="paper">Paper</option><option value="fabric">Fabric</option></select></label></div>
        <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Overlay<input aria-label="Section overlay color" type="color" value={section.overlayColor || "#000000"} onChange={(event) => patch({ overlayColor: event.target.value }, "Changed Section overlay color")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Overlay opacity<input aria-label="Section overlay opacity" type="range" min={0} max={100} value={Math.round((section.overlayOpacity ?? 0) * 100)} onChange={(event) => patch({ overlayOpacity: Number(event.target.value) / 100 }, "Changed Section overlay opacity")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Opacity<input aria-label="Section opacity" type="range" min={0} max={100} value={section.opacity ?? 100} onChange={(event) => patch({ opacity: Number(event.target.value) }, "Changed Section opacity")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Border width<input aria-label="Section border width" type="number" min={0} max={24} value={section.surfaceBorderWidthPx ?? 0} onChange={(event) => patch({ surfaceBorderWidthPx: Number(event.target.value) }, "Changed Section border")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Border color<input aria-label="Section border color" type="color" value={section.surfaceBorderColor?.slice(0, 7) || "#ffffff"} onChange={(event) => patch({ surfaceBorderColor: event.target.value }, "Changed Section border color")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Corner radius<input aria-label="Section corner radius" type="number" min={0} max={160} value={section.surfaceRadiusPx ?? 18} onChange={(event) => patch({ surfaceRadiusPx: Number(event.target.value) }, "Changed Section corner radius")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Shadow<select aria-label="Section shadow" value={section.surfaceShadow || "none"} onChange={(event) => patch({ surfaceShadow: event.target.value as typeof section.surfaceShadow }, "Changed Section shadow")} className={fieldClass}>{["none", "soft", "medium", "strong"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] text-white/65">Glow<select aria-label="Section glow" value={section.surfaceGlow || "none"} onChange={(event) => patch({ surfaceGlow: event.target.value as typeof section.surfaceGlow }, "Changed Section glow")} className={fieldClass}>{["none", "soft", "medium", "strong"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      </div> : null}
      {focus === "layout" ? <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Layout<select aria-label="Section layout" value={section.surfaceLayout || "stack"} onChange={(event) => patch({ surfaceLayout: event.target.value as typeof section.surfaceLayout }, "Changed Section layout")} className={fieldClass}>{["free", "stack", "row", "grid"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] text-white/65">Alignment<select aria-label="Section alignment" value={section.surfaceAlign || "stretch"} onChange={(event) => patch({ surfaceAlign: event.target.value as typeof section.surfaceAlign }, "Changed Section alignment")} className={fieldClass}>{["start", "center", "end", "stretch"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] text-white/65">Distribution<select aria-label="Section distribution" value={section.surfaceDistribute || "start"} onChange={(event) => patch({ surfaceDistribute: event.target.value as typeof section.surfaceDistribute }, "Changed Section distribution")} className={fieldClass}>{["start", "center", "end", "between", "around"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[10px] text-white/65">Padding<input aria-label="Section padding" type="number" min={0} max={160} value={section.surfacePaddingPx ?? 24} onChange={(event) => patch({ surfacePaddingPx: Number(event.target.value) }, "Changed Section padding")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Gap<input aria-label="Section gap" type="number" min={0} max={120} value={section.surfaceGapPx ?? 12} onChange={(event) => patch({ surfaceGapPx: Number(event.target.value) }, "Changed Section gap")} className={fieldClass} /></label></div> : null}
      {focus === "position" ? <div className="grid grid-cols-2 gap-2"><button type="button" className={buttonClass} onClick={() => model.moveSectionBy(section.id, -1)}>Move up</button><button type="button" className={buttonClass} onClick={() => model.moveSectionBy(section.id, 1)}>Move down</button><button type="button" className={buttonClass} onClick={() => model.moveSectionTo(section.id, "top")}>Move to top</button><button type="button" className={buttonClass} onClick={() => model.moveSectionTo(section.id, "bottom")}>Move to bottom</button></div> : null}
      {focus === "more" ? <div className="grid grid-cols-2 gap-2" data-testid="common-more-menu"><button type="button" className={buttonClass} onClick={() => model.copySection(section.id)}>Copy</button><button type="button" className={buttonClass} onClick={() => model.duplicateSection(section.id)}>Duplicate</button><button type="button" className={buttonClass} onClick={() => model.toggleSectionLocked(section.id)}>{section.locked ? "Unlock" : "Lock"}</button><button type="button" className={buttonClass} onClick={() => model.toggleSectionVisible(section.id)}>{section.enabled ? "Hide" : "Show"}</button><button type="button" className={buttonClass} onClick={() => model.removeSectionKeepElements?.(section.id)}>Remove Section, keep children</button><button type="button" className={buttonClass} onClick={() => { const inserted = section.insertedPreset; if (inserted) patch({ ...(inserted.section as Partial<typeof section>), composition: { ...section.composition!, nodes: structuredClone(inserted.nodes) } }, "Reset Section to inserted preset"); else patch({ surfaceBackgroundKind: "transparent", backgroundColor: "transparent", surfaceBorderWidthPx: 0, surfaceRadiusPx: 0, surfaceShadow: "none", surfaceGlow: "none", opacity: 100 }, "Reset Section Appearance"); }}>Reset Appearance</button><button type="button" className={`${buttonClass} text-red-200`} onClick={() => model.deleteSection(section.id)}>Delete</button><button type="button" className={buttonClass} onClick={() => { setFocus(null); onAdvanced(); }}>Advanced</button></div> : null}
    </section> : null}
  </div>;
}

export function CardContextualObjectToolbar({ model, onAdvanced, previewMotion = false, reducedMotionSimulation = false, onPreviewMotion, onRestartMotion, onReducedMotionSimulation, onOpenCanvasAssistance }: { model: CardEditorLiveModel | null; onAdvanced: () => void; previewMotion?: boolean; reducedMotionSimulation?: boolean; onPreviewMotion?: () => void; onRestartMotion?: () => void; onReducedMotionSimulation?: (active: boolean) => void; onOpenCanvasAssistance?: () => void }) {
  const [focus, setFocus] = useState<Focus>(null);
  const [fontQuery, setFontQuery] = useState("");
  const [providerFonts, setProviderFonts] = useState<Array<{ family: string; category: string; variants: string[] }>>([]);
  const [fontProviderFallback, setFontProviderFallback] = useState(false);
  const [recentFonts, setRecentFonts] = useState<string[]>(() => readRecentFonts());
  const [iconQuery, setIconQuery] = useState("");
  const [providerIcons, setProviderIcons] = useState<Array<{ collection: string; name: string; canonicalId: string; source: string; svg?: string }>>([]);
  const [iconSearchFallback, setIconSearchFallback] = useState(false);
  const [iconSearchStatus, setIconSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  useEffect(() => {
    if (focus !== "font" || providerFonts.length) return;
    let active = true;
    void fetch("/api/creative/fonts").then((response) => response.json()).then((value: { items?: Array<{ family: string; category: string; variants: string[] }>; fallback?: boolean }) => {
      if (!active) return;
      setProviderFonts(value.items || []);
      setFontProviderFallback(Boolean(value.fallback));
    }).catch(() => { if (active) setFontProviderFallback(true); });
    return () => { active = false; };
  }, [focus, providerFonts.length]);
  const selected = useMemo(() => {
    // Layers/canvas selection IDs are authoritative. An empty list means root or
    // Section selection even if a prior derived selectedObject has not rendered yet.
    const id = model?.selectedCompositionNodeIds?.[0];
    if (!id || !model) return null;
    const section = model.sorted.find((candidate) => candidate.composition?.nodes.some((node) => node.id === id)) ?? null;
    const block = section?.composition ?? model.config.rootComposition ?? null;
    const node = block?.nodes.find((candidate) => candidate.id === id) ?? null;
    return node && block ? { node, block, section } : null;
  }, [model]);
  useEffect(() => {
    const family = objectFamilyForNode(selected?.node || { primitive: "shape", props: {} });
    const iconPickerOpen =
      (focus === "content" && family === "icon") ||
      (focus === "button-content" && family === "button") ||
      (focus === "content" && family === "button");
    if (!iconPickerOpen) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (iconQuery.trim().length < 2) {
        setIconSearchStatus("idle");
        setProviderIcons([]);
        setIconSearchFallback(false);
        return;
      }
      setIconSearchStatus("loading");
      void fetch(`/api/creative/icons?q=${encodeURIComponent(iconQuery)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`iconify ${response.status}`);
          return response.json() as Promise<{ icons?: Array<{ collection: string; name: string; canonicalId: string; source: string; svg?: string }>; fallback?: boolean }>;
        })
        .then((value) => {
          setProviderIcons(value.icons || []);
          setIconSearchFallback(Boolean(value.fallback));
          setIconSearchStatus(value.fallback ? "error" : "ready");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setProviderIcons([]);
          setIconSearchFallback(true);
          setIconSearchStatus("error");
        });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [focus, iconQuery, selected?.node]);
  const selectedNodeId = selected?.node?.id;
  const previousCapabilityRef = useRef<{ nodeId: string | null; focus: Focus }>({ nodeId: null, focus: null });
  useEffect(() => {
    // Retarget same capability; otherwise dismiss. Never fall back to Card Root.
    const timer = window.setTimeout(() => {
      if (!selectedNodeId) {
        setFocus(null);
        previousCapabilityRef.current = { nodeId: null, focus: null };
        return;
      }
      const prior = previousCapabilityRef.current;
      if (prior.nodeId && prior.nodeId !== selectedNodeId) {
        const family = objectFamilyForNode(selected?.node || { primitive: "shape", props: {} });
        const stillSupports =
          prior.focus === "position" ||
          prior.focus === "animate" ||
          prior.focus === "more" ||
          (prior.focus === "color" && (family === "text" || family === "badge")) ||
          (prior.focus === "content" && family === "icon") ||
          (prior.focus === "button-surface" && family === "button") ||
          (prior.focus === "surface" && (family === "badge" || family === "shape"));
        if (!stillSupports) setFocus(null);
      }
      previousCapabilityRef.current = { nodeId: selectedNodeId, focus };
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedNodeId, selected?.node, focus]);
  const deepLeft = useDeepLeftEditorOptional();
  const preTargetLabel = useMemo(() => {
    if (!selected) return { display: "None" };
    return selectionTargetLabelForNode(selected.block.nodes, selected.node);
  }, [selected]);
  const capabilityLabel =
    focus === "color" ? "Color"
      : focus === "button-surface" ? "Surface"
      : focus === "font" ? "Typography"
      : focus === "content" && objectFamilyForNode(selected?.node || { primitive: "shape", props: {} }) === "icon" ? "Change Icon"
      : focus === "surface" || focus === "appearance" || focus === "effects" ? "Appearance"
      : focus || "Editor";
  const clearObjectFocus = useCallback(() => setFocus(null), []);
  const { portalEl } = useDeepLeftPanelHost(
    selected ? focus : null,
    preTargetLabel.display,
    capabilityLabel,
    clearObjectFocus
  );
  useEffect(() => {
    if (!focus) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFocus(null);
        deepLeft?.closeEdit();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-testid="contextual-${focus}-drawer"]`)) return;
      if (target.closest('[data-testid="deep-left-edit-drawer"]')) return;
      if (target.closest('[data-testid="card-contextual-object-tools"]')) return;
      // Canvas object hits use data-composition-node (not data-composition-node-id).
      // Selecting/moving objects must not dismiss the deep-left editor.
      if (target.closest("[data-composition-node], [data-testid='card-root-canvas'], [data-testid='creative-composition-canvas']")) return;
      if (target.closest('[data-testid="card-creative-context-drawer"]')) return;
      if (target.closest('[data-testid="card-preview-phone"]')) return;
      setFocus(null);
      deepLeft?.closeEdit();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [focus, deepLeft]);
  if (!model) return null;
  if (!selected) {
    if (model.selectedObject?.type === "section") {
      return <SectionContextualToolbar model={model} onAdvanced={onAdvanced} />;
    }
    if (model.explicitCardRootSelected) {
      return <RootContextualToolbar model={model} onAdvanced={onAdvanced} onOpenCanvasAssistance={onOpenCanvasAssistance} />;
    }
    return null;
  }
  const { node, block, section } = selected;
  const isText = node.primitive === "text";
  const isButton = node.primitive === "button";
  const componentKind = String(node.props.componentKind || "");
  const objectFamily = objectFamilyForNode(node);
  const isComponent = Boolean(componentKind);
  const isImage = !isComponent && (node.primitive === "image" || node.primitive === "frame");
  const isBadge = String(node.props.elementKind || "") === "badge";
  // Component parents (Container/Form/…) must not inherit Text glyph toolbar even if
  // a legacy insert path left primitive === "text".
  const isTextLike = (isText || isBadge) && !["container", "form", "gallery", "coupon", "ticket", "map"].includes(objectFamily);
  const replace = (next: CreativeCompositionBlock, label: string) => {
    if (section) model.patchSection(section.id, { composition: next }, label);
    else model.patchConfig({ rootComposition: next }, label);
  };
  const selection = model.selectionRef;
  const patch = (next: Partial<CreativeCompositionNode>, label: string) => model.patchSelection(selection, next, label);
  const selectedIds = model.selectedCompositionNodeIds ?? [node.id];
  const editorContext = resolveEditorContext({
    nodes: block.nodes,
    selectedIds,
    explicitCardRootSelected: model.explicitCardRootSelected,
    selectedCapability: focus,
  });
  const toolbarChrome = toolbarChromeForContext(editorContext);
  const groupParent = editorContext.selectionMode === "GROUP_PARENT";
  const groupContentAwaiting = toolbarChrome === "group_content_awaiting";
  const activeGroupId = editorContext.groupId || resolveActiveGroupId(block.nodes, selectedIds);
  const colorMixed = mixedValueForCapability(block.nodes, selectedIds, "text_color");
  const fillMixed = groupParent ? mixedValueForCapability(block.nodes, selectedIds, "fill") : { kind: "empty" as const };
  const fontMixed = groupParent ? mixedValueForCapability(block.nodes, selectedIds, "font") : { kind: "empty" as const };
  const fontSizeMixed = groupParent ? mixedValueForCapability(block.nodes, selectedIds, "font_size") : { kind: "empty" as const };
  const boldState = groupParent ? triStateForCapability(block.nodes, selectedIds, "font_weight") : "empty";
  const italicState = groupParent ? triStateForCapability(block.nodes, selectedIds, "italic") : "empty";
  const underlineState = groupParent ? triStateForCapability(block.nodes, selectedIds, "underline") : "empty";
  const groupHasText = groupParent && textDescendantsInScope(block.nodes, selectedIds).length > 0;
  const appearanceScopes = groupParent ? groupAppearanceScopes(block.nodes, selectedIds) : [];
  const patchProps = (next: Record<string, unknown>, label: string) => {
    // Group capability fan-out — per-descendant adapters, never primary-node clone.
    if (groupParent) {
      const capability = inferFanOutCapability(next);
      if (capability) {
        if (capability === "effect" && typeof next.effectPreset === "string") {
          const effectId = next.effectPreset;
          const result = fanOutWithAdapter(block.nodes, selectedIds, "effect", (member, family) =>
            applyEffectRecipe(appearanceAdapterTargetForFamily(family), effectId, member.props)
          );
          replace({ ...block, nodes: result.nodes }, label);
          return;
        }
        if (capability === "material" && (typeof next.materialPreset === "string" || next.materialPreset === null)) {
          const materialId = (next.materialPreset as string | null) ?? null;
          const result = fanOutWithAdapter(block.nodes, selectedIds, "material", (member, family) => {
            const target = appearanceAdapterTargetForFamily(family);
            if (target === "glyph") return applyGlyphMaterial(member.props, materialId);
            return applySurfaceMaterial(member.props, materialId, {
              asButtonSurface: family === "button",
              preserveTextColor: family === "button",
            });
          });
          replace({ ...block, nodes: result.nodes }, label);
          return;
        }
        const result = fanOutProps(block.nodes, selectedIds, capability, next);
        replace({ ...block, nodes: result.nodes }, label);
        return;
      }
    }
    let props = { ...node.props, ...next };
    if (isButton && typeof next.label === "string") props = updateButtonLabel(props, next.label, node.id);
    if (isButton) {
      const textPatch: Record<string, unknown> = {};
      for (const key of ["fontFamily", "fontSize", "fontWeight", "letterSpacingEm", "textTransform", "textAlign"] as const) {
        if (next[key] !== undefined) textPatch[key] = next[key];
      }
      if (next.labelColor !== undefined || next.textColor !== undefined) textPatch.color = next.labelColor ?? next.textColor;
      if (Object.keys(textPatch).length) props = updateButtonContentNode(props, "label", { props: textPatch }, node.id);
    }
    // Coupon contentComposition child sync when editing coupon parent text mirrors
    if (objectFamily === "coupon" && props.contentComposition && typeof props.contentComposition === "object") {
      const content = props.contentComposition as { nodes?: typeof block.nodes };
      if (Array.isArray(content.nodes)) {
        const roleMap: Record<string, string> = {
          offerValue: "offer",
          headline: "headline",
          code: "code",
          terms: "terms",
          description: "description",
          artworkSrc: "image",
        };
        let nodes = content.nodes;
        for (const [propKey, role] of Object.entries(roleMap)) {
          if (next[propKey] === undefined) continue;
          nodes = nodes.map((child) => {
            const childRole = String(child.props.componentContentRole || child.props.presetChildRole || "");
            if (childRole !== role && !(role === "code" && childRole === "stub_code")) return child;
            if (role === "image") return { ...child, props: { ...child.props, src: next[propKey] } };
            return { ...child, props: { ...child.props, text: next[propKey] } };
          });
        }
        props = { ...props, contentComposition: { ...content, nodes } };
      }
    }
    patch({ props }, label);
  };
  const duplicate = () => {
    const ids = groupParent || selectedIds.length > 1
      ? expandSelectionToGroups(block.nodes, selectedIds)
      : [node.id];
    const result = duplicateNodes(block.nodes, ids);
    replace({ ...block, nodes: result.nodes }, groupParent ? "Duplicated Group" : selectedIds.length > 1 ? "Duplicated Elements" : "Duplicated Element");
    model.setSelectedCompositionNodeIds?.(result.newIds);
  };
  const remove = () => {
    if (node.locked) return model.notify?.("Unlock this Element before deleting it.");
    replace({ ...block, nodes: block.nodes.filter((candidate) => candidate.id !== node.id) }, "Deleted Element");
    if (model.clearStudioSelection) model.clearStudioSelection();
    else model.setSelectedCompositionNodeIds?.([]);
  };
  const open = (next: Exclude<Focus, null>) => {
    if (next === "font") setRecentFonts(readRecentFonts());
    // Toggle-close only when the Owner re-clicks the same door. Switching doors
    // (Color → Appearance) must always land open on the destination.
    setFocus((current) => (current === next ? null : next));
  };
  /** Shape door must open even when re-selected from a closed toggle race. */
  const openBadgeShape = () => {
    setFocus("surface");
    deepLeft?.setNestedPage("overview");
  };
  /** Force a drawer open (no toggle-close) — used when a control promises navigation. */
  const openForced = (next: Exclude<Focus, null>) => {
    if (next === "font") setRecentFonts(readRecentFonts());
    setFocus(next);
  };
  const closeFocus = () => {
    setFocus(null);
    deepLeft?.closeEdit();
  };
  const openCommand = (commandId: string, preferred?: Exclude<Focus, null>) => dispatchEditorCommand(commandId, objectFamily, (section: EditorDrawerSection) => {
    const mapped = preferred || focusForDrawerSection(section, objectFamily);
    if (commandId === "appearance.open" || commandId === "material.open" || mapped === "effects" || mapped === "appearance") {
      deepLeft?.setNestedPage("overview");
      openForced("appearance");
      return;
    }
    open(mapped as Exclude<Focus, null>);
  });
  const colors = [model.config.textColor, model.config.accentColor, model.config.surfaceColor, "#ffffff", "#111827", "#f43f5e", "#22d3ee", "#b8ff2c"].filter(Boolean);
  const fonts = FONT_CATALOG.filter((font) => `${font.family} ${font.category}`.toLowerCase().includes(fontQuery.toLowerCase()));
  const remoteFonts = providerFonts.filter((font) => `${font.family} ${font.category}`.toLowerCase().includes(fontQuery.toLowerCase()) && !FONT_CATALOG.some((local) => local.family === font.family)).slice(0, 160);
  const applyButtonStyle = (props: Record<string, unknown>, name: string) => patchProps(props, `Applied Button style ${name}`);
  const saveButtonStyle = () => {
    const props = Object.fromEntries(BUTTON_STYLE_KEYS.filter((key) => node.props[key] !== undefined).map((key) => [key, structuredClone(node.props[key])]));
    const preset = { id: `button-style-${nanoid(7)}`, name: `${String(node.props.label || "Button")} style`, props };
    model.patchConfig({ buttonStylePresets: [...(model.config.buttonStylePresets ?? []), preset] }, `Saved Button style ${preset.name}`);
  };
  const containerParent = resolveContainerParent(block.nodes, node.id);
  const targetLabel = preTargetLabel;
  const iconRenderMode = String(
    node.props.iconRenderMode ||
      (node.props.strokeBehavior && !node.props.fillBehavior
        ? "stroke"
        : node.props.fillBehavior
          ? "fill"
          : "fill")
  );

  return <div className="pointer-events-none absolute inset-x-0 top-[9.5rem] z-[1550] flex flex-col items-center" data-testid="card-contextual-object-tools" data-selection-target={groupParent ? "Group" : groupContentAwaiting ? "Group › contents" : targetLabel.display} data-selection-mode={editorContext.selectionMode} data-toolbar-chrome={toolbarChrome}>
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-white/15 bg-[#0b1019]/95 p-1.5 text-white shadow-2xl backdrop-blur">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[#b8ff2c]" data-testid="contextual-target-label">{groupParent ? "Group" : groupContentAwaiting ? "Group" : selectedIds.length > 1 ? "Multi" : targetLabel.display}</span>
      {toolbarChrome === "multi" ? (
        <button
          type="button"
          className="min-h-9 rounded px-2 text-xs hover:bg-white/10"
          data-testid="contextual-multi-group"
          onClick={() => {
            const next = groupNodes(block.nodes, selectedIds);
            replace({ ...block, nodes: next }, "Grouped Elements");
            model.setSelectedCompositionNodeIds?.(expandSelectionToGroups(next, selectedIds));
          }}
        >
          Group
        </button>
      ) : null}
      {toolbarChrome === "group_parent" ? <>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" data-testid="contextual-group-edit-contents" onClick={() => {
          if (!activeGroupId) return;
          // Enter content scope with NO child selected — Owner chooses the child.
          const members = groupMembers(block.nodes, activeGroupId);
          replace({ ...block, nodes: enterGroupContentMode(block.nodes, activeGroupId) }, "Entered Group Edit contents");
          model.setSelectedCompositionNodeIds?.(members.map((member) => member.id));
          model.notify?.("Click a Group child to edit. Finish returns to the Group.");
        }}>Edit contents</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" data-testid="contextual-group-appearance" onClick={() => { deepLeft?.setNestedPage("overview"); openForced("appearance"); }}>Appearance</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" data-testid="contextual-group-ungroup" onClick={() => {
          if (!activeGroupId) return;
          const memberIds = groupMembers(block.nodes, activeGroupId).map((member) => member.id);
          replace({ ...block, nodes: ungroupNodes(block.nodes, activeGroupId) }, "Ungrouped Elements");
          model.setSelectedCompositionNodeIds?.(memberIds);
          model.notify?.(null);
        }}>Ungroup</button>
        {groupHasText ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" data-testid="contextual-group-magic-write" onClick={() => {
          document.querySelector<HTMLElement>('[data-testid="card-creative-tool-text"]')?.click();
          window.setTimeout(() => {
            document.querySelector<HTMLElement>('[data-testid="magic-write-open"]')?.click();
          }, 0);
        }}>Magic Write</button> : null}
        {groupHasText ? <>
          <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("font")} data-testid="contextual-group-font">{fontMixed.kind === "mixed" ? "Mixed" : String((fontMixed.kind === "uniform" ? fontMixed.value : node.props.fontFamily) || "Font").split(",")[0]}</button>
          <span className="inline-flex items-center gap-0.5" data-testid="contextual-group-font-size-controls">
            <input
              aria-label="Set all font sizes"
              type="text"
              inputMode="numeric"
              placeholder="Mixed"
              value={fontSizeMixed.kind === "mixed" ? "" : String(fontSizeMixed.kind === "uniform" ? fontSizeMixed.value : node.props.fontSize || 18)}
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (!raw || raw.toLowerCase() === "mixed") return;
                const size = Number(raw);
                if (!Number.isFinite(size)) return;
                const result = setAllFontSizes(block.nodes, selectedIds, size);
                replace({ ...block, nodes: result.nodes }, "Set all Group text sizes");
              }}
              className="h-9 w-14 rounded border border-white/15 bg-transparent px-1 text-xs"
              data-testid="contextual-group-font-size"
              title="Set all — enters one size for every compatible Text"
            />
            {fontSizeMixed.kind === "mixed" ? <span className="px-1 text-[9px] text-white/50" data-testid="contextual-group-font-size-mixed">Mixed</span> : null}
            <button type="button" className="h-9 rounded px-1.5 text-[10px] hover:bg-white/10" data-testid="contextual-group-font-scale-down" title="Scale sizes −10% (preserves hierarchy)" onClick={() => { const result = scaleFontSizes(block.nodes, selectedIds, 0.9); replace({ ...block, nodes: result.nodes }, "Scaled Group text sizes −10%"); }}>−10%</button>
            <button type="button" className="h-9 rounded px-1.5 text-[10px] hover:bg-white/10" data-testid="contextual-group-font-scale-up" title="Scale sizes +10% (preserves hierarchy)" onClick={() => { const result = scaleFontSizes(block.nodes, selectedIds, 1.1); replace({ ...block, nodes: result.nodes }, "Scaled Group text sizes +10%"); }}>+10%</button>
          </span>
          <button type="button" aria-pressed={boldState === "on"} data-state={boldState} className="h-9 w-9 rounded font-bold hover:bg-white/10 data-[state=mixed]:bg-white/10" data-testid="contextual-group-bold" onClick={() => patchProps({ fontWeight: boldState === "on" ? 400 : 800 }, "Changed Group text weight")}>B</button>
          <button type="button" aria-pressed={italicState === "on"} data-state={italicState} className="h-9 w-9 rounded italic hover:bg-white/10 data-[state=mixed]:bg-white/10" data-testid="contextual-group-italic" onClick={() => patchProps({ italic: italicState !== "on" }, "Changed Group text italic")}>I</button>
          <button type="button" aria-pressed={underlineState === "on"} data-state={underlineState} className="h-9 w-9 rounded underline hover:bg-white/10 data-[state=mixed]:bg-white/10" data-testid="contextual-group-underline" onClick={() => patchProps({ underline: underlineState !== "on" }, "Changed Group text underline")}>U</button>
          <button type="button" className="grid h-9 min-w-[2rem] place-items-center rounded border border-white/20 px-1.5 text-[13px] font-bold" data-testid="contextual-group-color" title="Group text color" onClick={() => open("color")}>Aa</button>
        </> : null}
      </> : null}
      {(toolbarChrome === "group_content_awaiting" || editorContext.selectionMode === "GROUP_CONTENT") && activeGroupId ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" data-testid="contextual-group-finish" onClick={() => { replace({ ...block, nodes: exitGroupContentEditing(block.nodes, activeGroupId) }, "Finished editing Group contents"); model.setSelectedCompositionNodeIds?.(groupMembers(block.nodes, activeGroupId).map((member) => member.id)); model.notify?.(null); }}>Finish editing</button> : null}
      {groupContentAwaiting ? <span className="px-2 text-[10px] text-white/55" data-testid="contextual-group-awaiting-child">Click a child to edit</span> : null}
      {toolbarChrome === "object" && isButton ? <>
        <button type="button" aria-pressed={node.props.contentEditing === true} className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => { patchProps({ contentEditing: node.props.contentEditing !== true, selectionMode: node.props.contentEditing === true ? "parent" : "content" }, node.props.contentEditing === true ? "Finished editing contents" : "Entered Edit contents"); open("button-content"); }} data-testid="contextual-button-content">{node.props.contentEditing === true ? "Finish editing contents" : "Edit contents"}</button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center overflow-hidden rounded border border-white/20"
          style={{ background: materialPreviewCss({ id: "swatch", label: "", category: "basic", gradient: String(node.props.buttonSurfaceKind === "gradient" ? `linear-gradient(${Number(node.props.gradientAngle || 90)}deg,${node.props.gradientStart || "#22c55e"},${node.props.gradientEnd || "#06b6d4"})` : node.props.gradientFill || ""), fill: String(node.props.fill || "#22c55e") }) }}
          title="Button Appearance → Fill"
          aria-label="Button Appearance Fill"
          data-testid="contextual-button-surface-swatch"
          onClick={() => { deepLeft?.setNestedPage("solid-colors"); openForced("appearance"); }}
        />
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => { deepLeft?.setNestedPage("overview"); openForced("appearance"); }} data-testid="contextual-button-appearance">Appearance</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("button-action")} data-testid="contextual-button-action">Action</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("animate")} data-testid="contextual-button-motion">Motion</button>
      </> : toolbarChrome === "object" && isTextLike ? <>
        {isBadge ? <>
          <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={openBadgeShape} data-testid="contextual-badge-shape">Shape</button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center overflow-hidden rounded border border-white/20"
            style={{ background: materialPreviewCss({ id: "swatch", label: "", category: "basic", gradient: String(node.props.gradientFill || ""), fill: String(node.props.fill || "#334155") }) }}
            title="Badge surface appearance"
            aria-label="Badge surface appearance"
            data-testid="contextual-badge-surface-swatch"
            onClick={() => { deepLeft?.setNestedPage("solid-colors"); openForced("appearance"); }}
          />
          <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => { deepLeft?.setNestedPage("overview"); openForced("appearance"); }} data-testid="contextual-badge-appearance">Appearance</button>
        </> : null}
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("content")} data-testid="contextual-content">{isBadge ? "Wording" : "Edit"}</button>
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("font")} data-testid="contextual-font">{String(node.props.fontFamily || "Font").split(",")[0]}</button>
        <input aria-label="Font size" type="number" min={6} max={320} value={Number(node.props.fontSize || 18)} onChange={(event) => patchProps({ fontSize: Number(event.target.value) }, "Changed text size")} className="h-9 w-16 rounded border border-white/15 bg-transparent px-2 text-xs" data-testid="contextual-font-size" />
        <button type="button" aria-pressed={Number(node.props.fontWeight || 600) >= 700} className="h-9 w-9 rounded font-bold hover:bg-white/10" onClick={() => patchProps({ fontWeight: Number(node.props.fontWeight || 600) >= 700 ? 400 : 800 }, "Changed text weight")}>B</button>
        <button type="button" aria-pressed={node.props.italic === true} className="h-9 w-9 rounded italic hover:bg-white/10" onClick={() => patchProps({ italic: node.props.italic !== true }, "Changed text italic")}>I</button>
        <button type="button" aria-pressed={node.props.underline === true} className="h-9 w-9 rounded underline hover:bg-white/10" onClick={() => patchProps({ underline: node.props.underline !== true }, "Changed text underline")}>U</button>
        {(() => {
          const aa = aaPreviewStyles(node.props);
          const glyphIsGradient = String(node.props.gradientFill || "").includes("gradient");
          const boxStyle = {
            background: aa.boxTransparent
              ? "repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%) 50% / 8px 8px"
              : aa.boxBackground,
          } as const;
          return (
            <span className="inline-flex h-9 overflow-hidden rounded border border-white/20" data-testid="contextual-aa">
              <button
                type="button"
                className="grid h-9 min-w-[2rem] place-items-center px-1.5 text-[13px] font-bold leading-none"
                style={boxStyle}
                title="Edit text color"
                aria-label="Edit text color"
                data-testid="contextual-color"
                onClick={() => open("color")}
              >
                <span
                  style={
                    glyphIsGradient
                      ? { backgroundImage: aa.glyphBackground, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }
                      : { color: aa.glyphColor }
                  }
                >
                  Aa
                </span>
              </button>
              <button
                type="button"
                className="h-9 w-4 border-l border-white/20"
                style={boxStyle}
                title="Edit text box appearance"
                aria-label="Edit text box appearance"
                data-testid="contextual-aa-box"
                onClick={() => open("text-box")}
              />
            </span>
          );
        })()}
        {!isBadge ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => { deepLeft?.setNestedPage("overview"); openForced("appearance"); }} data-testid="contextual-text-appearance">Appearance</button> : null}
        <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("action")} data-testid="contextual-action">Action</button>
      </> : toolbarChrome === "object" && objectFamily === "icon" ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("icon.open")} data-testid="contextual-icon-picker">Change Icon</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("icon.appearance")} data-testid="contextual-icon-appearance">Appearance</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("action")} data-testid="contextual-action">Action</button></> : toolbarChrome === "object" && objectFamily === "divider" ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("divider.style")} data-testid="contextual-divider-style">Style</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("divider.thickness")} data-testid="contextual-divider-thickness">Thickness</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("divider.color")} data-testid="contextual-divider-color">Color</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("divider.appearance")} data-testid="contextual-divider-appearance">Appearance</button></> : toolbarChrome === "object" && objectFamily === "map" ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("map.setup")} data-testid="contextual-map-setup">Setup</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("map.action")} data-testid="contextual-map-action">Action</button></> : toolbarChrome === "object" && objectFamily === "gallery" ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("gallery.edit")}>Edit gallery</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("layout.open")}>Layout</button></> : toolbarChrome === "object" && objectFamily === "form" ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("form.editFields")}>Edit fields</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("layout.open")}>Layout</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("behavior.open")}>Behavior</button></> : toolbarChrome === "object" && (objectFamily === "coupon" || objectFamily === "ticket") ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("component.editChildren")}>Edit contents</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("setup.open")}>Setup / Behavior</button></> : toolbarChrome === "object" && objectFamily === "container" ? <><button type="button" aria-pressed={node.props.contentEditing === true} className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => { patchProps({ contentEditing: node.props.contentEditing !== true, selectionMode: node.props.contentEditing === true ? "parent" : "content" }, node.props.contentEditing === true ? "Finished editing contents" : "Entered Edit contents"); open("content"); }} data-testid="contextual-container-content">{node.props.contentEditing === true ? "Finish editing contents" : "Edit contents"}</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("layout.open")}>Layout</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("size.open")}>Size</button><button
          type="button"
          className="grid h-9 w-9 place-items-center overflow-hidden rounded border border-white/20"
          style={{ background: materialPreviewCss({ id: "swatch", label: "", category: "basic", gradient: String(node.props.gradientFill || ""), fill: String(node.props.fill || "#111827") }) }}
          title="Container surface appearance"
          aria-label="Container surface appearance"
          data-testid="contextual-container-surface-swatch"
          onClick={() => { deepLeft?.setNestedPage("overview"); openForced("appearance"); }}
        /><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("resizePolicy.open")} data-testid="contextual-container-resize-policy">Resize behavior</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => openCommand("responsive.open")}>Responsive</button></> : null}
      {toolbarChrome === "object" && isImage ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("media")} data-testid="contextual-replace-media">{String(node.props.src || node.props.mediaSrc || "") ? "Replace" : "Choose media"}</button> : null}
      {toolbarChrome === "object" && !isButton && !isImage && objectFamily !== "icon" && objectFamily !== "divider" && !isTextLike ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => { deepLeft?.setNestedPage("overview"); openCommand("appearance.open"); }} data-testid="contextual-appearance">Appearance</button>
      <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("animate")} data-testid="contextual-animate">Motion</button></> : null}
      {toolbarChrome === "object" && (objectFamily === "divider" || isTextLike) ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("animate")} data-testid="contextual-animate">Motion</button> : null}
      {toolbarChrome === "object" && objectFamily === "icon" ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("animate")} data-testid="contextual-animate">Motion</button> : null}
      {toolbarChrome === "object" && isImage ? <><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("crop")} data-testid="contextual-crop-fit">Crop / Fit</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("adjust")} data-testid="contextual-adjust">Adjust</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("frame-appearance")} data-testid="contextual-frame-appearance">Appearance</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("action")} data-testid="contextual-action">Action</button><button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("animate")}>Motion</button></> : null}
      {toolbarChrome === "group_parent" || toolbarChrome === "object" || toolbarChrome === "multi" ? <button type="button" className="min-h-9 rounded px-2 text-xs hover:bg-white/10" onClick={() => open("position")} data-testid="contextual-position">Position</button> : null}
      {toolbarChrome === "group_parent" || toolbarChrome === "object" || toolbarChrome === "multi" ? <button type="button" className="grid h-9 w-9 place-items-center rounded hover:bg-white/10" onClick={() => open("more")} aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></button> : null}
    </div>
    {focus ? <EditorPanelShell testId={`contextual-${focus}-drawer`} title={`${targetLabel.display} / ${capabilityLabel === "Editor" ? (focus === "text-box" ? "Text Box" : focus) : capabilityLabel}`} targetLabel={targetLabel.display} onClose={closeFocus} portalEl={portalEl}>
      <p className="mb-2 text-[9px] text-white/45" data-testid="drawer-target-label">{targetLabel.display}{node.locked ? " · Locked" : ""}{node.visible === false ? " · Hidden" : ""}</p>
      <div data-testid-editor-family={objectFamily}>
      {focus === "content" ? objectFamily === "icon" ? <div className="space-y-3" data-testid="icon-provider-controls"><input autoFocus value={iconQuery} onChange={(event) => { setIconQuery(event.target.value); if (event.target.value.trim().length >= 2) setIconSearchStatus("loading"); }} placeholder="Search Iconify · Lucide · Tabler · Phosphor · Remix · Material Symbols" className={fieldClass} data-testid="iconify-search" /><p className="text-[9px] text-white/45">Change Icon preserves Element ID, parent, x/y, size, rotation, Action, Motion, a11y, tracking, and Backing Surface.</p><div className="flex flex-wrap gap-1">{["dog", "ticket", "crown", "phone", "gift", "map"].map((term) => <button key={term} type="button" className={buttonClass} onClick={() => { setIconQuery(term); setIconSearchStatus("loading"); }}>{term}</button>)}</div><p className="text-[9px] text-white/40" data-testid="iconify-search-status">{iconSearchStatus === "loading" ? "Searching Iconify…" : iconSearchStatus === "error" ? "Iconify unavailable — Recommended built-ins remain below (not Iconify results)" : iconSearchStatus === "ready" ? `${providerIcons.length} Iconify results` : "Type at least 2 characters to search Iconify"}</p>{iconQuery.trim().length >= 2 ? <><h3 className="text-[10px] font-semibold uppercase text-white/45">Iconify results</h3><div className="grid grid-cols-3 gap-1" data-testid="iconify-results">{providerIcons.map((icon) => { const asset = icon.svg ? createIconAsset({ provider: "iconify", collection: icon.collection, iconName: icon.name, svg: icon.svg, source: icon.source }) : null; return <button key={icon.canonicalId} type="button" className="flex min-h-20 flex-col items-center justify-center gap-1 rounded border border-white/10 px-1 text-[9px]" data-testid={`iconify-result-${icon.canonicalId}`} disabled={!asset} onClick={() => { if (!asset) return; patchProps(replaceIconContentProps(node.props, asset), `Changed Icon to ${icon.canonicalId}`); }}>{asset ? <span className="grid h-9 w-9 place-items-center text-white [&_svg]:h-7 [&_svg]:w-7" aria-hidden dangerouslySetInnerHTML={{ __html: asset.body }} data-icon-svg="true" /> : <span className="text-[9px] text-white/40">SVG unavailable</span>}<span className="line-clamp-2">{icon.name}</span><span className="text-[8px] text-white/40">{icon.collection}</span></button>; })}{iconSearchStatus === "ready" && providerIcons.length === 0 ? <p className="col-span-3 text-[10px] text-white/45">No Iconify results for this search.</p> : null}</div>{iconSearchFallback ? <p className="text-[10px] text-amber-100" data-testid="iconify-fallback-status">Provider error — showing Recommended built-ins as fallback. These are not Iconify search results.</p> : null}</> : null}<h3 className="text-[10px] font-semibold uppercase text-white/45">TapConnect Recommended</h3><div className="grid grid-cols-3 gap-1" data-testid="icon-recommended-results">{ICON_LIBRARY.filter((icon) => !iconQuery.trim() || `${icon.label} ${icon.category}`.toLowerCase().includes(iconQuery.toLowerCase())).map((icon) => { const asset = nativeIconAsset(icon.id); return <button key={icon.id} type="button" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded border border-white/10 px-1 text-[9px]" data-testid={`icon-recommended-${icon.id}`} onClick={() => { if (!asset) return; patchProps(replaceIconContentProps(node.props, asset), `Changed Icon to ${icon.label}`); }}>{asset ? <span className="grid h-8 w-8 place-items-center text-[#b8ff2c] [&_svg]:h-7 [&_svg]:w-7" aria-hidden dangerouslySetInnerHTML={{ __html: asset.body }} /> : null}<span>{icon.label}</span><span className="text-[8px] text-white/40">Recommended</span></button>; })}</div></div> : objectFamily === "button" || objectFamily === "container" || objectFamily === "badge" ? <div className="space-y-2" data-testid="component-content-routing"><p className="rounded border border-[#b8ff2c]/25 bg-[#b8ff2c]/5 p-2 text-[10px]">Content mode exposes the component’s canonical children on canvas and in Layers. Select a child to use the shared Text, Icon, Image, Button, or QR editor.</p>{isBadge ? <label className="block text-xs text-white/70">Wording<textarea autoFocus value={String(node.props.text || "")} onChange={(event) => patchProps({ text: event.target.value, accessibleLabel: event.target.value }, "Edited Badge wording")} className="mt-2 min-h-20 w-full resize-y rounded border border-white/15 bg-transparent p-3 text-sm text-white" data-testid="badge-wording-input" /></label> : null}<button type="button" className={`${buttonClass} w-full`} onClick={() => patchProps({ contentEditing: node.props.contentEditing !== true, selectionMode: node.props.contentEditing === true ? "parent" : "content" }, node.props.contentEditing === true ? "Finished editing contents" : "Entered Edit contents")}>{node.props.contentEditing === true ? "Finish editing contents" : "Edit contents"}</button></div> : <label className="block text-xs text-white/70">Text<textarea autoFocus value={String(node.props.text || "")} onChange={(event) => patchProps({ text: event.target.value }, "Edited Element content")} className="mt-2 min-h-24 w-full resize-y rounded border border-white/15 bg-transparent p-3 text-sm text-white" data-testid="contextual-content-input" /></label> : null}
      {focus === "setup" ? <div className="space-y-3" data-testid={`${objectFamily}-setup-controls`}>
        {objectFamily === "map" ? <><label className="block text-[10px] text-white/65">Workspace location<select value={String(node.props.locationId || "custom")} onChange={(event) => { const location = model.locations?.find((item) => item.id === event.target.value); patchProps(location ? { locationId: location.id, locationName: location.name, address: location.address || "", mapUrl: location.mapUrl || "" } : { locationId: undefined }, "Changed Map location source"); }} className={fieldClass}><option value="custom">Custom address</option>{model.locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="block text-[10px] text-white/65">Location name<input value={String(node.props.locationName || "")} onChange={(event) => patchProps({ locationName: event.target.value }, "Changed Map location name")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Address<input value={String(node.props.address || "")} onChange={(event) => patchProps({ address: event.target.value }, "Changed Map address")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Presentation<select value={String(node.props.mapDisplayMode || "location_card")} onChange={(event) => patchProps({ mapDisplayMode: event.target.value }, "Changed Map presentation")} className={fieldClass}>{["location_card", "map_directions", "static", "interactive", "directions_only", "pin_only", "text_link"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="block text-[10px] text-white/65">Parking / entrance notes<textarea value={String(node.props.locationNotes || "")} onChange={(event) => patchProps({ locationNotes: event.target.value }, "Changed Map location notes")} className="mt-1 min-h-16 w-full rounded border border-white/15 bg-transparent p-2" /></label><button type="button" className={`${buttonClass} w-full`} data-testid="map-setup-test-directions" onClick={() => model.notify?.(`Test Action: directions → ${String(node.props.address || "setup required")}`)}>Test Action</button></> : <><label className="block text-[10px] text-white/65">Behavior<select value={String(node.props.behavior || "draft_only")} onChange={(event) => patchProps({ behavior: event.target.value }, `Changed ${objectFamily} behavior`)} className={fieldClass}><option value="draft_only">Draft only</option><option value="setup_required">Setup required</option><option value="ready">Ready for review</option></select></label><p className="rounded border border-amber-300/25 p-2 text-[10px] text-amber-100">This editor configures draft behavior only. No live submission, redemption, issuance, validation, or QR operation is executed.</p></>}
      </div> : null}
      {focus === "fields" ? <div className="space-y-2" data-testid="form-field-controls">{(Array.isArray(node.props.fields) ? node.props.fields as Array<{ id?: string; label?: string; type?: string; required?: boolean }> : []).map((field, index, fields) => <div key={field.id || index} className="grid grid-cols-[1fr_6rem_2rem] gap-1"><input aria-label={`Field ${index + 1} label`} value={field.label || ""} onChange={(event) => patchProps({ fields: fields.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }, "Changed Form field")} className={fieldClass} /><select aria-label={`Field ${index + 1} type`} value={field.type || "text"} onChange={(event) => patchProps({ fields: fields.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item) }, "Changed Form field type")} className={fieldClass}><option>text</option><option>email</option><option>tel</option><option>textarea</option><option>select</option><option>checkbox</option></select><button type="button" aria-label={`Remove field ${index + 1}`} className={buttonClass} onClick={() => patchProps({ fields: fields.filter((_, itemIndex) => itemIndex !== index) }, "Removed Form field")}>×</button></div>)}<button type="button" className={`${buttonClass} w-full`} onClick={() => { const fields = Array.isArray(node.props.fields) ? node.props.fields : []; patchProps({ fields: [...fields, { id: `field-${nanoid(6)}`, label: "New field", type: "text", required: false }] }, "Added Form field"); }}>Add field</button></div> : null}
      {focus === "gallery" ? <div className="space-y-3" data-testid="gallery-edit-controls"><MediaPicker label="Add gallery media" value="" mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => patchProps({ media: [...(Array.isArray(node.props.media) ? node.props.media : []), value] }, "Added Gallery media")} />{(Array.isArray(node.props.media) ? node.props.media as string[] : []).map((src, index, media) => <div key={`${src}-${index}`} className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[10px]">{index + 1}. {src}</span><button type="button" className={buttonClass} onClick={() => patchProps({ media: media.filter((_, itemIndex) => itemIndex !== index) }, "Removed Gallery media")}>Remove</button></div>)}</div> : null}
      {focus === "layout" ? <div className="grid grid-cols-2 gap-2" data-testid={`${objectFamily}-layout-controls`}><label className="text-[10px] text-white/65">Layout<select value={String(node.props.layout || (objectFamily === "gallery" ? "grid" : "stack"))} onChange={(event) => patchProps({ layout: event.target.value }, `Changed ${objectFamily} layout`)} className={fieldClass}><option>stack</option><option>row</option><option>grid</option><option>free</option><option>carousel</option></select></label><label className="text-[10px] text-white/65">Gap<input type="number" min={0} max={96} value={Number(node.props.gap || 10)} onChange={(event) => patchProps({ gap: Number(event.target.value) }, `Changed ${objectFamily} gap`)} className={fieldClass} /></label><label className="text-[10px] text-white/65">Padding<input type="number" min={0} max={120} value={Number(node.props.padding || 0)} onChange={(event) => patchProps({ padding: Number(event.target.value) }, `Changed ${objectFamily} padding`)} className={fieldClass} /></label><label className="text-[10px] text-white/65">Columns<input type="number" min={1} max={8} value={Number(node.props.columns || 2)} onChange={(event) => patchProps({ columns: Number(event.target.value) }, `Changed ${objectFamily} columns`)} className={fieldClass} /></label></div> : null}
      {focus === "resize-policy" || (focus === "position" && objectFamily === "container") ? <div className="space-y-3" data-testid={`${objectFamily}-resize-policy-controls`}><label className="block text-[10px] text-white/65">Resize behavior<select value={String(node.props.resizePolicy || "reflow")} onChange={(event) => patchProps({ resizePolicy: event.target.value }, `Changed ${objectFamily} resize behavior`)} className={fieldClass} data-testid="container-resize-policy"><option value="reflow">Reflow contents</option><option value="frame">Resize frame only</option><option value="scale">Scale composition</option><option value="fit-content">Fit to content</option></select></label>{objectFamily === "container" ? <button type="button" className={`${buttonClass} w-full`} onClick={() => { const next = applyContainerResize(block.nodes, node.id, { x: node.x, y: node.y, width: node.width, height: node.height }, "fit-content"); replace({ ...block, nodes: next }, "Fit Container to content"); }}>Fit to content now</button> : null}<button type="button" className={`${buttonClass} w-full`} onClick={() => patchProps({ resizePolicy: "reflow" }, `Reset ${objectFamily} resize behavior`)}>Reset resize behavior</button></div> : null}
      {focus === "responsive" ? <div className="space-y-3" data-testid="responsive-controls"><label className="block text-[10px] text-white/65">Responsive behavior<select value={String(node.props.responsiveBehavior || "scale")} onChange={(event) => patchProps({ responsiveBehavior: event.target.value }, "Changed responsive behavior")} className={fieldClass}><option value="scale">Scale</option><option value="reflow">Reflow</option><option value="hide">Hide on small screens</option></select></label><p className="text-[10px] text-white/45">Current transform is stored in normalized root coordinates and persists across viewport previews.</p></div> : null}
      {focus === "surface" ? <div className="space-y-3" data-testid="element-surface-controls">
        {isBadge ? (
          <div data-testid="badge-shape-controls">
            <p className="mb-1 text-[10px] font-semibold uppercase text-white/50">Shape</p>
            <div className="grid grid-cols-3 gap-2">
              {BADGE_SHAPE_DEFS.map((def) => {
                const preview = badgeShapePreviewStyle(def.id, "#94a3b8");
                return (
                  <button
                    key={def.id}
                    type="button"
                    aria-pressed={String(node.props.badgeShape || "") === def.id}
                    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded border border-white/15 px-1 text-[9px] hover:border-[#b8ff2c]/60 aria-pressed:border-[#b8ff2c]"
                    data-testid={`badge-shape-${def.id}`}
                    onClick={() => patchProps(badgeShapeProps(def.id), `Changed Badge shape to ${def.label}`)}
                  >
                    <span aria-hidden style={{ ...preview, display: "block" }} />
                    {def.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-1">{(["transparent", "solid", "gradient"] as const).map((kind) => <button key={kind} type="button" className={buttonClass} data-testid={`surface-fill-${kind}`} onClick={() => patchProps(kind === "transparent" ? { fill: "transparent", gradientFill: undefined, surfaceFillKind: "transparent" } : kind === "solid" ? { fill: String(node.props.fill === "transparent" ? "#171b24" : node.props.fill || "#171b24"), gradientFill: undefined, surfaceFillKind: "solid" } : { gradientFill: String(node.props.gradientFill || "linear-gradient(135deg,#171b24,#0b0f19)"), surfaceFillKind: "gradient" }, `Changed fill to ${kind}`)}>{kind === "transparent" ? "None" : kind}</button>)}</div>
        <div data-testid="border-controls"><p className="mb-1 text-[10px] font-semibold uppercase text-white/50">Border</p><div className="grid grid-cols-5 gap-1">{(["none", "solid", "dashed", "dotted", "double"] as const).map((style) => <button key={style} type="button" className={buttonClass} data-testid={`border-style-${style}`} onClick={() => patchProps(style === "none" ? clearBorderProps(node.props) : applyBorderProps(node.props, { style, width: Math.max(1, Number(node.props.borderWidth || 1)) }), style === "none" ? "Removed border" : `Changed border to ${style}`)}>{style === "none" ? "None" : style}</button>)}</div><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Width<input aria-label="Border width" type="number" min={0} max={24} value={Number(node.props.borderWidth || 0)} onChange={(event) => { const width = Number(event.target.value); patchProps(width <= 0 ? clearBorderProps(node.props) : applyBorderProps(node.props, { width, style: "solid" }), "Changed border width"); }} className={fieldClass} data-testid="border-width" /></label><label className="text-[10px] text-white/65">Color<input aria-label="Border color" type="color" value={String(node.props.borderColor || "#ffffff").slice(0, 7)} onChange={(event) => patchProps(applyBorderProps(node.props, { color: event.target.value, style: "solid", width: Math.max(1, Number(node.props.borderWidth || 1)) }), "Changed border color")} className={fieldClass} /></label></div></div>
        <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Fill<input aria-label="Element fill" type="color" value={String(node.props.fill || "#ef4444").slice(0, 7)} onChange={(event) => patchProps({ fill: event.target.value, surfaceFillKind: "solid" }, "Changed Element fill")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Stroke<input aria-label="Element stroke" type="color" value={String(node.props.stroke || "#ffffff").slice(0, 7)} onChange={(event) => patchProps({ stroke: event.target.value }, "Changed Element stroke")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Stroke width<input aria-label="Element stroke width" type="number" min={0} max={24} value={Number(node.props.strokeWidth || 0)} onChange={(event) => patchProps({ strokeWidth: Number(event.target.value) }, "Changed Element stroke width")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Corner radius<input aria-label="Element corner radius" type="number" min={0} max={999} value={Number(node.props.radius || 999)} onChange={(event) => patchProps({ radius: Number(event.target.value) }, "Changed Element corner radius")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Shadow<input aria-label="Element shadow" type="range" min={0} max={64} value={Number(node.props.boxShadow || node.props.shadow || 0)} onChange={(event) => patchProps({ boxShadow: Number(event.target.value), shadow: Number(event.target.value) }, "Changed Element shadow")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Glow<input aria-label="Element glow" type="range" min={0} max={64} value={Number(node.props.boxGlow || node.props.glow || 0)} onChange={(event) => patchProps({ boxGlow: Number(event.target.value), glow: Number(event.target.value) }, "Changed Element glow")} className={fieldClass} /></label><label className="col-span-2 text-[10px] text-white/65">Opacity<input aria-label="Element opacity" type="range" min={0} max={100} value={Math.round(Number(node.props.opacity ?? 1) * 100)} onChange={(event) => patchProps({ opacity: Number(event.target.value) / 100 }, "Changed Element opacity")} className={fieldClass} /></label></div>
      </div> : null}
      {focus === "media" ? <div className="space-y-3" data-testid="element-media-controls"><p className="text-[10px] text-white/55">Choose from Uploads, Brand, Recent, Favorites, Pexels, Logo.dev, or an Advanced URL in the shared media browser.</p><MediaPicker label={String(node.props.src || node.props.mediaSrc || "") ? "Replace selected media" : "Choose media"} value={String(node.primitive === "frame" ? node.props.mediaSrc || "" : node.props.src || "")} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => patchProps(node.primitive === "frame" ? { mediaSrc: value, sourceMode: "ASSET" } : { src: value, sourceMode: "ASSET" }, node.primitive === "frame" ? "Changed Frame media" : "Changed Image media")} /><label className="block text-[10px] text-white/65">Alternative text<input aria-label="Image alternative text" value={String(node.props.alt || "")} onChange={(event) => patchProps({ alt: event.target.value, decorative: false }, "Changed image alternative text")} className={fieldClass} /></label><label className="flex min-h-9 items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={node.props.decorative === true} onChange={(event) => patchProps({ decorative: event.target.checked, alt: event.target.checked ? "" : node.props.alt }, event.target.checked ? "Marked image decorative" : "Marked image informative")} />Decorative image</label></div> : null}
      {focus === "crop" ? <div className="space-y-3" data-testid="element-crop-fit-controls"><label className="block text-[10px] text-white/65">Fit<select aria-label="Image fit" value={String(node.props.fit || "cover")} onChange={(event) => patchProps({ fit: event.target.value }, "Changed image crop and fit")} className={fieldClass}><option value="cover">Crop to fill</option><option value="contain">Fit inside</option><option value="fill">Stretch</option><option value="original">Original size</option></select></label><label className="block text-[10px] text-white/65">Focal point X<input aria-label="Image focal point X" type="range" min={0} max={100} value={Math.round(Number(node.props.focalX ?? .5) * 100)} onChange={(event) => patchProps({ focalX: Number(event.target.value) / 100 }, "Changed image focal point")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Focal point Y<input aria-label="Image focal point Y" type="range" min={0} max={100} value={Math.round(Number(node.props.focalY ?? .5) * 100)} onChange={(event) => patchProps({ focalY: Number(event.target.value) / 100 }, "Changed image focal point")} className={fieldClass} /></label><button type="button" className={`${buttonClass} w-full`} onClick={() => patchProps({ fit: "cover", focalX: .5, focalY: .5 }, "Reset image crop and fit")}>Reset Crop / Fit</button></div> : null}
      {focus === "adjust" ? <div className="space-y-3" data-testid="element-adjust-controls">{([ ["brightness", "Brightness"], ["contrast", "Contrast"], ["saturation", "Saturation"] ] as const).map(([key, label]) => <label key={key} className="block text-[10px] text-white/65">{label}<input aria-label={label} type="range" min={0} max={200} value={Math.round(Number(node.props[key] ?? 1) * 100)} onChange={(event) => patchProps({ [key]: Number(event.target.value) / 100 }, `Changed image ${key}`)} className={fieldClass} /></label>)}<label className="block text-[10px] text-white/65">Temperature<input aria-label="Temperature" type="range" min={-1} max={1} step={.01} value={Number(node.props.temperature ?? 0)} onChange={(event) => patchProps({ temperature: Number(event.target.value) }, "Changed image temperature")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Blur<input aria-label="Blur" type="range" min={0} max={30} value={Number(node.props.blur ?? 0)} onChange={(event) => patchProps({ blur: Number(event.target.value) }, "Changed image blur")} className={fieldClass} /></label><button type="button" className={`${buttonClass} w-full`} onClick={() => patchProps({ brightness: 1, contrast: 1, saturation: 1, temperature: 0, blur: 0 }, "Reset image adjustments")}>Reset adjustments</button></div> : null}
      {focus === "frame-appearance" ? <div className="grid grid-cols-2 gap-2" data-testid="element-frame-appearance-controls"><label className="text-[10px] text-white/65">Border width<input aria-label="Image border width" type="number" min={0} max={24} value={Number(node.props.outlineWidth || 0)} onChange={(event) => patchProps({ outlineWidth: Number(event.target.value) }, "Changed image frame border")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Border color<input aria-label="Image border color" type="color" value={String(node.props.outlineColor || "#ffffff").slice(0, 7)} onChange={(event) => patchProps({ outlineColor: event.target.value }, "Changed image frame border")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Corners<input aria-label="Image corner radius" type="number" min={0} max={999} value={Number(node.props.outlineRadius || 0)} onChange={(event) => patchProps({ outlineRadius: Number(event.target.value) }, "Changed image frame corners")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Shadow<input aria-label="Image shadow" type="range" min={0} max={64} value={Number(node.props.boxShadow || 0)} onChange={(event) => patchProps({ boxShadow: Number(event.target.value) }, "Changed image frame shadow")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Glow<input aria-label="Image glow" type="range" min={0} max={64} value={Number(node.props.boxGlow || 0)} onChange={(event) => patchProps({ boxGlow: Number(event.target.value) }, "Changed image frame glow")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Opacity<input aria-label="Image opacity" type="range" min={0} max={100} value={Math.round(Number(node.props.opacity ?? 1) * 100)} onChange={(event) => patchProps({ opacity: Number(event.target.value) / 100 }, "Changed image opacity")} className={fieldClass} /></label></div> : null}
      {focus === "action" ? <div className="space-y-3" data-testid="element-action-controls"><p className="text-[10px] text-white/55">The Element stays visually unchanged. Its optional Action is stored independently from Content and Appearance.</p><label className="block text-[10px] text-white/65">Action type<select aria-label="Element action type" value={String(node.props.actionType || "none")} onChange={(event) => patchProps(event.target.value === "none" ? { actionType: undefined, href: undefined } : { actionType: event.target.value }, event.target.value === "none" ? "Removed Element action" : "Changed Element action")} className={fieldClass}><option value="none">None</option>{["website", "call", "text", "email", "directions", "save_contact", "tapsave", "coupon", "ticket", "wallet", "form", "rsvp", "campaign", "experience", "download", "share", "custom"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="block text-[10px] text-white/65">Destination<input aria-label="Element action destination" value={String(node.props.href || "")} onChange={(event) => patchProps({ href: event.target.value }, "Changed Element action destination")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Accessible label<input aria-label="Element accessible label" value={String(node.props.accessibleLabel || node.props.text || node.props.alt || node.name || "")} onChange={(event) => patchProps({ accessibleLabel: event.target.value }, "Changed Element accessible label")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Tracking name<input aria-label="Element tracking name" value={String(node.props.trackingName || "")} onChange={(event) => patchProps({ trackingName: event.target.value }, "Changed Element tracking name")} className={fieldClass} /></label><div className="grid grid-cols-2 gap-2"><button type="button" className={buttonClass} onClick={() => model.notify?.(`Test action: ${String(node.props.actionType || "none")} ${String(node.props.href || "")}`.trim())}>Test action</button><button type="button" className={buttonClass} onClick={() => patchProps({ actionType: undefined, href: undefined }, "Removed Element action")}>Remove action</button></div></div> : null}
      {focus === "font" ? <><div className="mb-2 space-y-1" data-testid="recent-fonts-menu"><p className="text-[9px] uppercase tracking-wider text-white/45">Current · Recent · Brand · Search all</p><button type="button" className={`${buttonClass} w-full text-left`} data-testid="current-font">{String(node.props.fontFamily || "Font").split(",")[0]}</button>{recentFonts.map((family) => <button key={family} type="button" className={`${buttonClass} w-full text-left`} style={{ fontFamily: `"${family}", sans-serif` }} onClick={() => { void ensureGoogleFontFamilyLoaded(family); rememberRecentFont(family); setRecentFonts(readRecentFonts()); patchProps({ fontFamily: `"${family}", sans-serif`, fontProvider: "google-fonts" }, `Changed font to ${family}`); }}>{family}<span className="block text-[8px] text-white/40">Recent</span></button>)}</div><input value={fontQuery} onChange={(event) => setFontQuery(event.target.value)} placeholder="Search Google Fonts" className="mb-2 h-10 w-full rounded border border-white/15 bg-transparent px-3 text-xs" data-testid="contextual-font-search" /><p className="mb-2 text-[9px] text-white/45">Brand · document · recent · favorites · recommended · full Google Fonts catalog{fontProviderFallback ? " · development fallback" : ""}</p><div className="grid grid-cols-2 gap-1">{fonts.map((font) => <button key={font.id} type="button" className="min-h-12 rounded border border-white/10 px-2 text-left text-sm hover:border-[#b8ff2c]/50" style={{ fontFamily: fontCssStack(font) }} onPointerEnter={() => void ensureFontLoaded(font.id)} onFocus={() => void ensureFontLoaded(font.id)} onClick={() => { void ensureFontLoaded(font.id); rememberRecentFont(font.family); setRecentFonts(readRecentFonts()); patchProps({ fontFamily: fontCssStack(font), fontProvider: "google-fonts" }, `Changed font to ${font.family}`); }}>{font.family}<span className="block text-[9px] opacity-55">{font.category}</span></button>)}{remoteFonts.map((font) => <button key={font.family} type="button" className="min-h-12 rounded border border-white/10 px-2 text-left text-sm hover:border-[#b8ff2c]/50" style={{ fontFamily: `"${font.family}", sans-serif` }} onPointerEnter={() => void ensureGoogleFontFamilyLoaded(font.family)} onFocus={() => void ensureGoogleFontFamilyLoaded(font.family)} onClick={() => { void ensureGoogleFontFamilyLoaded(font.family); rememberRecentFont(font.family); setRecentFonts(readRecentFonts()); patchProps({ fontFamily: `"${font.family}", sans-serif`, fontProvider: "google-fonts", fontVariants: font.variants }, `Changed font to ${font.family}`); }}>{font.family}<span className="block text-[9px] opacity-55">{font.category} · Google Fonts</span></button>)}</div></> : null}
      {focus === "button-surface" ? <div className="space-y-3" data-testid="button-surface-controls">
        <div><p className="mb-1 text-[10px] font-semibold uppercase text-white/50">Surface</p><div className="grid grid-cols-3 gap-1">{(["transparent", "solid", "gradient", "image", "pattern", "texture"] as const).map((kind) => <button key={kind} type="button" aria-pressed={String(node.props.buttonSurfaceKind || "solid") === kind} className={buttonClass} onClick={() => patchProps({ buttonSurfaceKind: kind }, `Changed Button surface to ${kind}`)}>{kind}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Fill<input aria-label="Button fill" type="color" value={String(node.props.fill || "#22c55e")} onChange={(event) => patchProps({ fill: event.target.value, buttonSurfaceKind: "solid" }, "Changed Button fill")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Gradient start<input aria-label="Button gradient start" type="color" value={String(node.props.gradientStart || "#22c55e")} onChange={(event) => patchProps({ gradientStart: event.target.value, buttonSurfaceKind: "gradient" }, "Changed Button gradient start")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Gradient end<input aria-label="Button gradient end" type="color" value={String(node.props.gradientEnd || "#a3e635")} onChange={(event) => patchProps({ gradientEnd: event.target.value, buttonSurfaceKind: "gradient" }, "Changed Button gradient end")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Gradient angle<input aria-label="Button gradient angle" type="number" value={Number(node.props.gradientAngle || 120)} onChange={(event) => patchProps({ gradientAngle: Number(event.target.value), buttonSurfaceKind: "gradient" }, "Changed Button gradient angle")} className={fieldClass} /></label></div>
        <MediaPicker label="Button surface image" value={String(node.props.backgroundImageUrl || "")} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(value) => patchProps({ backgroundImageUrl: value, buttonSurfaceKind: "image" }, "Changed Button surface image")} />
        <div><p className="mb-1 text-[10px] font-semibold uppercase text-white/50">Shape presets</p><div className="grid grid-cols-3 gap-1">{([ ["square", 0], ["slightly rounded", 6], ["rounded rectangle", 14], ["soft rectangle", 22], ["pill", 999], ["circle", 999], ["custom corners", Number(node.props.radius || 14)] ] as const).map(([label, radiusValue]) => <button key={label} type="button" className={buttonClass} data-testid={`button-shape-${label.replaceAll(" ", "-")}`} onClick={() => patch({ ...(label === "circle" ? { width: Math.max(node.width, node.height), height: Math.max(node.width, node.height) } : {}), props: { ...node.props, presentation: label === "square" ? "square" : label === "pill" ? "pill" : label === "circle" ? "circle" : "custom", radius: radiusValue, cornersLinked: label !== "custom corners" } }, `Changed Button shape to ${label}`)}>{label}</button>)}</div></div>
        <label className="block text-[10px] text-white/65">Corner radius: {Number(node.props.radius || 0)} px<input aria-label="Button corner radius" type="number" min={0} max={999} value={Number(node.props.radius || 0)} onChange={(event) => { const radius = Number(event.target.value); patchProps({ radius, presentation: "custom", ...(node.props.cornersLinked === false ? {} : { radiusTopLeft: radius, radiusTopRight: radius, radiusBottomRight: radius, radiusBottomLeft: radius }) }, "Changed exact Button corner radius"); }} className={fieldClass} /></label>
        <label className="flex min-h-9 items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={node.props.cornersLinked !== false} onChange={(event) => patchProps({ cornersLinked: event.target.checked }, event.target.checked ? "Linked Button corners" : "Unlinked Button corners")} />Linked corners</label>
        {node.props.cornersLinked === false ? <div className="grid grid-cols-2 gap-2">{([ ["Top left", "radiusTopLeft"], ["Top right", "radiusTopRight"], ["Bottom right", "radiusBottomRight"], ["Bottom left", "radiusBottomLeft"] ] as const).map(([label, key]) => <label key={key} className="text-[10px] text-white/65">{label}<input aria-label={`Button ${label} radius`} type="number" min={0} max={999} value={Number(node.props[key] ?? node.props.radius ?? 0)} onChange={(event) => patchProps({ [key]: Number(event.target.value), presentation: "custom" }, `Changed Button ${label} corner`)} className={fieldClass} /></label>)}</div> : null}
        <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Border width<input aria-label="Button border width" type="number" min={0} max={24} value={Number(node.props.borderWidth || 0)} onChange={(event) => patchProps({ borderWidth: Number(event.target.value) }, "Changed Button border width")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Border color<input aria-label="Button border color" type="color" value={String(node.props.borderColor || "#ffffff")} onChange={(event) => patchProps({ borderColor: event.target.value }, "Changed Button border color")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Shadow<input aria-label="Button shadow" type="range" min={0} max={48} value={Number(node.props.boxShadow || 0)} onChange={(event) => patchProps({ boxShadow: Number(event.target.value) }, "Changed Button shadow")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Glow<input aria-label="Button glow" type="range" min={0} max={48} value={Number(node.props.boxGlow || 0)} onChange={(event) => patchProps({ boxGlow: Number(event.target.value) }, "Changed Button glow")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Glow color<input aria-label="Button glow color" type="color" value={String(node.props.glowColor || "#b8ff2c")} onChange={(event) => patchProps({ glowColor: event.target.value }, "Changed Button glow color")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Opacity<input aria-label="Button opacity" type="range" min={0} max={100} value={Math.round(Number(node.props.surfaceOpacity ?? 1) * 100)} onChange={(event) => patchProps({ surfaceOpacity: Number(event.target.value) / 100 }, "Changed Button opacity")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Padding<input aria-label="Button padding" type="number" min={0} max={80} value={Number(node.props.padding || 0)} onChange={(event) => patchProps({ padding: Number(event.target.value) }, "Changed Button padding")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Rotation<input aria-label="Button rotation" type="number" value={Math.round(node.rotationDeg || 0)} onChange={(event) => patch({ rotationDeg: Number(event.target.value) }, "Rotated Button")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Width %<input aria-label="Button width" type="number" min={5} max={100} value={Math.round(node.width * 100)} onChange={(event) => patch({ width: Number(event.target.value) / 100 }, "Changed Button width")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Height %<input aria-label="Button height" type="number" min={5} max={100} value={Math.round(node.height * 100)} onChange={(event) => patch({ height: Number(event.target.value) / 100 }, "Changed Button height")} className={fieldClass} /></label></div>
        <label className="flex min-h-9 items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={node.props.shine === true} onChange={(event) => patchProps({ shine: event.target.checked }, event.target.checked ? "Added high-gloss Button treatment" : "Removed high-gloss Button treatment")} />High-gloss shine</label>
        <button type="button" className={buttonClass} onClick={() => patchProps({ presentation: "rounded", radius: 14, cornersLinked: true, radiusTopLeft: 14, radiusTopRight: 14, radiusBottomRight: 14, radiusBottomLeft: 14 }, "Reset Button corners")}>Reset corners</button>
      </div> : null}
      {focus === "button-content" ? <div className="space-y-3" data-testid="button-content-controls"><p className="rounded border border-[#b8ff2c]/30 bg-[#b8ff2c]/5 p-2 text-[10px] text-white/70">Double-click the label on canvas to edit it directly. Internal content remains inside the clickable Button boundary.</p><label className="block text-[10px] text-white/65">Label<input aria-label="Button label" value={String(node.props.label || "")} onChange={(event) => patchProps({ label: event.target.value }, "Changed Button label")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Description<textarea aria-label="Button description" value={String(node.props.description || "")} onChange={(event) => patchProps({ description: event.target.value, showDescription: Boolean(event.target.value) }, "Changed Button description")} className="mt-1 min-h-20 w-full rounded border border-white/15 bg-transparent p-2 text-xs" /></label><div className="grid grid-cols-3 gap-1" data-testid="button-icon-choices"><button type="button" className={buttonClass} data-testid="button-no-icon" aria-pressed={!node.props.icon || node.props.icon === "none"} onClick={() => patchProps({ icon: "none", showIcon: false }, "Removed Button Icon")}>No Icon</button><button type="button" className={buttonClass} data-testid="button-add-icon" onClick={() => { patchProps({ showIcon: true, icon: node.props.icon && node.props.icon !== "none" ? node.props.icon : "sparkles" }, "Opened Button Icon picker"); setIconQuery(""); requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="shared-icon-picker"]')?.scrollIntoView({ block: "nearest" })); }}>Add Icon</button><button type="button" className={buttonClass} data-testid="button-change-icon" onClick={() => { setIconQuery(""); requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="button-iconify-search"]')?.focus()); }}>Change Icon</button><button type="button" className={buttonClass} data-testid="button-remove-icon" onClick={() => patchProps({ icon: "none", showIcon: false }, "Removed Button Icon")}>Remove Icon</button></div><div className="rounded border border-white/10 p-2" data-testid="shared-icon-picker"><p className="text-[10px] text-white/55">Shared Icon library — same authority as root Icons.</p><input value={iconQuery} onChange={(event) => { setIconQuery(event.target.value); if (event.target.value.trim().length >= 2) setIconSearchStatus("loading"); }} placeholder="Search Iconify…" className={fieldClass} data-testid="button-iconify-search" /><div className="mt-2 flex flex-wrap gap-1" data-testid="icon-browse-categories">{ICON_BROWSE_CATEGORIES.slice(3, 9).map((cat) => <button key={cat.id} type="button" className="min-h-7 rounded border border-white/10 px-2 text-[9px]" onClick={() => { setIconQuery(cat.query.split(" ")[0] || "star"); setIconSearchStatus("loading"); }}>{cat.label}</button>)}</div><div className="mt-2 flex flex-wrap gap-1" data-testid="icon-browse-collections">{ICON_COLLECTION_BROWSE.map((col) => <button key={col.id} type="button" className="min-h-7 rounded border border-white/10 px-2 text-[9px]" onClick={() => { void fetch(`/api/creative/icons?collection=${col.id}`).then((r) => r.json()).then((value: { icons?: typeof providerIcons }) => setProviderIcons(value.icons || [])); }}>{col.label}</button>)}</div><div className="mt-2 grid grid-cols-3 gap-1">{providerIcons.slice(0, 12).map((icon) => { const asset = icon.svg ? createIconAsset({ provider: "iconify", collection: icon.collection, iconName: icon.name, svg: icon.svg, source: icon.source }) : null; return <button key={icon.canonicalId} type="button" disabled={!asset} className="min-h-14 rounded border border-white/10 text-[9px]" onClick={() => { if (!asset) return; patchProps({ ...iconAssetToNodeProps(asset), icon: icon.name, showIcon: true }, "Changed Button Icon"); }}>{asset ? <span className="mx-auto grid h-7 w-7 place-items-center [&_svg]:h-6 [&_svg]:w-6" dangerouslySetInnerHTML={{ __html: asset.body }} /> : null}{icon.name}</button>; })}</div></div><div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Icon position<select aria-label="Button icon position" value={String(node.props.iconPosition || "before")} onChange={(event) => patchProps({ iconPosition: event.target.value }, "Changed Button icon position")} className={fieldClass}><option value="before">Before</option><option value="after">After</option></select></label><label className="text-[10px] text-white/65">Icon size<input aria-label="Button icon size" type="number" min={8} max={96} value={Number(node.props.iconSize || 20)} onChange={(event) => patchProps({ iconSize: Number(event.target.value) }, "Changed Button icon size")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Icon-to-text spacing<input aria-label="Button icon to text spacing" type="number" min={0} max={64} value={Number(node.props.spacing || 6)} onChange={(event) => patchProps({ spacing: Number(event.target.value) }, "Changed Button icon spacing")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Font size<input aria-label="Button label font size" type="number" min={6} max={120} value={Number(node.props.fontSize || 14)} onChange={(event) => patchProps({ fontSize: Number(event.target.value) }, "Changed Button label size")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Weight<input aria-label="Button label weight" type="number" min={100} max={900} step={100} value={Number(node.props.fontWeight || 600)} onChange={(event) => patchProps({ fontWeight: Number(event.target.value) }, "Changed Button label weight")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Color<input aria-label="Button label color" type="color" value={String(node.props.labelColor || node.props.textColor || "#0b0f19")} onChange={(event) => patchProps({ labelColor: event.target.value, textColor: event.target.value }, "Changed Button label color")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Alignment<select aria-label="Button label alignment" value={String(node.props.textAlign || "center")} onChange={(event) => patchProps({ textAlign: event.target.value }, "Changed Button label alignment")} className={fieldClass}><option>left</option><option>center</option><option>right</option></select></label><label className="text-[10px] text-white/65">Label X<input aria-label="Button label X" type="number" min={-120} max={120} value={Number(node.props.labelOffsetX || 0)} onChange={(event) => patchProps({ labelOffsetX: Number(event.target.value) }, "Moved Button label horizontally")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Label Y<input aria-label="Button label Y" type="number" min={-120} max={120} value={Number(node.props.labelOffsetY || 0)} onChange={(event) => patchProps({ labelOffsetY: Number(event.target.value) }, "Moved Button label vertically")} className={fieldClass} /></label></div><div><p className="mb-1 text-[10px] text-white/65">Label effects</p><div className="grid grid-cols-2 gap-1">{MATERIAL_PRESETS.slice(0, 6).map((preset) => <button key={preset.id} type="button" className={buttonClass} onClick={() => patch({ props: applyGlyphEffect(node.props, preset.id) }, `Applied ${preset.label} to Button label`)}>{preset.label}</button>)}</div></div></div> : null}
      {focus === "button-action" ? <div className="space-y-3" data-testid="button-action-controls"><p className="text-[10px] text-white/55">Action binding is independent from Button appearance, content, and motion.</p><div className="grid grid-cols-3 gap-1"><button type="button" className={buttonClass} onClick={() => patchProps({ actionType: "website" }, "Added Button action")}>Add action</button><button type="button" className={buttonClass} onClick={() => patchProps({ actionType: "website" }, "Changed Button action")}>Change action</button><button type="button" className={buttonClass} onClick={() => patchProps({ actionType: undefined, href: undefined }, "Removed Button action")}>Remove action</button></div><label className="block text-[10px] text-white/65">Action type<select aria-label="Button action type" value={String(node.props.actionType || "website")} onChange={(event) => patchProps({ actionType: event.target.value }, "Changed Button action type")} className={fieldClass}>{["call", "text", "email", "website", "directions", "map", "save_contact", "form", "coupon", "ticket", "wallet", "tapsave", "campaign", "custom"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-[10px] text-white/65">Destination<input aria-label="Button destination" value={String(node.props.href || "")} onChange={(event) => patchProps({ href: event.target.value }, "Changed Button destination")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Accessible label<input aria-label="Button accessible label" value={String(node.props.accessibleLabel || node.props.label || "")} onChange={(event) => patchProps({ accessibleLabel: event.target.value }, "Changed Button accessible label")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Tracking name<input aria-label="Button tracking name" value={String(node.props.trackingName || "")} onChange={(event) => patchProps({ trackingName: event.target.value }, "Changed Button tracking name")} className={fieldClass} /></label><button type="button" className={`${buttonClass} w-full`} onClick={() => model.notify?.(`Test action: ${String(node.props.actionType || "none")} ${String(node.props.href || "")}`.trim())}>Test action</button></div> : null}
      {focus === "button-styles" ? <div className="space-y-2" data-testid="button-style-controls"><p className="text-[10px] text-white/55">Styles never overwrite action, destination, tracking identity, accessible label, or custom content.</p>{[...BUILT_IN_BUTTON_STYLES, ...(model.config.buttonStylePresets ?? [])].map((preset) => <button key={("id" in preset && preset.id) || preset.name} type="button" className={`${buttonClass} w-full text-left`} onClick={() => applyButtonStyle(preset.props, preset.name)}>{preset.name}</button>)}<div className="grid grid-cols-2 gap-2"><button type="button" className={buttonClass} onClick={() => copyCompositionNodeStyle(node)}>Copy style</button><button type="button" disabled={!hasCompositionStyleClipboard()} className={buttonClass} onClick={() => { const pasted = pasteCompositionNodeStyle(block.nodes, node.id).find((candidate) => candidate.id === node.id); if (pasted) patch({ props: pasted.props }, "Pasted Button style"); }}>Paste style</button><button type="button" className={`${buttonClass} col-span-2`} onClick={saveButtonStyle}>Save as style preset</button></div></div> : null}
      {focus === "color" ? <div className="space-y-3" data-color-role="glyph" data-testid="text-appearance-controls">
        {deepLeft?.session.nestedPage === "solid-colors" ? <div className="space-y-2" data-testid="default-solid-colors" data-deep-route="solid-colors"><button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="nested-back-color" onClick={() => deepLeft?.goBack()}>← Back</button><p className="text-[10px] font-semibold uppercase text-white/55">Default solid colors</p><div className="grid grid-cols-7 gap-1.5">{flattenSolidColors().map((color) => <button key={color} type="button" aria-label={`Solid ${color}`} className="aspect-square rounded-full border border-white/20" style={{ background: color }} onClick={() => { patchProps({ color, gradientFill: undefined, sourceMode: "LOCAL" }, "Changed text color"); deepLeft?.goBack(); }} />)}</div></div>
        : deepLeft?.session.nestedPage === "gradient-colors" || deepLeft?.session.nestedPage === "all-gradients" ? <div className="space-y-2" data-testid="default-gradient-colors" data-deep-route="gradient-colors" data-gradient-target="glyph"><button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="nested-back-color" onClick={() => deepLeft?.goBack()}>← Back</button><p className="text-[10px] font-semibold uppercase text-white/55">Text glyph gradient</p><p className="text-[9px] text-white/45">Applies only to glyphs — Text Box fill stays unchanged.</p><div className="grid grid-cols-2 gap-2 mb-2">{GRADIENT_PRESETS.slice(0, 6).map((preset) => { const css = gradientToCss(preset.gradient); return <button key={preset.id} type="button" aria-label={`Apply ${preset.label}`} data-testid={`gradient-preset-${preset.id}`} className="min-h-14 rounded-lg border border-white/20 p-2 text-left text-[9px]" style={{ background: css }} onClick={() => { patchProps({ gradientFill: css, gradientModel: structuredClone(preset.gradient), sourceMode: "LOCAL" }, `Applied ${preset.label} glyph gradient`); }}><span className="rounded bg-black/40 px-1 text-white">{preset.label}</span></button>; })}</div><GradientStudio value={(node.props.gradientModel as GradientModel | undefined) || DEFAULT_GRADIENT} brandColors={[model.config.accentColor, model.config.surfaceColor, model.config.textColor, model.config.pillColor].filter((c): c is string => Boolean(c))} foregroundColor={String(node.props.color || "#ffffff")} onChange={(gradient, label) => { patchProps({ gradientFill: gradientToCss(gradient), gradientModel: gradient, sourceMode: "LOCAL" }, label.includes("glyph") ? label : `${label} (glyphs)`); }} /></div>
        : deepLeft?.session.nestedPage === "photo-colors" ? (() => {
          const sources = buildPhotoColorSources({ nodes: block.nodes });
          return <div className="space-y-2" data-testid="photo-colors" data-deep-route="photo-colors"><button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="nested-back-color" onClick={() => deepLeft?.goBack()}>← Back</button><p className="text-[10px] font-semibold uppercase text-white/55">Photo colors</p>{sources.length === 0 ? <p className="rounded border border-white/10 p-3 text-[11px] text-white/65" data-testid="photo-colors-empty">{PHOTO_COLORS_EMPTY_MESSAGE}</p> : sources.map((source) => <div key={source.assetId} className="rounded border border-white/10 p-2" data-testid={`photo-color-source-${source.assetId}`} data-source-asset-id={source.assetId}><div className="mb-2 flex items-center gap-2"><span className="h-10 w-10 overflow-hidden rounded bg-white/5 bg-cover bg-center" style={{ backgroundImage: `url(${source.thumbnailUrl})` }} /><span className="text-[10px] text-white/70">{source.label}</span></div><div className="flex flex-wrap gap-2">{source.colors.map((color) => <button key={`${source.assetId}-${color}`} type="button" className="h-8 w-8 rounded-full border border-white/20" style={{ background: color }} onClick={() => { patchProps({ color, sourceMode: "PHOTO" }, "Applied photo color"); deepLeft?.goBack(); }} />)}</div></div>)}</div>;
        })()
        : <><div><p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">Text color</p><div className="flex items-center gap-2"><span className="block h-9 w-9 rounded-full border border-white/15" style={{ background: String(node.props.color || "#ffffff") }} data-testid="current-text-color" /><input aria-label="Search colors" placeholder='Try "blue" or "#00c4cc"' className="h-9 flex-1 rounded border border-white/15 bg-transparent px-2 text-xs" data-testid="color-search" /></div></div>
        <div className="grid grid-cols-2 gap-1"><button type="button" className={buttonClass} data-testid="color-transparent" onClick={() => patchProps({ color: "transparent", gradientFill: undefined }, "Cleared text color")}>Transparent</button><input aria-label="Custom glyph color" type="color" value={toColorInputValue(node.props.color, "#ffffff")} onChange={(event) => patchProps({ color: event.target.value }, "Changed custom text color")} className="h-9 w-full rounded border border-white/15 bg-transparent p-0.5" data-testid="glyph-color-input" /></div>
        <div><p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">Colors in this design</p><div className="flex flex-wrap gap-2" data-testid="colors-in-this-design">{colors.map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={`Use ${color}`} aria-pressed={node.props.color === color} className="h-8 w-8 rounded-full border border-white/20 outline-none aria-pressed:ring-2 aria-pressed:ring-[#b8ff2c]" style={{ background: color }} onClick={() => patchProps({ color, sourceMode: "LOCAL" }, "Changed text color")} />)}</div></div>
        <div><p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">Brand palette</p><div className="flex flex-wrap gap-2" data-testid="brand-palette">{[model.config.accentColor, model.config.surfaceColor, model.config.textColor, model.config.pillColor].filter(Boolean).map((color, index) => <button key={`brand-${color}-${index}`} type="button" aria-label={`Brand ${color}`} className="h-8 w-8 rounded-full border border-white/20" style={{ background: String(color) }} onClick={() => patchProps({ color: String(color), sourceMode: "BRAND" }, "Applied Brand color")} />)}</div></div>
        <div className="grid grid-cols-1 gap-1"><button type="button" className={`${buttonClass} w-full text-left`} data-testid="see-all-solid-colors" onClick={() => deepLeft?.setNestedPage("solid-colors")}>See all default solid colors</button><button type="button" className={`${buttonClass} w-full text-left`} data-testid="see-all-gradient-colors" onClick={() => deepLeft?.setNestedPage("gradient-colors")}>See all default gradient colors</button><button type="button" className={`${buttonClass} w-full text-left`} data-testid="see-photo-colors" onClick={() => deepLeft?.setNestedPage("photo-colors")}>Photo colors</button></div>
        <button type="button" className="min-h-9 w-full rounded border border-white/15 text-xs" onClick={() => patchProps({ color: model.config.textColor, gradientFill: undefined, sourceMode: "BRAND" }, "Reset glyph color to Brand")}>Reset Text Appearance</button>
        <button type="button" className="min-h-9 w-full rounded border border-white/15 text-xs" onClick={() => open("text-box")}>Open Text Box</button>
        <p className="text-[10px] text-white/45">Text Box fill, padding, and border are separate from glyph styling.</p></>}
      </div> : null}
      {focus === "text-box" ? <div className="space-y-3" data-testid="text-box-controls" data-gradient-target="text-box"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Text Box</p><div className="grid grid-cols-3 gap-1">{(["none", "solid", "gradient"] as const).map((kind) => <button key={kind} type="button" className={buttonClass} data-testid={`text-box-fill-${kind}`} onClick={() => patchProps(kind === "none" ? { boxFill: "transparent", boxGradient: undefined, boxGradientModel: undefined } : kind === "solid" ? { boxFill: String(node.props.boxFill === "transparent" ? "#111827" : node.props.boxFill || "#111827"), boxGradient: undefined, boxGradientModel: undefined } : { boxGradient: gradientToCss((node.props.boxGradientModel as GradientModel | undefined) || DEFAULT_GRADIENT), boxGradientModel: (node.props.boxGradientModel as GradientModel | undefined) || DEFAULT_GRADIENT, boxFill: undefined }, `Changed Text Box to ${kind}`)}>{kind === "none" ? "Transparent" : kind}</button>)}</div>{node.props.boxGradient || deepLeft?.session.nestedPage === "gradient-colors" ? <div data-testid="text-box-gradient-editor"><p className="mb-1 text-[9px] text-white/45">Text Box gradient — independent from glyph Color.</p><GradientStudio value={(node.props.boxGradientModel as GradientModel | undefined) || DEFAULT_GRADIENT} brandColors={[model.config.accentColor, model.config.surfaceColor, model.config.textColor, model.config.pillColor].filter((c): c is string => Boolean(c))} onChange={(gradient, label) => { patchProps({ boxGradient: gradientToCss(gradient), boxGradientModel: gradient, boxFill: undefined }, label.includes("Text Box") ? label : `${label} (Text Box)`); }} /></div> : null}<div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Fill<input type="color" value={String(node.props.boxFill || "#111827").slice(0, 7)} onChange={(event) => patchProps({ boxFill: event.target.value, boxGradient: undefined, boxGradientModel: undefined }, "Changed Text Box fill")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Border<input type="color" value={String(node.props.boxBorder || "#ffffff").slice(0, 7)} onChange={(event) => patchProps({ boxBorder: event.target.value }, "Changed Text Box border")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Corners<input type="number" min={0} max={64} value={Number(node.props.boxRadius || 0)} onChange={(event) => patchProps({ boxRadius: Number(event.target.value) }, "Changed Text Box corners")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Padding<input type="number" min={0} max={64} value={Number(node.props.boxPadding || 0)} onChange={(event) => patchProps({ boxPadding: Number(event.target.value) }, "Changed Text Box padding")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Shadow<input type="range" min={0} max={48} value={Number(node.props.boxShadow || 0)} onChange={(event) => patchProps({ boxShadow: Number(event.target.value) }, "Changed Text Box shadow")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Glow<input type="range" min={0} max={48} value={Number(node.props.boxGlow || 0)} onChange={(event) => patchProps({ boxGlow: Number(event.target.value) }, "Changed Text Box glow")} className={fieldClass} /></label></div><button type="button" className={`${buttonClass} w-full`} onClick={() => patchProps({ boxFill: undefined, boxGradient: undefined, boxGradientModel: undefined, boxBorder: undefined, boxRadius: undefined, boxPadding: undefined, boxShadow: undefined, boxGlow: undefined }, "Reset Text Box")}>Reset Text Box</button></div> : null}
      {focus === "icon-appearance" ? <div className="space-y-4" data-testid="icon-appearance-controls" data-icon-render-mode={iconRenderMode}>
        <section className="space-y-2" data-testid="icon-artwork-section">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">Artwork</p>
          {iconRenderMode === "multicolor" ? <p className="rounded border border-amber-300/30 p-2 text-[10px] text-amber-100" data-testid="icon-multicolor-note">Multicolor Icons keep baked path colors. Fill/Stroke recolor is unavailable.</p> : null}
          {iconRenderMode !== "multicolor" && iconRenderMode !== "stroke" ? <label className="block text-[10px] text-white/65">Fill<input type="color" value={String(node.props.fill || "#b8ff2c").slice(0, 7)} onChange={(event) => patchProps({ fill: event.target.value }, "Changed Icon fill")} className={fieldClass} data-testid="icon-fill-color" /></label> : null}
          {iconRenderMode !== "multicolor" && iconRenderMode !== "fill" ? (
            <div className="space-y-2" data-testid="icon-stroke-controls">
              <label className="block text-[10px] text-white/65">Stroke color<input type="color" value={String(node.props.stroke || node.props.fill || "#b8ff2c").slice(0, 7)} onChange={(event) => patchProps({ stroke: event.target.value }, "Changed Icon stroke")} className={fieldClass} data-testid="icon-stroke-color" /></label>
              <label className="block text-[10px] text-white/65">
                Stroke width
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.25}
                    value={Number(node.props.strokeWidth || 2)}
                    onChange={(event) => patchProps({ strokeWidth: Number(event.target.value) }, "Changed Icon stroke width")}
                    className="h-9 flex-1"
                    data-testid="icon-stroke-width-slider"
                  />
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.25}
                    value={Number(node.props.strokeWidth || 2)}
                    onChange={(event) => patchProps({ strokeWidth: Number(event.target.value) }, "Changed Icon stroke width")}
                    className="h-9 w-16 rounded border border-white/15 bg-transparent px-2 text-xs"
                    data-testid="icon-stroke-width"
                  />
                </span>
              </label>
            </div>
          ) : iconRenderMode === "fill" || iconRenderMode === "multicolor" ? (
            <p className="text-[9px] text-white/40" data-testid="icon-stroke-unavailable">Stroke width is unavailable for this Icon render mode.</p>
          ) : null}
          <div data-testid="icon-artwork-treatments">
            <p className="mb-1 text-[9px] font-semibold uppercase text-white/45">Material</p>
            <div className="grid grid-cols-3 gap-1.5">
              {["gold", "chrome", "neon", "tube_neon", "halo"].map((id) => {
                const recipe = getMaterialRecipe(id);
                if (!recipe) return null;
                const preview = applyMaterialRecipe("icon_artwork", id, { ...node.props });
                const layers = effectLayersCss("icon_artwork", { glow: Number(preview.glow || 0), glowColor: String(preview.glowColor || preview.fill || "#b8ff2c"), color: String(preview.fill || "#b8ff2c") });
                return (
                  <button
                    key={id}
                    type="button"
                    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded border border-white/15 px-1 text-[9px] hover:border-[#b8ff2c]/60"
                    data-testid={`icon-treatment-${id}`}
                    onClick={() => patchProps(applyMaterialRecipe("icon_artwork", id, node.props), `Applied ${recipe.label} Icon material`)}
                  >
                    <span
                      aria-hidden
                      className="grid h-8 w-8 place-items-center text-[16px] font-bold"
                      style={{ color: String(preview.fill || preview.artworkFill || "#b8ff2c"), filter: layers.filter, textShadow: layers.textShadow }}
                    >
                      ◆
                    </span>
                    {recipe.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div data-testid="icon-effect-recipes">
            <p className="mb-1 text-[9px] font-semibold uppercase text-white/45">Effects</p>
            <div className="grid grid-cols-3 gap-1.5">
              {EFFECT_RECIPES.filter((item) => item.supportedTargets.includes("icon_artwork")).map((effect) => {
                const preview = applyEffectRecipe("icon_artwork", effect.id, { ...node.props, fill: node.props.fill || "#b8ff2c" });
                const layers = effectLayersCss("icon_artwork", {
                  effectPreset: effect.id,
                  glow: Number(preview.glow || effect.glow || 0),
                  shadow: Number(preview.shadow || effect.shadow || 0),
                  secondaryGlow: Number(preview.secondaryGlow || effect.secondaryGlow || 0),
                  glowColor: String(preview.glowColor || effect.glowColor || node.props.fill || "#22d3ee"),
                  color: String(node.props.fill || "#b8ff2c"),
                });
                return (
                  <button
                    key={effect.id}
                    type="button"
                    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded border border-white/15 px-1 text-[9px] hover:border-[#b8ff2c]/60"
                    data-testid={`icon-effect-${effect.id}`}
                    onClick={() => patchProps(applyEffectRecipe("icon_artwork", effect.id, node.props), `Applied ${effect.label}`)}
                  >
                    <span
                      aria-hidden
                      className="grid h-8 w-8 place-items-center text-[16px] font-bold"
                      style={{ color: String(node.props.fill || "#b8ff2c"), filter: layers.filter, textShadow: layers.textShadow }}
                      data-effect-preview={effect.id}
                    >
                      ◆
                    </span>
                    {effect.label}
                  </button>
                );
              })}
            </div>
          </div>
          <details className="rounded border border-white/10 p-2" data-testid="icon-artwork-advanced">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase text-white/55">Advanced</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[10px] text-white/65">Opacity<input type="range" min={0} max={100} value={Math.round(Number(node.props.opacity ?? 1) * 100)} onChange={(event) => patchProps({ opacity: Number(event.target.value) / 100 }, "Changed Icon opacity")} className={fieldClass} data-testid="icon-opacity" /></label>
              <label className="text-[10px] text-white/65">Shadow<input type="range" min={0} max={48} value={Number(node.props.shadow || 0)} onChange={(event) => patchProps({ shadow: Number(event.target.value) }, "Changed Icon artwork shadow")} className={fieldClass} data-testid="icon-artwork-shadow" /></label>
              <label className="text-[10px] text-white/65">Glow<input type="range" min={0} max={48} value={Number(node.props.glow || 0)} onChange={(event) => patchProps({ glow: Number(event.target.value), boxGlow: 0 }, "Changed Icon artwork glow")} className={fieldClass} data-testid="icon-artwork-glow" /></label>
              <label className="text-[10px] text-white/65">Blur<input type="range" min={0} max={24} value={Number(node.props.blur || 0)} onChange={(event) => patchProps({ blur: Number(event.target.value) }, "Changed Icon artwork blur")} className={fieldClass} data-testid="icon-artwork-blur" /></label>
            </div>
          </details>
          <button type="button" className={`${buttonClass} w-full`} data-testid="icon-reset-artwork" onClick={() => patchProps({ fill: "#b8ff2c", stroke: "#b8ff2c", strokeWidth: iconRenderMode === "stroke" ? 2 : 0, opacity: 1, glow: 0, shadow: 0, blur: 0, secondaryGlow: 0, materialPreset: undefined, effectPreset: undefined }, "Reset artwork appearance")}>Reset artwork appearance</button>
        </section>
        <section className="space-y-2 border-t border-white/10 pt-3" data-testid="icon-backing-section">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">Backing Surface</p>
          <label className="flex min-h-9 items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={node.props.backingSurfaceEnabled === true} data-testid="icon-backing-enabled" onChange={(event) => patchProps(event.target.checked ? { backingSurfaceEnabled: true, boxFill: String(node.props.boxFill === "transparent" ? "#111827" : node.props.boxFill || "#111827") } : { backingSurfaceEnabled: false, boxFill: "transparent", boxGradient: undefined, boxShadow: 0, boxGlow: 0, borderWidth: 0, borderStyle: "none", borderColor: "transparent", radius: 0 }, event.target.checked ? "Enabled Icon backing Surface" : "Disabled Icon backing Surface")} />Enable backing Surface</label>
          {node.props.backingSurfaceEnabled === true ? <>
            <div className="grid grid-cols-3 gap-1">{[["square", 0], ["rounded", 14], ["circle", 999]].map(([shape, radius]) => <button key={String(shape)} type="button" className={buttonClass} data-testid={`icon-backing-shape-${shape}`} onClick={() => patchProps({ radius }, `Changed Icon backing shape to ${shape}`)}>{shape}</button>)}</div>
            <div className="grid grid-cols-2 gap-1" data-testid="icon-backing-materials">
              {["glass", "frosted_glass", "gold", "chrome"].map((id) => (
                <button key={id} type="button" className={buttonClass} data-testid={`icon-backing-material-${id}`} onClick={() => patchProps(applyMaterialRecipe("icon_backing", id, node.props), `Applied ${id} Icon backing`)}>{id.replaceAll("_", " ")}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-white/65">Fill<input type="color" value={String(node.props.boxFill || "#111827").slice(0, 7)} onChange={(event) => patchProps({ boxFill: event.target.value, boxGradient: undefined }, "Changed Icon backing fill")} className={fieldClass} data-testid="icon-backing-fill" /></label>
              <label className="text-[10px] text-white/65">Radius<input type="number" min={0} max={999} value={Number(node.props.radius || 0)} onChange={(event) => patchProps({ radius: Number(event.target.value) }, "Changed Icon backing radius")} className={fieldClass} data-testid="icon-radius" /></label>
              <label className="text-[10px] text-white/65">Shadow<input type="range" min={0} max={48} value={Number(node.props.boxShadow || 0)} onChange={(event) => patchProps({ boxShadow: Number(event.target.value) }, "Changed Icon backing shadow")} className={fieldClass} /></label>
              <label className="text-[10px] text-white/65">Glow<input type="range" min={0} max={48} value={Number(node.props.boxGlow || 0)} onChange={(event) => patchProps({ boxGlow: Number(event.target.value) }, "Changed Icon backing glow")} className={fieldClass} /></label>
              <label className="col-span-2 text-[10px] text-white/65">Opacity<input type="range" min={0} max={100} value={Math.round(Number(node.props.opacity ?? 1) * 100)} onChange={(event) => patchProps({ opacity: Number(event.target.value) / 100 }, "Changed Icon opacity")} className={fieldClass} /></label>
            </div>
            <div data-testid="icon-backing-border-controls"><p className="mb-1 text-[10px] font-semibold uppercase text-white/50">Border</p><div className="grid grid-cols-5 gap-1">{(["none", "solid", "dashed", "dotted", "double"] as const).map((style) => <button key={style} type="button" className={buttonClass} data-testid={`icon-border-style-${style}`} onClick={() => patchProps(style === "none" ? { ...clearBorderProps(node.props), borderStyle: "none", borderWidth: 0 } : applyBorderProps(node.props, { style, width: Math.max(1, Number(node.props.borderWidth || 1)) }), style === "none" ? "Removed Icon backing border" : `Changed Icon backing border to ${style}`)}>{style === "none" ? "None" : style}</button>)}</div></div>
            <label className="block text-[10px] text-white/65">Gradient CSS<input value={String(node.props.boxGradient || "")} onChange={(event) => patchProps({ boxGradient: event.target.value || undefined }, "Changed Icon backing gradient")} className={fieldClass} data-testid="icon-backing-gradient" /></label>
            <button type="button" className={`${buttonClass} w-full`} data-testid="icon-reset-backing" onClick={() => patchProps({ backingSurfaceEnabled: false, boxFill: "transparent", boxGradient: undefined, boxShadow: 0, boxGlow: 0, borderWidth: 0, borderStyle: "none", borderColor: "transparent", radius: 0 }, "Reset backing Surface")}>Reset backing Surface</button>
          </> : <p className="text-[9px] text-white/40">Off by default — bare Icon shows only SVG artwork.</p>}
        </section>
      </div> : null}
      {focus === "divider-style" ? (
        <div className="space-y-3" data-testid="divider-style-controls">
          <p className="text-[10px] text-white/55">Divider Style — structural line treatment only.</p>
          <div className="grid grid-cols-2 gap-1">
            {(["solid", "dashed", "dotted", "double", "ornamental", "gradient", "short_accent", "full_width", "centered_flourish", "icon_centered", "labelled"] as const).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={String(node.props.dividerStyle || "solid") === style}
                className={buttonClass}
                data-testid={`divider-style-${style}`}
                onClick={() => patchProps({
                  dividerStyle: style,
                  borderStyle: style === "dashed" || style === "dotted" ? style : "solid",
                }, `Changed Divider style to ${style}`)}
              >
                {style.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {focus === "divider-thickness" ? <div className="space-y-3" data-testid="divider-thickness-controls"><label className="block text-[10px] text-white/65">Thickness<input type="number" min={1} max={48} value={Number(node.props.strokeWidth || node.props.thickness || 2)} onChange={(event) => patchProps({ strokeWidth: Number(event.target.value), thickness: Number(event.target.value) }, "Changed Divider thickness")} className={fieldClass} data-testid="divider-thickness-input" /></label><label className="block text-[10px] text-white/65">Length %<input type="number" min={10} max={100} value={Math.round(node.width * 100)} onChange={(event) => patch({ width: Number(event.target.value) / 100 }, "Changed Divider length")} className={fieldClass} /></label></div> : null}
      {focus === "divider-color" ? <div className="space-y-3" data-testid="divider-color-controls"><div className="grid grid-cols-2 gap-1"><button type="button" className={buttonClass} onClick={() => patchProps({ fill: "transparent", gradientFill: undefined }, "Cleared Divider color")}>None</button><button type="button" className={buttonClass} onClick={() => patchProps({ fill: String(node.props.fill === "transparent" ? "#b8ff2c" : node.props.fill || "#b8ff2c"), gradientFill: undefined }, "Set solid Divider color")}>Solid</button></div><label className="block text-[10px] text-white/65">Color<input type="color" value={String(node.props.fill || "#b8ff2c").slice(0, 7)} onChange={(event) => patchProps({ fill: event.target.value, stroke: event.target.value, gradientFill: undefined }, "Changed Divider color")} className={fieldClass} data-testid="divider-color-input" /></label><label className="block text-[10px] text-white/65">Gradient CSS<input value={String(node.props.gradientFill || "")} onChange={(event) => patchProps({ gradientFill: event.target.value || undefined }, "Changed Divider gradient")} className={fieldClass} /></label></div> : null}
      {focus === "divider-appearance" ? <div className="space-y-3" data-testid="divider-appearance-controls"><p className="text-[10px] text-white/55">Divider Appearance — opacity, shadow, and glow only.</p><label className="block text-[10px] text-white/65">Opacity<input type="range" min={0} max={100} value={Math.round(Number(node.props.opacity ?? 1) * 100)} onChange={(event) => patchProps({ opacity: Number(event.target.value) / 100 }, "Changed Divider opacity")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Shadow<input type="range" min={0} max={48} value={Number(node.props.boxShadow || 0)} onChange={(event) => patchProps({ boxShadow: Number(event.target.value) }, "Changed Divider shadow")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Glow<input type="range" min={0} max={48} value={Number(node.props.boxGlow || node.props.glow || 0)} onChange={(event) => patchProps({ boxGlow: Number(event.target.value), glow: Number(event.target.value) }, "Changed Divider glow")} className={fieldClass} /></label></div> : null}
      {focus === "map-action" ? <div className="space-y-3" data-testid="map-action-controls"><p className="text-[10px] text-white/55">Directions behavior — separate from Map Setup and Appearance.</p><label className="block text-[10px] text-white/65">Directions destination<input value={String(node.props.directionsDestination || node.props.address || "")} onChange={(event) => patchProps({ directionsDestination: event.target.value, href: event.target.value, actionType: "directions" }, "Changed Map directions destination")} className={fieldClass} data-testid="map-directions-destination" /></label><label className="block text-[10px] text-white/65">Preferred map app<select value={String(node.props.mapAppPreference || "system")} onChange={(event) => patchProps({ mapAppPreference: event.target.value }, "Changed preferred map app")} className={fieldClass}><option value="system">System default</option><option value="apple">Apple Maps</option><option value="google">Google Maps</option><option value="waze">Waze</option></select></label><label className="block text-[10px] text-white/65">Open behavior<select value={String(node.props.openBehavior || "external")} onChange={(event) => patchProps({ openBehavior: event.target.value }, "Changed Map open behavior")} className={fieldClass}><option value="external">External app / tab</option><option value="same_tab">Same tab</option></select></label><label className="block text-[10px] text-white/65">Accessible label<input value={String(node.props.accessibleLabel || "Get directions")} onChange={(event) => patchProps({ accessibleLabel: event.target.value }, "Changed Map accessible label")} className={fieldClass} /></label><label className="block text-[10px] text-white/65">Tracking name<input value={String(node.props.trackingName || "")} onChange={(event) => patchProps({ trackingName: event.target.value }, "Changed Map tracking name")} className={fieldClass} /></label><button type="button" className={`${buttonClass} w-full`} data-testid="map-test-action" onClick={() => model.notify?.(`Test Action: directions → ${String(node.props.directionsDestination || node.props.address || "setup required")} (${String(node.props.mapAppPreference || "system")})`)}>Test Action</button></div> : null}
            {focus === "content" && objectFamily === "coupon" ? (() => {
        const content = (node.props.contentComposition && typeof node.props.contentComposition === "object" ? node.props.contentComposition : null) as { nodes?: typeof block.nodes } | null;
        const roles: Array<{ role: CouponChildRole; label: string; prop?: string }> = [
          { role: "offer", label: "Offer", prop: "offerValue" },
          { role: "headline", label: "Headline", prop: "headline" },
          { role: "description", label: "Description", prop: "description" },
          { role: "code", label: "Code", prop: "code" },
          { role: "expiration", label: "Expiration", prop: "expiration" },
          { role: "terms", label: "Terms", prop: "terms" },
          { role: "cta", label: "CTA", prop: "ctaLabel" },
        ];
        const childText = (role: string) => {
          const child = content?.nodes?.find((n) => String(n.props.componentContentRole || n.props.presetChildRole) === role || (role === "code" && String(n.props.componentContentRole) === "stub_code"));
          return child ? String(child.props.text || child.props.label || "") : String(node.props[roles.find((r) => r.role === role)?.prop || ""] || "");
        };
        return <div className="space-y-3" data-testid="coupon-content-editor">
          <p className="text-[10px] font-semibold uppercase text-white/55">Coupon Content</p>
          <p className="text-[10px] text-white/50">Edits mutate real child Elements. Appearance stays on the Coupon Surface.</p>
          {roles.map((item) => (
            <label key={item.role} className="block text-[10px] text-white/65">{item.label}
              <input
                aria-label={`Coupon ${item.label}`}
                value={childText(item.role)}
                data-testid={`coupon-content-${item.role}`}
                onChange={(event) => {
                  const value = event.target.value;
                  const propKey = item.prop || item.role;
                  patchProps({ [propKey]: value }, `Changed Coupon ${item.label}`);
                }}
                className={fieldClass}
              />
            </label>
          ))}
          <label className="block text-[10px] text-white/65">Image
            <MediaPicker label="Replace Coupon image" value={String(node.props.artworkSrc || "")} mediaUploadReady={model.mediaUploadReady} stockReady={model.stockReady} onChange={(url) => patchProps({ artworkSrc: url || "" }, "Replaced Coupon image")} />
          </label>
          <button type="button" className={`${buttonClass} w-full`} onClick={() => patchProps({ contentEditing: true, selectionMode: "content" }, "Entered Coupon canvas content mode")}>Edit individual elements on canvas</button>
        </div>;
      })() : null}
{focus === "effects" || focus === "appearance" ? (() => {
        const categories = appearanceCategoriesForFamily(groupParent ? "group" : objectFamily);
        const appearancePage = String(deepLeft?.session.nestedPage || "overview");
        const selectedEffect = String(node.props.effectPreset || "");
        const effectTarget = isText && !isBadge ? "glyph" as const : "surface" as const;
        const scopeNote = groupParent ? fanOutScopeLabel(
          fanOutProps(block.nodes, selectedIds, "effect", {}).appliedIds.length,
          selectedIds.length
        ) : null;
        if (appearancePage === "home" || appearancePage === "overview" || appearancePage === "custom") {
          return <div className="space-y-3" data-testid="appearance-category-overview">
            <p className="text-[10px] text-white/55">Appearance — pick a category. Click always works; hover is never required.</p>
            {groupParent && appearanceScopes.length ? (
              <div className="flex flex-wrap gap-1" data-testid="group-appearance-scopes">
                {appearanceScopes.map((scope) => (
                  <span key={scope.scope} className="rounded border border-white/15 px-2 py-1 text-[9px] text-white/70">
                    {scope.scope === "text" ? "Text" : scope.scope === "surfaces" ? "Surfaces" : "Icons"} · {scope.count}
                  </span>
                ))}
              </div>
            ) : null}
            {scopeNote ? <p className="text-[9px] text-[#b8ff2c]" data-testid="appearance-scope-note">{scopeNote}</p> : null}
            <div className="grid grid-cols-1 gap-2">
              {categories.map((category) => (
                <button key={category.id} type="button" className="min-h-14 rounded-xl border border-white/12 bg-white/[.03] px-3 py-2 text-left hover:border-[#b8ff2c]/50" data-testid={`appearance-category-${category.id}`} onClick={() => {
                  if (category.id === "text_box") {
                    openForced("text-box");
                    return;
                  }
                  deepLeft?.setNestedPage(
                    category.id === "effects" ? "effects"
                      : category.id === "material" ? "metallic"
                      : category.id === "fill" || category.id === "color" ? "solid-colors"
                      : category.id === "border" ? "style"
                      : category.id === "artwork" ? "change-icon"
                      : category.id === "backing_surface" ? "raised"
                      : "overview"
                  );
                }}>
                  <span className="block text-sm font-semibold text-white">{category.label}</span>
                  <span className="block text-[10px] text-white/50">{category.description}</span>
                </button>
              ))}
            </div>
          </div>;
        }
        // Effects page — tuning lives with the selected effect (no separate Quick Effects / Advanced drawer)
        if (appearancePage === "effects" || appearancePage === "neon") {
          const fields = tuningFieldsForEffect(selectedEffect);
          return <div className="space-y-3" data-testid="material-engine-controls">
            <button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="appearance-back" onClick={() => deepLeft?.setNestedPage("overview")}>← Appearance</button>
            <p className="text-[10px] font-semibold uppercase text-white/55">Effects</p>
            <div className="grid grid-cols-2 gap-1" data-testid="appearance-effects-list">
              {EFFECT_RECIPES.map((effect) => (
                <button key={effect.id} type="button" aria-pressed={selectedEffect === effect.id} className={buttonClass} data-testid={`effect-${effect.id}`} onClick={() => { const adapted = applyEffectRecipe(effectTarget, effect.id, node.props); patchProps({ ...adapted, effectPreset: effect.id }, `Applied ${effect.label} effect`); }}>{effect.label}</button>
              ))}
            </div>
            {selectedEffect && selectedEffect !== "none" ? (
              <div className="space-y-2 rounded-xl border border-white/10 p-2" data-testid="appearance-effect-tuning" data-effect-id={selectedEffect}>
                <p className="text-[10px] font-semibold text-white/70">Tune {selectedEffect.replaceAll("_", " ")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map((field) => field.key === "glowColor" ? (
                    <label key={field.key} className="text-[10px] text-white/65">{field.label}<input type="color" value={String(node.props.glowColor || "#22d3ee").slice(0, 7)} onChange={(event) => patchProps({ glowColor: event.target.value }, `Tuned ${field.label}`)} className={fieldClass} /></label>
                  ) : (
                    <label key={field.key} className="text-[10px] text-white/65">{field.label}<input type="range" min={field.min} max={field.max} step={field.step || 1} value={Number(node.props[field.key] ?? (field.key === "glow" ? node.props.boxGlow : field.key === "shadow" ? node.props.boxShadow : field.key === "opacity" ? 1 : 0))} onChange={(event) => {
                      const value = Number(event.target.value);
                      if (field.key === "opacity") patchProps({ opacity: value }, `Tuned ${field.label}`);
                      else if (field.key === "glow") patchProps({ glow: value, boxGlow: value }, `Tuned ${field.label}`);
                      else if (field.key === "shadow") patchProps({ shadow: value, boxShadow: value }, `Tuned ${field.label}`);
                      else patchProps({ [field.key]: value }, `Tuned ${field.label}`);
                    }} className={fieldClass} /></label>
                  ))}
                </div>
                <details className="rounded border border-white/10 p-2">
                  <summary className="cursor-pointer text-[10px] font-semibold uppercase text-white/45">Fine tune</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-white/65">Secondary glow<input type="range" min={0} max={72} value={Number(node.props.secondaryGlow || 0)} onChange={(event) => patchProps({ secondaryGlow: Number(event.target.value) }, "Tuned secondary glow")} className={fieldClass} /></label>
                    <label className="text-[10px] text-white/65">Edge width<input type="range" min={0.5} max={4} step={0.1} value={Number(node.props.edgeWidth || 1.25)} onChange={(event) => patchProps({ edgeWidth: Number(event.target.value) }, "Tuned edge width")} className={fieldClass} /></label>
                  </div>
                </details>
              </div>
            ) : null}
          </div>;
        }
        // Material page
        if (appearancePage === "metallic" || appearancePage === "raised" || appearancePage === "glass" || appearancePage === "texture" || appearancePage === "flat" || appearancePage === "recessed" || appearancePage === "enamel") {
          return <div className="space-y-3" data-testid="material-engine-controls">
            <button type="button" className="text-[10px] text-[#b8ff2c]" onClick={() => deepLeft?.setNestedPage("overview")}>← Appearance</button>
            <p className="text-[10px] text-white/55">Material recipes — Appearance authority. Not insertion species.</p>
            {MATERIAL_UI_CATEGORIES.map((category) => {
              const items = materialsByCategory(category.id);
              if (!items.length) return null;
              return (
                <div key={category.id} data-testid={`material-category-${category.id}`}>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">{category.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((preset) => (
                      <button key={preset.id} type="button" aria-pressed={String(node.props.materialPreset || "") === preset.id} className="min-h-14 rounded border border-white/15 bg-transparent px-2 text-xs hover:border-[#b8ff2c]/60" data-testid={`material-${preset.id}`} onClick={() => {
                        if (isText && !isBadge) patchProps(applyGlyphMaterial(node.props, preset.id), `Applied ${preset.label} text material`);
                        else if (isBadge) patchProps(applySurfaceMaterial(node.props, preset.id), `Applied ${preset.label} material`);
                        else patchProps(applySurfaceMaterial(node.props, preset.id, { asButtonSurface: isButton, preserveTextColor: isButton }), `Applied ${preset.label} material`);
                      }}>
                        <span className="mx-auto mb-1 block h-6 w-full rounded" style={{ background: materialPreviewCss(preset) }} />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <button type="button" className="min-h-10 w-full rounded border border-white/15 text-xs" data-testid="material-remove" onClick={() => patchProps(isText && !isBadge ? applyGlyphMaterial(node.props, null) : applySurfaceMaterial(node.props, null, { asButtonSurface: isButton }), "Removed material")}>Reset Material</button>
          </div>;
        }
        // Fill / Border pages reuse solid colors + border helpers
        if (appearancePage === "solid-colors") {
          return <div className="space-y-3" data-testid="appearance-fill-controls">
            <button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="appearance-back" onClick={() => deepLeft?.setNestedPage("overview")}>← Appearance</button>
            <p className="text-[10px] font-semibold uppercase text-white/55">Fill</p>
            {colorMixed.kind === "mixed" || fillMixed.kind === "mixed" ? <p className="text-[10px] text-amber-100" data-testid="appearance-mixed-value">Mixed</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-white/65">Solid<input type="color" value={toColorInputValue(isTextLike ? node.props.color : (node.props.fill || node.props.color), "#fbbf24")} onChange={(event) => patchProps(isTextLike ? { color: event.target.value, gradientFill: undefined } : isButton ? { fill: event.target.value, buttonSurfaceKind: "solid", gradientFill: undefined, gradientStart: undefined, gradientEnd: undefined, surfaceFillKind: "solid" } : { fill: event.target.value, gradientFill: undefined, gradientStart: undefined, gradientEnd: undefined, surfaceFillKind: "solid" }, "Changed fill")} className={fieldClass} /></label>
              <button type="button" className={buttonClass} data-testid="appearance-open-gradient" onClick={() => deepLeft?.setNestedPage("gradient-colors")}>Gradient</button>
            </div>
          </div>;
        }
        if (appearancePage === "gradient-colors" || appearancePage === "all-gradients") {
          const surfaceGradient = (node.props.gradientModel as GradientModel | undefined)
            || normalizeGradient({
              ...DEFAULT_GRADIENT,
              stops: [
                { id: "a", color: String(node.props.gradientStart || node.props.fill || "#fbbf24").slice(0, 7), position: 0, opacity: 1 },
                { id: "b", color: String(node.props.gradientEnd || "#0f172a").slice(0, 7), position: 100, opacity: 1 },
              ],
            });
          return <div className="space-y-3" data-testid="appearance-gradient-controls" data-gradient-target="surface">
            <button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="appearance-back" onClick={() => deepLeft?.setNestedPage("solid-colors")}>← Fill</button>
            <p className="text-[10px] font-semibold uppercase text-white/55">Gradient</p>
            <GradientStudio
              value={surfaceGradient}
              onChange={(next) => {
                const css = gradientToCss(next);
                // Button parent Surface owns gradientStart/End — never label glyph gradientFill.
                if (isButton) {
                  patchProps({
                    buttonSurfaceKind: "gradient",
                    gradientStart: next.stops[0]?.color,
                    gradientEnd: next.stops[next.stops.length - 1]?.color,
                    gradientAngle: next.angle,
                    gradientModel: next,
                    gradientFill: undefined,
                    labelGradientFill: undefined,
                    surfaceFillKind: "gradient",
                  }, "Changed Button Surface gradient");
                  return;
                }
                patchProps({
                  gradientFill: css,
                  gradientModel: next,
                  gradientStart: next.stops[0]?.color,
                  gradientEnd: next.stops[next.stops.length - 1]?.color,
                  gradientAngle: next.angle,
                  fill: undefined,
                  surfaceFillKind: "gradient",
                }, "Changed surface gradient");
              }}
            />
          </div>;
        }
        if (appearancePage === "style" || appearancePage === "width" || appearancePage === "color" || appearancePage === "radius") {
          return <div className="space-y-3" data-testid="appearance-border-controls">
            <button type="button" className="text-[10px] text-[#b8ff2c]" data-testid="appearance-back" onClick={() => deepLeft?.setNestedPage("overview")}>← Appearance</button>
            <p className="text-[10px] font-semibold uppercase text-white/55">Border</p>
            <div className="grid grid-cols-5 gap-1">{(["none", "solid", "dashed", "dotted", "double"] as const).map((style) => <button key={style} type="button" className={buttonClass} data-testid={`border-style-${style}`} onClick={() => patchProps(style === "none" ? { ...clearBorderProps(node.props), borderStyle: "none", borderWidth: 0 } : applyBorderProps(node.props, { style, width: Math.max(1, Number(node.props.borderWidth || 1)) }), style === "none" ? "Removed border" : `Changed border to ${style}`)}>{style === "none" ? "None" : style}</button>)}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-white/65">Width<input type="number" min={0} max={24} value={Number(node.props.borderWidth || 0)} onChange={(event) => patchProps({ borderWidth: Number(event.target.value), borderStyle: Number(event.target.value) > 0 ? String(node.props.borderStyle || "solid") : "none" }, "Changed border width")} className={fieldClass} /></label>
              <label className="text-[10px] text-white/65">Color<input type="color" value={String(node.props.borderColor || "#ffffff").slice(0, 7)} onChange={(event) => patchProps({ borderColor: event.target.value }, "Changed border color")} className={fieldClass} /></label>
              <label className="text-[10px] text-white/65">Radius<input type="number" min={0} max={999} value={Number(node.props.radius || 0)} onChange={(event) => patchProps({ radius: Number(event.target.value) }, "Changed corner radius")} className={fieldClass} /></label>
            </div>
          </div>;
        }
        // Fallback overview
        return <div className="space-y-3" data-testid="appearance-category-overview">
          <button type="button" className="text-[10px] text-[#b8ff2c]" onClick={() => deepLeft?.setNestedPage("overview")}>← Appearance</button>
          <div className="grid grid-cols-1 gap-2">
            {categories.map((category) => (
              <button key={category.id} type="button" className="min-h-12 rounded-xl border border-white/12 px-3 text-left" data-testid={`appearance-category-${category.id}`} onClick={() => deepLeft?.setNestedPage(category.id === "effects" ? "effects" : category.id === "material" ? "metallic" : "solid-colors")}>{category.label}</button>
            ))}
          </div>
        </div>;
      })() : null}
      {focus === "animate" ? <div className="space-y-3" data-testid={isButton ? "button-motion-controls" : undefined}><div className="grid grid-cols-2 gap-2">{MOTION_PRESETS.map((preset) => <button key={preset.id} type="button" aria-pressed={node.props.motionPreset === preset.id} className="min-h-12 rounded border border-white/15 text-xs hover:border-[#b8ff2c]/50 aria-pressed:border-[#b8ff2c] aria-pressed:bg-[#b8ff2c]/10" onClick={() => patchProps({ motionPreset: preset.id }, `Changed animation to ${preset.label}`)}>{preset.label}</button>)}</div>{isButton ? <><div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/65">Intensity<input aria-label="Button motion intensity" type="range" min={0} max={100} value={Number(node.props.motionIntensity || 50)} onChange={(event) => patchProps({ motionIntensity: Number(event.target.value) }, "Changed Button motion intensity")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Speed (seconds)<input aria-label="Button motion speed" type="number" min={0.4} max={12} step={0.1} value={Number(node.props.motionSpeedSeconds || 2.4)} onChange={(event) => patchProps({ motionSpeedSeconds: Number(event.target.value) }, "Changed Button motion speed")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Delay (seconds)<input aria-label="Button motion delay" type="number" min={0} max={12} step={0.1} value={Number(node.props.motionDelaySeconds || 0)} onChange={(event) => patchProps({ motionDelaySeconds: Number(event.target.value) }, "Changed Button motion delay")} className={fieldClass} /></label><label className="text-[10px] text-white/65">Repeat<select aria-label="Button motion repeat" value={String(node.props.motionPlay || "gentle_repeat")} onChange={(event) => patchProps({ motionPlay: event.target.value }, "Changed Button motion repeat")} className={fieldClass}><option value="once">Once</option><option value="gentle_repeat">Gentle repeat</option><option value="interaction">On interaction</option></select></label><label className="text-[10px] text-white/65">Trigger<select aria-label="Button motion trigger" value={String(node.props.motionTrigger || "load")} onChange={(event) => patchProps({ motionTrigger: event.target.value }, "Changed Button motion trigger")} className={fieldClass}><option value="load">On enter</option><option value="hover">Hover</option><option value="tap">Tap</option><option value="attention">Attention cycle</option></select></label><label className="text-[10px] text-white/65">Reduced-motion fallback<select aria-label="Button reduced motion fallback" value={String(node.props.reducedMotionFallback || "none")} onChange={(event) => patchProps({ reducedMotionFallback: event.target.value }, "Changed Button reduced-motion fallback")} className={fieldClass}><option value="none">None</option><option value="static_glow">Static glow</option><option value="static_highlight">Static highlight</option></select></label></div><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={previewMotion} className={buttonClass} onClick={onPreviewMotion}>{previewMotion ? "Stop motion preview" : "Preview motion"}</button><button type="button" className={buttonClass} onClick={onRestartMotion}>Restart</button><label className="col-span-2 flex min-h-9 items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={reducedMotionSimulation} onChange={(event) => onReducedMotionSimulation?.(event.target.checked)} />Simulate reduced motion</label></div></> : null}</div> : null}
      {focus === "position" ? <div className="space-y-3 text-xs" data-testid="element-position-controls"><div className="grid grid-cols-2 gap-2">{[["Forward", bringForward], ["Backward", sendBackward], ["To front", bringToFront], ["To back", sendToBack]].map(([label, operation]) => <button key={String(label)} type="button" className="min-h-10 rounded border border-white/15" onClick={() => replace({ ...block, nodes: (operation as typeof bringForward)(block.nodes, node.id) }, `${label} Element`)}>{String(label)}</button>)}</div><div className="grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map((key) => <label key={key} className="capitalize">{key}<input type="number" step="1" value={Math.round(node[key] * 100)} onChange={(event) => patch({ [key]: Number(event.target.value) / 100 }, `Changed Element ${key}`)} className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2" /></label>)}<label className="col-span-2">Rotation<input type="number" value={Math.round(node.rotationDeg || 0)} onChange={(event) => patch({ rotationDeg: Number(event.target.value) }, "Rotated Element")} className="mt-1 h-9 w-full rounded border border-white/15 bg-transparent px-2" /></label></div><label className="flex min-h-9 items-center gap-2 text-[10px] text-white/70"><input type="checkbox" checked={node.props.aspectLocked === true} onChange={(event) => patchProps({ aspectLocked: event.target.checked }, event.target.checked ? "Locked aspect ratio" : "Unlocked aspect ratio")} />Ratio lock</label><div><p className="mb-1 text-[10px] font-semibold uppercase text-white/45">Align</p><div className="grid grid-cols-3 gap-1">{([["Left", { x: 0 }], ["Center", { x: Math.max(0, (1 - node.width) / 2) }], ["Right", { x: Math.max(0, 1 - node.width) }], ["Top", { y: 0 }], ["Middle", { y: Math.max(0, (1 - node.height) / 2) }], ["Bottom", { y: Math.max(0, 1 - node.height) }]] as const).map(([label, next]) => <button key={label} type="button" className={buttonClass} data-testid={`align-${label.toLowerCase()}`} onClick={() => patch(next, `Aligned ${label.toLowerCase()}`)}>{label}</button>)}</div></div><div><p className="mb-1 text-[10px] font-semibold uppercase text-white/45">Nudge</p><div className="grid grid-cols-4 gap-1">{([["←", { x: Math.max(0, node.x - 0.01) }], ["→", { x: Math.min(1 - node.width, node.x + 0.01) }], ["↑", { y: Math.max(0, node.y - 0.01) }], ["↓", { y: Math.min(1 - node.height, node.y + 0.01) }]] as const).map(([label, next]) => <button key={label} type="button" className={buttonClass} onClick={() => patch(next, "Nudged Element")}>{label}</button>)}</div></div>{section ? <button type="button" className={`${buttonClass} w-full`} onClick={() => model.moveElementsTo?.([node.id], section.id, null)}>Move to Card</button> : null}{objectFamily !== "container" ? <button type="button" className={`${buttonClass} w-full`} onClick={() => { const host = block.nodes.find((candidate) => String(candidate.props.componentKind || "") === "container"); if (!host) return model.notify?.("Add a Container first, then use Layers to nest this object"); patchProps({ containerId: host.id }, "Moved Element into Container"); }}>Move to Container</button> : null}</div> : null}
      {focus === "more" ? <div className="grid grid-cols-2 gap-2" data-testid="common-more-menu"><button type="button" className={buttonClass} onClick={() => navigator.clipboard?.writeText(JSON.stringify(node))}>Copy</button><button type="button" className={buttonClass} onClick={() => copyCompositionNodeStyle(node)}>Copy style</button><button type="button" disabled={!hasCompositionStyleClipboard()} className={buttonClass} onClick={() => { const pasted = pasteCompositionNodeStyle(block.nodes, node.id).find((candidate) => candidate.id === node.id); if (pasted) patch({ props: pasted.props }, "Pasted object style"); }}>Paste style</button><button type="button" className={buttonClass} onClick={duplicate}>Duplicate</button><button type="button" className={buttonClass} onClick={() => patch({ locked: !node.locked }, node.locked ? "Unlocked Element" : "Locked Element")}>{node.locked ? "Unlock" : "Lock"}</button><button type="button" className={buttonClass} onClick={() => patch({ visible: node.visible === false }, node.visible === false ? "Showed Element" : "Hid Element")}>{node.visible === false ? "Show" : "Hide"}</button><button type="button" className={buttonClass} onClick={() => patch({ rotationDeg: 0, x: .1, y: .1 }, "Reset transform")}>Reset transform</button><button type="button" className={buttonClass} onClick={() => patchProps({ materialPreset: undefined, gradientFill: undefined, glow: 0, shadow: 0, boxGlow: 0, boxShadow: 0, opacity: 1, surfaceOpacity: 1 }, "Reset Appearance")}>Reset Appearance</button>{section ? <button type="button" className={buttonClass} onClick={() => model.moveElementsTo?.([node.id], section.id, null)}>Move to Card</button> : null}{containerParent && containerParent.id !== node.id ? <button type="button" className={buttonClass} onClick={() => { model.setSelectedCompositionNodeIds?.([containerParent.id]); }}>Select parent</button> : null}{objectFamily === "container" && node.props.contentEditing === true ? <button type="button" className={buttonClass} onClick={() => patchProps({ contentEditing: false, selectionMode: "parent" }, "Finished editing contents")}>Finish editing contents</button> : null}<button type="button" className={`${buttonClass} text-red-200`} data-testid="more-delete" onClick={remove}>Delete</button><button type="button" className={buttonClass} onClick={() => { closeFocus(); onAdvanced(); }}>Advanced</button></div> : null}
      </div>
    </EditorPanelShell> : null}
  </div>;
}
