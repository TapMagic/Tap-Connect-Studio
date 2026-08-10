"use client";

import { useMemo, useState } from "react";
import {
  CURATED_FAMILY_BRIGHT_LACQUER_ID,
  CURATED_FAMILY_MISSION_CONTROL_ID,
  LACQUER_PROOF_COLORS,
  VISUAL_PARTS_DRAWER_CONTRACT,
  applyColorRefinement,
  applyCuratedFamily,
  applyIconStationAnchor,
  applyIconStationContent,
  applyIconStationPosition,
  applyIconStationScale,
  applySurfaceMode,
  applySurfaceParameters,
  applyVisualPart,
  applyVisualPartBaseColor,
  applyBrandRecipeToProps,
  createHostBrandRecipe,
  curatedFamilyIngredientIds,
  getVisualPart,
  listBrandRecipes,
  listVisualParts,
  readRefinementFromProps,
  type BrandRecipe,
  partCompatibleWithTarget,
  partTilePreviewBackground,
  partTilePreviewKind,
  readVisualPartsState,
  removeVisualPartSocket,
  type IconStationAnchor,
  type IconStationPosition,
  type VisualPartCollection,
  type VisualPartDefinition,
  type VisualPartTargetFamily,
  type VisualPartsDrawerId,
} from "@/lib/fusion/creative-studio/visual-parts";

type Props = {
  props: Record<string, unknown>;
  targetFamily: VisualPartTargetFamily;
  onPatch: (next: Record<string, unknown>, label: string) => void;
  /** Opens existing Color / Text / Action / Motion authorities without duplicating them. */
  onPassthrough?: (kind: "color" | "text" | "action" | "motion" | "advanced") => void;
  hostBrandRecipes?: BrandRecipe[];
  onSaveBrandRecipe?: (recipe: BrandRecipe) => void;
};

const DRAWER_ORDER: VisualPartsDrawerId[] = [
  "curated",
  "hero",
  "body",
  "finish",
  "color",
  "frame_ring",
  "icon_image",
  "mount",
  "accents",
  "text",
  "layout",
  "divider",
  "surface_zone",
  "bottom_stop",
  "action",
  "motion",
  "advanced",
];

function PartTile({
  part,
  active,
  disabledReason,
  onApply,
}: {
  part: VisualPartDefinition;
  active: boolean;
  disabledReason?: string;
  onApply: () => void;
}) {
  const preview = partTilePreviewBackground(part);
  const previewKind = partTilePreviewKind(part);

  return (
    <button
      type="button"
      disabled={Boolean(disabledReason)}
      title={disabledReason || part.label}
      aria-pressed={active}
      data-testid={`vp-part-${part.id}`}
      data-vp-collection={part.collection}
      data-vp-active={active ? "true" : "false"}
      data-vp-preview-part={part.id}
      data-vp-preview-kind={previewKind || undefined}
      className={`relative min-h-16 overflow-hidden rounded border px-2 py-1.5 text-left text-[10px] ${
        active ? "border-[#b8ff2c]/80 bg-[#b8ff2c]/10" : "border-white/15 hover:border-[#b8ff2c]/50"
      } ${disabledReason ? "opacity-40" : ""}`}
      onClick={onApply}
    >
      {preview ? (
        <span
          aria-hidden
          className="absolute inset-0 opacity-80"
          data-testid={`vp-part-preview-${part.id}`}
          style={{ background: preview }}
        />
      ) : null}
      <span className="relative z-[1] font-semibold text-white drop-shadow">{part.label}</span>
      <span className="relative z-[1] mt-0.5 block text-[9px] uppercase tracking-wide text-white/70">
        {part.collection === "tapconnect_signature" ? "Signature" : "Foundation"}
      </span>
      {disabledReason ? (
        <span className="relative z-[1] mt-1 block text-[9px] text-amber-200">{disabledReason}</span>
      ) : null}
    </button>
  );
}

export function VisualPartsCabinetPanel({
  props,
  targetFamily,
  onPatch,
  onPassthrough,
  hostBrandRecipes = [],
  onSaveBrandRecipe,
}: Props) {
  const [drawer, setDrawer] = useState<VisualPartsDrawerId>("curated");
  const [collection, setCollection] = useState<"all" | VisualPartCollection>("all");
  const [brandRecipeName, setBrandRecipeName] = useState("");
  const state = readVisualPartsState(props);
  const brandRecipes = useMemo(() => listBrandRecipes(hostBrandRecipes), [hostBrandRecipes]);
  const contract = VISUAL_PARTS_DRAWER_CONTRACT[drawer];

  const parts = useMemo(() => {
    const listed = listVisualParts({
      collection: collection === "all" ? undefined : collection,
      targetFamily,
    }).filter((part) => contract.categories.includes(part.category));
    return listed;
  }, [collection, contract.categories, targetFamily]);

  const ingredients = curatedFamilyIngredientIds(
    state.curatedFamilyId || CURATED_FAMILY_BRIGHT_LACQUER_ID
  );

  const currentHandle = (() => {
    switch (drawer) {
      case "curated":
        return state.curatedFamilyId || "—";
      case "body":
        return state.bodyPartId || "—";
      case "finish":
        return state.finishPartId || "—";
      case "color":
        return state.baseColor || "—";
      case "frame_ring":
        return state.rimPartId || "—";
      case "icon_image":
        return `${state.iconStationGeometryPartId || "—"} · ${state.iconStationPosition || "—"}`;
      case "accents":
        return state.accentPartId || "—";
      case "layout":
        return state.layoutIntent || "—";
      case "divider":
        return state.dividerLinePartId || "—";
      case "surface_zone":
        return state.actionSurfacePartId || "—";
      case "mount":
        return state.mountPartId || "—";
      case "bottom_stop":
        return state.bottomStopPartId || "—";
      case "hero":
        return state.heroStructure || "—";
      case "motion":
        return state.interactionPartId || (contract.passthrough ? "passthrough" : "—");
      default:
        return contract.passthrough ? "passthrough" : "—";
    }
  })();

  function applyPart(partId: string) {
    const compat = partCompatibleWithTarget(partId, targetFamily);
    if (!compat.compatible) return;
    if (partId === CURATED_FAMILY_BRIGHT_LACQUER_ID || getVisualPart(partId)?.payload.kind === "curated_family") {
      onPatch(applyCuratedFamily(props, partId, targetFamily), `Applied curated family`);
      return;
    }
    const result = applyVisualPart(props, partId, {
      targetFamily,
      baseColor: state.baseColor || undefined,
    });
    if (result.ok) onPatch(result.props, `Applied Visual Part ${getVisualPart(partId)?.label || partId}`);
  }

  return (
    <div className="space-y-3" data-testid="visual-parts-cabinet" data-vp-target-family={targetFamily}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">Visual Parts Cabinet</p>
          <p className="text-[11px] text-white/75">Studio-wide parts · Foundation + Signature collections</p>
        </div>
        <div className="flex gap-1" data-testid="vp-collection-filter">
          {(["all", "foundation", "tapconnect_signature"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`rounded px-2 py-1 text-[9px] ${collection === id ? "bg-[#b8ff2c]/20 text-[#d8f59a]" : "text-white/60 hover:bg-white/10"}`}
              data-testid={`vp-filter-${id}`}
              aria-pressed={collection === id}
              onClick={() => setCollection(id)}
            >
              {id === "all" ? "All" : id === "foundation" ? "Foundation" : "Signature"}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-white/70"
        data-testid="vp-drawer-handle"
        data-vp-drawer={drawer}
        data-vp-current={String(currentHandle)}
      >
        <span className="font-semibold text-[#b8ff2c]">{contract.label}</span>
        {" · current: "}
        <span data-testid="vp-current-choice">{currentHandle}</span>
      </div>

      <div className="flex flex-wrap gap-1" data-testid="vp-drawer-rail">
        {DRAWER_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`vp-drawer-${id}`}
            aria-pressed={drawer === id}
            className={`rounded px-2 py-1 text-[9px] ${drawer === id ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10"}`}
            onClick={() => {
              const pass = VISUAL_PARTS_DRAWER_CONTRACT[id].passthrough;
              // Motion hosts in-cabinet Interaction parts — stay in Cabinet; intensity uses Open Motion.
              if (pass && onPassthrough && id !== "motion" && id !== "color") {
                onPassthrough(pass);
                return;
              }
              setDrawer(id);
            }}
          >
            {VISUAL_PARTS_DRAWER_CONTRACT[id].label}
          </button>
        ))}
      </div>

      {drawer === "curated" ? (
        <div className="space-y-2" data-testid="vp-curated-panel">
          <PartTile
            part={getVisualPart(CURATED_FAMILY_BRIGHT_LACQUER_ID)!}
            active={state.curatedFamilyId === CURATED_FAMILY_BRIGHT_LACQUER_ID}
            onApply={() => applyPart(CURATED_FAMILY_BRIGHT_LACQUER_ID)}
          />
          <PartTile
            part={getVisualPart(CURATED_FAMILY_MISSION_CONTROL_ID)!}
            active={state.curatedFamilyId === CURATED_FAMILY_MISSION_CONTROL_ID}
            onApply={() => applyPart(CURATED_FAMILY_MISSION_CONTROL_ID)}
          />
          {state.curatedFamilyId ? (
            <div className="rounded border border-white/10 p-2" data-testid="vp-customize-ingredients">
              <p className="mb-1 text-[9px] font-semibold uppercase text-white/50">Customize · underlying part IDs</p>
              <ul className="space-y-0.5 text-[10px] text-white/75">
                {Object.entries(ingredients || {}).map(([key, id]) => (
                  <li key={key} data-testid={`vp-ingredient-${key}`} data-part-id={id || ""}>
                    {key}: <code>{id}</code>
                    {key === "finish" && state.finishPartId === id ? " ✓" : ""}
                    {key === "rim" && state.rimPartId === id ? " ✓" : ""}
                    {key === "body" && state.bodyPartId === id ? " ✓" : ""}
                    {key === "accent" && state.accentPartId === id ? " ✓" : ""}
                    {key === "iconStation" && state.iconStationGeometryPartId === id ? " ✓" : ""}
                    {key === "mount" && state.mountPartId === id ? " ✓" : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[9px] text-white/45" data-testid="vp-assembly-id">
                Assembly recipe: {state.assemblyRecipeId || "—"}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {drawer === "finish" ||
      drawer === "body" ||
      drawer === "frame_ring" ||
      drawer === "accents" ||
      drawer === "layout" ||
      drawer === "divider" ||
      drawer === "surface_zone" ||
      drawer === "mount" ||
      drawer === "bottom_stop" ||
      drawer === "hero" ||
      drawer === "motion" ? (
        <div className="grid grid-cols-2 gap-1.5" data-testid={`vp-drawer-body-${drawer}`}>
          {parts.map((part) => {
            const compat = partCompatibleWithTarget(part.id, targetFamily);
            const active =
              state.bodyPartId === part.id ||
              state.finishPartId === part.id ||
              state.rimPartId === part.id ||
              state.accentPartId === part.id ||
              state.dividerLinePartId === part.id ||
              state.actionSurfacePartId === part.id ||
              state.mountPartId === part.id ||
              state.bottomStopPartId === part.id ||
              state.interactionPartId === part.id ||
              (part.payload.kind === "layout" && state.layoutIntent === part.payload.intent) ||
              (part.payload.kind === "hero" && state.heroStructure === part.payload.structure);
            return (
              <PartTile
                key={part.id}
                part={part}
                active={Boolean(active)}
                disabledReason={compat.compatible ? undefined : compat.reason}
                onApply={() => applyPart(part.id)}
              />
            );
          })}
          {drawer === "frame_ring" ? (
            <button
              type="button"
              className="min-h-12 rounded border border-white/15 text-[10px] text-white/70"
              data-testid="vp-rim-reset"
              onClick={() => onPatch(removeVisualPartSocket(props, "surface.rim"), "Removed rim Visual Part")}
            >
              Remove rim
            </button>
          ) : null}
          {drawer === "accents" ? (
            <button
              type="button"
              className="min-h-12 rounded border border-white/15 text-[10px] text-white/70"
              data-testid="vp-accent-reset"
              onClick={() => onPatch(removeVisualPartSocket(props, "accent.left"), "Removed accent Visual Part")}
            >
              Remove accent
            </button>
          ) : null}
          {drawer === "mount" ? (
            <button
              type="button"
              className="min-h-12 rounded border border-white/15 text-[10px] text-white/70"
              data-testid="vp-mount-reset"
              onClick={() => onPatch(removeVisualPartSocket(props, "mount.plate"), "Removed Mount")}
            >
              Remove Mount
            </button>
          ) : null}
          {drawer === "motion" ? (
            <div className="col-span-2 space-y-2 rounded border border-white/10 p-2" data-testid="vp-motion-interaction">
              <p className="text-[9px] text-white/55">
                Quiet / Tactile / Mechanical are pointer-driven. Open Motion for intensity on animated presets.
              </p>
              <button
                type="button"
                className="w-full rounded border border-white/15 px-2 py-2 text-[10px]"
                data-testid="vp-open-motion-authority"
                onClick={() => onPassthrough?.("motion")}
              >
                Open Motion intensity
              </button>
            </div>
          ) : null}
          {drawer === "surface_zone" ? (
            <div className="col-span-2 space-y-2" data-testid="vp-surface-controls">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  data-testid="vp-surface-off"
                  className="rounded border border-white/15 px-2 py-2 text-[10px]"
                  onClick={() => onPatch(applySurfaceMode(props, false, "off", targetFamily), "Surface Off")}
                >
                  Surface Off
                </button>
                <button
                  type="button"
                  data-testid="vp-surface-on"
                  className="rounded border border-white/15 px-2 py-2 text-[10px]"
                  onClick={() => onPatch(applySurfaceMode(props, true, "quiet_field", targetFamily), "Surface On")}
                >
                  Surface On
                </button>
              </div>
              <label className="block text-[9px] text-white/55">
                Intensity
                <input
                  type="range"
                  min={0}
                  max={100}
                  data-testid="vp-surface-intensity"
                  value={Math.round((state.surfaceIntensity ?? 0.55) * 100)}
                  onChange={(e) =>
                    onPatch(
                      applySurfaceParameters(
                        props,
                        { intensity: Number(e.target.value) / 100 },
                        targetFamily
                      ),
                      "Surface intensity"
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-[9px] text-white/55">
                Depth
                <input
                  type="range"
                  min={0}
                  max={100}
                  data-testid="vp-surface-depth"
                  value={Math.round((state.surfaceDepth ?? 0.45) * 100)}
                  onChange={(e) =>
                    onPatch(
                      applySurfaceParameters(
                        props,
                        { depth: Number(e.target.value) / 100 },
                        targetFamily
                      ),
                      "Surface depth"
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {drawer === "finish" ? (
        <div className="space-y-2 rounded border border-white/10 p-2" data-testid="vp-finish-color-independence">
          <p className="text-[9px] font-semibold uppercase text-white/50">Base Color (Finish stays Lacquer/Acrylic)</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                ["black", LACQUER_PROOF_COLORS.black],
                ["red", LACQUER_PROOF_COLORS.red],
                ["green", LACQUER_PROOF_COLORS.green],
                ["blue", LACQUER_PROOF_COLORS.blue],
              ] as const
            ).map(([token, hex]) => (
              <button
                key={token}
                type="button"
                data-testid={`vp-lacquer-color-${token}`}
                aria-label={`Base color ${token}`}
                className="min-h-12 rounded border border-white/20"
                style={{ background: hex }}
                onClick={() =>
                  onPatch(
                    applyVisualPartBaseColor(props, hex, targetFamily),
                    `Changed lacquer base color to ${token}`
                  )
                }
              />
            ))}
          </div>
          <p className="text-[9px] text-white/45" data-testid="vp-finish-id">
            Finish part: {state.finishPartId || "—"} · Base: {state.baseColor || "—"}
          </p>
        </div>
      ) : null}

      {drawer === "icon_image" ? (
        <div className="space-y-2" data-testid="vp-icon-station-panel">
          <div className="grid grid-cols-2 gap-1.5">
            {listVisualParts({ category: "icon_station", targetFamily }).map((part) => (
              <PartTile
                key={part.id}
                part={part}
                active={
                  state.iconStationGeometryPartId === part.id ||
                  state.iconStationBackingPartId === part.id
                }
                onApply={() => applyPart(part.id)}
              />
            ))}
          </div>
          <p className="text-[9px] font-semibold uppercase text-white/50">Position</p>
          <div className="grid grid-cols-4 gap-1" data-testid="vp-icon-position">
            {(["left", "right", "both", "none"] as IconStationPosition[]).map((pos) => (
              <button
                key={pos}
                type="button"
                data-testid={`vp-icon-pos-${pos}`}
                aria-pressed={state.iconStationPosition === pos}
                className={`rounded px-2 py-1.5 text-[10px] capitalize ${
                  state.iconStationPosition === pos ? "bg-[#b8ff2c]/20 text-[#d8f59a]" : "border border-white/15 text-white/70"
                }`}
                onClick={() => onPatch(applyIconStationPosition(props, pos), `Icon Station ${pos}`)}
              >
                {pos}
              </button>
            ))}
          </div>
          <p className="text-[9px] font-semibold uppercase text-white/50">Size (MIN ↔ MAX)</p>
          <input
            type="range"
            min={0}
            max={100}
            data-testid="vp-icon-scale"
            value={Math.round((state.iconStationScale ?? 0.45) * 100)}
            onChange={(e) =>
              onPatch(applyIconStationScale(props, Number(e.target.value) / 100), "Icon Station scale")
            }
            className="w-full"
          />
          <p className="text-[9px] font-semibold uppercase text-white/50">Anchor</p>
          <div className="grid grid-cols-2 gap-1" data-testid="vp-icon-anchor">
            {(
              [
                "left_center",
                "right_center",
                "top_left",
                "top_right",
                "center_overlap",
              ] as IconStationAnchor[]
            ).map((anchor) => (
              <button
                key={anchor}
                type="button"
                data-testid={`vp-icon-anchor-${anchor}`}
                aria-pressed={state.iconStationAnchor === anchor}
                className={`rounded px-2 py-1.5 text-[9px] ${
                  state.iconStationAnchor === anchor
                    ? "bg-[#b8ff2c]/20 text-[#d8f59a]"
                    : "border border-white/15 text-white/70"
                }`}
                onClick={() => onPatch(applyIconStationAnchor(props, anchor), `Icon Station anchor ${anchor}`)}
              >
                {anchor.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <p className="text-[9px] font-semibold uppercase text-white/50">Content</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-2 text-[10px]"
              data-testid="vp-icon-library"
              onClick={() =>
                onPatch(
                  applyIconStationContent(props, { kind: "library", icon: "sparkles" }),
                  "Applied library Icon to Icon Station"
                )
              }
            >
              Library Icon
            </button>
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-2 text-[10px]"
              data-testid="vp-icon-secondary-phone"
              onClick={() =>
                onPatch(
                  applyIconStationContent(props, { kind: "library", icon: "phone", slot: "secondary" }),
                  "Secondary cue: phone"
                )
              }
            >
              Secondary: Phone
            </button>
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-2 text-[10px]"
              data-testid="vp-icon-secondary-arrow"
              onClick={() =>
                onPatch(
                  applyIconStationContent(props, {
                    kind: "library",
                    icon: "arrow-up-right",
                    slot: "secondary",
                  }),
                  "Secondary cue: arrow"
                )
              }
            >
              Secondary: Arrow
            </button>
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-2 text-[10px]"
              data-testid="vp-icon-upload-demo"
              onClick={() =>
                onPatch(
                  applyIconStationContent(props, {
                    kind: "upload",
                    mediaUrl: "/tap-connect-mark.png",
                    slot: "primary",
                    mediaAssetId: "demo-host-upload",
                  }),
                  "Applied uploaded logo/photo to Icon Station"
                )
              }
            >
              Uploaded logo/photo
            </button>
          </div>
          <p className="text-[9px] text-white/45">
            Both = primary left identity + secondary right cue — not mirrored duplicates.
          </p>
        </div>
      ) : null}

      {drawer === "color" ? (
        <div className="space-y-2" data-testid="vp-color-passthrough">
          <p className="text-[11px] text-white/70">Base Color + Finish-aware refinement (not a Material fork).</p>
          <button
            type="button"
            className="w-full rounded border border-white/15 px-2 py-2 text-[10px]"
            data-testid="vp-open-color-authority"
            onClick={() => onPassthrough?.("color")}
          >
            Open Color picker
          </button>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                ["black", LACQUER_PROOF_COLORS.black],
                ["red", LACQUER_PROOF_COLORS.red],
                ["green", LACQUER_PROOF_COLORS.green],
                ["blue", LACQUER_PROOF_COLORS.blue],
              ] as const
            ).map(([token, hex]) => (
              <button
                key={token}
                type="button"
                data-testid={`vp-color-${token}`}
                className="min-h-10 rounded border border-white/20"
                style={{ background: hex }}
                onClick={() =>
                  onPatch(applyVisualPartBaseColor(props, hex, targetFamily), `Base color ${token}`)
                }
              />
            ))}
          </div>
          <p className="text-[9px] font-semibold uppercase text-white/50">Brand Recipes</p>
          <div className="grid grid-cols-1 gap-1" data-testid="vp-brand-recipes">
            {brandRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                data-testid={`vp-brand-recipe-${recipe.id}`}
                data-vp-brand-source={recipe.source || "catalog"}
                className="rounded border border-white/15 px-2 py-2 text-left text-[10px]"
                onClick={() =>
                  onPatch(
                    applyVisualPartBaseColor(
                      applyBrandRecipeToProps(props, recipe.id, hostBrandRecipes),
                      recipe.anchorColor,
                      targetFamily
                    ),
                    `Brand Recipe ${recipe.label}`
                  )
                }
              >
                {recipe.label}
                {recipe.source === "host" ? " · Host" : ""}
              </button>
            ))}
          </div>
          <div className="space-y-1 rounded border border-white/10 p-2" data-testid="vp-brand-recipe-save">
            <p className="text-[9px] text-white/55">Save current color + refinement as a Brand Recipe</p>
            <input
              type="text"
              data-testid="vp-brand-recipe-name"
              placeholder="Recipe name"
              value={brandRecipeName}
              onChange={(e) => setBrandRecipeName(e.target.value)}
              className="h-9 w-full rounded border border-white/15 bg-black/30 px-2 text-[11px]"
            />
            <button
              type="button"
              data-testid="vp-brand-recipe-save-btn"
              className="min-h-10 w-full rounded bg-[#b8ff2c] text-[11px] font-semibold text-black"
              onClick={() => {
                const current = readRefinementFromProps(props);
                const recipe = createHostBrandRecipe({
                  label: brandRecipeName || "Host Brand Recipe",
                  anchorColor: current.anchorColor,
                  refinement: current.refinement,
                });
                onSaveBrandRecipe?.(recipe);
                onPatch(
                  applyVisualPartBaseColor(
                    applyBrandRecipeToProps(props, recipe.id, [...hostBrandRecipes, recipe]),
                    recipe.anchorColor,
                    targetFamily
                  ),
                  `Saved Brand Recipe ${recipe.label}`
                );
                setBrandRecipeName("");
              }}
            >
              Save Brand Recipe
            </button>
          </div>
          <p className="text-[9px] font-semibold uppercase text-white/50">Refinement</p>
          {(
            [
              ["richness", "Richness"],
              ["depth", "Depth"],
              ["temperature", "Temperature"],
              ["contrast", "Contrast"],
              ["lightResponse", "Light response"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-[9px] text-white/55">
              {label}
              <input
                type="range"
                min={0}
                max={100}
                data-testid={`vp-refine-${key}`}
                value={Math.round((state.colorRefinement?.[key] ?? 0.55) * 100)}
                onChange={(e) =>
                  onPatch(
                    applyColorRefinement(
                      props,
                      {
                        ...(state.colorRefinement || {}),
                        [key]: Number(e.target.value) / 100,
                      },
                      targetFamily
                    ),
                    `Color ${label}`
                  )
                }
                className="mt-1 w-full"
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
