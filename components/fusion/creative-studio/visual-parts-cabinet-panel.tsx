"use client";

import { useMemo, useState } from "react";
import {
  ARC_EMBER_SIGNATURE_FAMILY_ID,
  SIGNATURE_FAMILIES,
  SIGNATURE_SUBGROUPS,
  listSignatureAssets,
  signatureAssetInsert,
  type SignatureAssetDefinition,
  type SignatureSubgroup,
} from "@/lib/fusion/creative-studio/signature-assets";
import {
  ARC_EMBER_PRISTINE_MASTER_PART_ID,
  ARC_EMBER_ROLE_PRESETS,
  applyArcEmberRolePreset,
  arcEmberPristineMasterInsertProps,
  CURATED_FAMILY_BRIGHT_LACQUER_ID,
  CURATED_FAMILY_COSMIC_GLASS_ID,
  CURATED_FAMILY_MISSION_CONTROL_ID,
  CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID,
  LACQUER_PROOF_COLORS,
  TOP_SHELF_ANCHOR_CHARCOAL,
  TOP_SHELF_ANCHOR_COBALT,
  TOP_SHELF_CANONICAL_RECIPE_ID,
  TOP_SHELF_LIFECYCLE_STATUS,
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
  readCosmicGlassParams,
  readArcEmberActionCue,
  readArcEmberRole,
  readTopShelfParams,
  resetTopShelfToCanonical,
  resetCosmicGlassToCanonical,
  writeTopShelfParams,
  writeCosmicGlassParams,
  writeArcEmberActionCue,
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
  onInsertSignatureAsset?: (asset: SignatureAssetDefinition) => void;
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
  dragPayload,
}: {
  part: VisualPartDefinition;
  active: boolean;
  disabledReason?: string;
  onApply: () => void;
  dragPayload?: { level: "element"; kind: "button"; initialProps: Record<string, unknown> };
}) {
  const preview = partTilePreviewBackground(part);
  const previewKind = partTilePreviewKind(part);

  return (
    <button
      type="button"
      draggable={Boolean(dragPayload)}
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
      onDragStart={(event) => {
        if (!dragPayload) return;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-tap-card-composer", JSON.stringify(dragPayload));
      }}
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

function SignatureAssetTile({ asset, onInsert }: { asset: SignatureAssetDefinition; onInsert?: (asset: SignatureAssetDefinition) => void }) {
  const payload = signatureAssetInsert(asset);
  return (
    <button
      type="button"
      draggable
      title={`${asset.label} · drag onto Card`}
      data-testid={`signature-asset-${asset.id.replaceAll("/", "-")}`}
      data-signature-asset-id={asset.id}
      data-signature-source-sha256={asset.sourceSha256}
      className="group relative min-h-24 overflow-hidden rounded border border-[#d56c2d]/35 bg-[#090604] p-2 text-left hover:border-[#f0a05e]/75"
      onClick={() => onInsert?.(asset)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-tap-card-composer", JSON.stringify(payload));
      }}
    >
      <span className="absolute inset-1 bg-contain bg-center bg-no-repeat opacity-75 transition-opacity group-hover:opacity-100" style={{ backgroundImage: `url('${asset.sourceAsset}')` }} aria-hidden />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-2 pb-1.5 pt-5">
        <span className="block font-semibold text-[#ffe1c2]">{asset.label}</span>
        <span className="block text-[8px] uppercase tracking-wide text-white/55">{asset.role} · drag to Card</span>
      </span>
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
  onInsertSignatureAsset,
}: Props) {
  const [drawer, setDrawer] = useState<VisualPartsDrawerId>("curated");
  const [collection, setCollection] = useState<VisualPartCollection>("foundation");
  const [signatureFamilyId, setSignatureFamilyId] = useState(ARC_EMBER_SIGNATURE_FAMILY_ID);
  const [signatureSubgroup, setSignatureSubgroup] = useState<SignatureSubgroup>("actions");
  const [brandRecipeName, setBrandRecipeName] = useState("");
  const state = readVisualPartsState(props);
  const brandRecipes = useMemo(() => listBrandRecipes(hostBrandRecipes), [hostBrandRecipes]);
  const contract = VISUAL_PARTS_DRAWER_CONTRACT[drawer];

  const parts = useMemo(() => {
    const listed = listVisualParts({
      collection,
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
    <div className="space-y-3" data-testid="visual-parts-cabinet" data-vp-target-family={targetFamily} onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>event.stopPropagation()}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">Visual Parts Cabinet</p>
          <p className="text-[11px] text-white/75">Studio-wide parts · Foundation + Signature collections</p>
        </div>
        <div className="flex gap-1" data-testid="vp-collection-filter">
          {(["foundation", "tapconnect_signature"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`rounded px-2 py-1 text-[9px] ${collection === id ? "bg-[#b8ff2c]/20 text-[#d8f59a]" : "text-white/60 hover:bg-white/10"}`}
              data-testid={`vp-filter-${id}`}
              aria-pressed={collection === id}
              onClick={() => setCollection(id)}
            >
              {id === "foundation" ? "Buttons" : "Signature"}
            </button>
          ))}
        </div>
      </div>

      {collection === "tapconnect_signature" ? (
        <div className="space-y-3" data-testid="signature-catalog" data-signature-family={signatureFamilyId}>
          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">Family</p>
            <div className="flex flex-wrap gap-1">
              {SIGNATURE_FAMILIES.map((family)=><button key={family.id} type="button" aria-pressed={signatureFamilyId===family.id} data-testid={`signature-family-${family.slug}`} className={`rounded border px-2 py-1 text-[10px] ${signatureFamilyId===family.id?"border-[#f0a05e]/80 bg-[#6f2e13]/35 text-[#ffe1c2]":"border-white/15 text-white/60"}`} onClick={()=>setSignatureFamilyId(family.id)}>{family.label}</button>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-1" data-testid="signature-subgroup-rail">
            {SIGNATURE_SUBGROUPS.map((group)=><button key={group.id} type="button" aria-pressed={signatureSubgroup===group.id} data-testid={`signature-subgroup-${group.id}`} className={`rounded px-2 py-1 text-[9px] uppercase tracking-wide ${signatureSubgroup===group.id?"bg-[#d56c2d]/25 text-[#ffd6b0]":"text-white/50 hover:bg-white/10"}`} onClick={()=>setSignatureSubgroup(group.id)}>{group.label}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-1.5" data-testid={`signature-assets-${signatureSubgroup}`}>
            {listSignatureAssets({familyId:signatureFamilyId,subgroup:signatureSubgroup}).map((asset)=><SignatureAssetTile key={asset.id} asset={asset} onInsert={onInsertSignatureAsset} />)}
          </div>
          <p className="text-[9px] text-white/45">Drag a pristine master onto the Card. Live sockets remain editable through the existing Text, Icon/Media, Action, and accessibility controls.</p>
        </div>
      ) : <>
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
        <div className="space-y-3" data-testid="vp-curated-panel">
          <div data-testid="vp-curated-pristine-masters" className="space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#e39a57]/90">Pristine Masters</p>
            <PartTile
              part={getVisualPart(ARC_EMBER_PRISTINE_MASTER_PART_ID)!}
              active={state.actionSurfacePartId === ARC_EMBER_PRISTINE_MASTER_PART_ID}
              onApply={() => applyPart(ARC_EMBER_PRISTINE_MASTER_PART_ID)}
              dragPayload={{ level: "element", kind: "button", initialProps: arcEmberPristineMasterInsertProps() }}
            />
            <div className="grid grid-cols-2 gap-1" data-testid="vp-arc-ember-role-inserts">
              {ARC_EMBER_ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  draggable
                  className="min-h-12 rounded border border-[#d56c2d]/30 bg-[#120804]/75 px-2 py-1.5 text-left text-[9px] text-[#ffd6b0] hover:border-[#f0a05e]/70"
                  data-testid={`vp-arc-ember-insert-${preset.id}`}
                  onClick={() => onPatch(applyArcEmberRolePreset(props, preset.id), `Arc Ember ${preset.label}`)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData("application/x-tap-card-composer", JSON.stringify({
                      level: "element",
                      kind: "button",
                      initialProps: arcEmberPristineMasterInsertProps(preset.id),
                    }));
                  }}
                >
                  <span className="block font-semibold">{preset.label}</span>
                  <span className="mt-0.5 block text-white/45">{preset.title}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/45">candidate · host-upload master · unchanged bitmap</p>
          </div>
          <div data-testid="vp-curated-enhanced" className="space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b8ff2c]/80">
              Enhanced
            </p>
            <PartTile
              part={getVisualPart(CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID)!}
              active={state.curatedFamilyId === CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID}
              onApply={() => applyPart(CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID)}
            />
            <p className="text-[9px] text-white/45" data-testid="vp-topshelf-lifecycle">
              status: {TOP_SHELF_LIFECYCLE_STATUS} · tier: enhanced · recipe: {TOP_SHELF_CANONICAL_RECIPE_ID}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Signature</p>
            <PartTile
              part={getVisualPart(CURATED_FAMILY_COSMIC_GLASS_ID)!}
              active={state.curatedFamilyId === CURATED_FAMILY_COSMIC_GLASS_ID}
              onApply={() => applyPart(CURATED_FAMILY_COSMIC_GLASS_ID)}
            />
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
          </div>
          {state.curatedFamilyId === CURATED_FAMILY_TOP_SHELF_PREMIUM_ACTION_ID ? (
            <TopShelfControls props={props} onPatch={onPatch} onPassthrough={onPassthrough} />
          ) : null}
          {state.curatedFamilyId === CURATED_FAMILY_COSMIC_GLASS_ID ? (
            <CosmicGlassControls props={props} onPatch={onPatch} onPassthrough={onPassthrough} />
          ) : null}
          {state.actionSurfacePartId === ARC_EMBER_PRISTINE_MASTER_PART_ID ? (
            <ArcEmberPristineControls props={props} onPatch={onPatch} onPassthrough={onPassthrough} />
          ) : null}
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
      </>}
    </div>
  );
}

function TopShelfControls({
  props,
  onPatch,
  onPassthrough,
}: {
  props: Record<string, unknown>;
  onPatch: (next: Record<string, unknown>, label: string) => void;
  onPassthrough?: (kind: "color" | "text" | "action" | "motion" | "advanced") => void;
}) {
  const params = readTopShelfParams(props);
  return (
    <div className="space-y-2 rounded border border-[#b8ff2c]/25 bg-black/30 p-2" data-testid="vp-topshelf-controls">
      <p className="text-[9px] font-semibold uppercase text-[#d8f59a]">Top Shelf · Basic</p>
      <div className="grid grid-cols-2 gap-1" data-testid="vp-topshelf-anchor">
        {(
          [
            [TOP_SHELF_ANCHOR_CHARCOAL, "Charcoal"],
            [TOP_SHELF_ANCHOR_COBALT, "Cobalt"],
          ] as const
        ).map(([color, label]) => (
          <button
            key={color}
            type="button"
            data-testid={`vp-topshelf-anchor-${label.toLowerCase()}`}
            className={`rounded px-2 py-1.5 text-[10px] ${
              params.anchorColor.toLowerCase() === color.toLowerCase()
                ? "bg-[#b8ff2c]/20 text-[#d8f59a]"
                : "border border-white/15 text-white/70"
            }`}
            onClick={() => onPatch(writeTopShelfParams(props, { anchorColor: color }), `Top Shelf Anchor ${label}`)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1" data-testid="vp-topshelf-ring-placement">
        {(["left", "right"] as const).map((side) => (
          <button
            key={side}
            type="button"
            data-testid={`vp-topshelf-ring-${side}`}
            className={`rounded px-2 py-1.5 text-[10px] ${
              params.iconRingPlacement === side
                ? "bg-[#b8ff2c]/20 text-[#d8f59a]"
                : "border border-white/15 text-white/70"
            }`}
            onClick={() =>
              onPatch(writeTopShelfParams(props, { iconRingPlacement: side }), `Top Shelf Icon Ring ${side}`)
            }
          >
            Ring {side}
          </button>
        ))}
      </div>
      <p className="text-[9px] font-semibold uppercase text-white/50">Contextual</p>
      <label className="block text-[9px] text-white/55">
        Halo intensity
        <input
          type="range"
          min={0}
          max={100}
          data-testid="vp-topshelf-halo"
          value={Math.round(params.haloIntensity * 100)}
          onChange={(e) =>
            onPatch(
              writeTopShelfParams(props, { haloIntensity: Number(e.target.value) / 100 }),
              "Top Shelf Halo intensity"
            )
          }
          className="mt-1 w-full"
        />
      </label>
      <button
        type="button"
        data-testid="vp-topshelf-toggle-description"
        className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75"
        onClick={() =>
          onPatch(
            writeTopShelfParams(props, { descriptionVisible: !params.descriptionVisible }),
            "Top Shelf description visibility"
          )
        }
      >
        Description: {params.descriptionVisible ? "On" : "Off"}
      </button>
      <button
        type="button"
        data-testid="vp-topshelf-open-text"
        className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75"
        onClick={() => onPassthrough?.("text")}
      >
        Typography (Text authority)
      </button>
      <p className="text-[9px] font-semibold uppercase text-white/50">Advanced</p>
      <label className="block text-[9px] text-white/55">
        Gloss / reflection
        <input
          type="range"
          min={0}
          max={100}
          data-testid="vp-topshelf-gloss"
          value={Math.round(params.glossIntensity * 100)}
          onChange={(e) =>
            onPatch(
              writeTopShelfParams(props, {
                glossIntensity: Number(e.target.value) / 100,
                reflectionIntensity: Number(e.target.value) / 100,
              }),
              "Top Shelf gloss"
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
          data-testid="vp-topshelf-depth"
          value={Math.round(params.depth * 100)}
          onChange={(e) =>
            onPatch(writeTopShelfParams(props, { depth: Number(e.target.value) / 100 }), "Top Shelf depth")
          }
          className="mt-1 w-full"
        />
      </label>
      <button
        type="button"
        data-testid="vp-topshelf-reset-canonical"
        className="w-full rounded bg-white/10 px-2 py-2 text-[10px] font-semibold text-[#d8f59a]"
        onClick={() => onPatch(resetTopShelfToCanonical(props), "Reset Top Shelf to canonical")}
      >
        Reset appearance to canonical
      </button>
    </div>
  );
}

function CosmicGlassControls({
  props,
  onPatch,
  onPassthrough,
}: {
  props: Record<string, unknown>;
  onPatch: (next: Record<string, unknown>, label: string) => void;
  onPassthrough?: (kind: "color" | "text" | "action" | "motion" | "advanced") => void;
}) {
  const params = readCosmicGlassParams(props);
  return (
    <div className="space-y-2 rounded border border-[#1584ff]/35 bg-[#020713]/70 p-2" data-testid="vp-cosmic-glass-controls">
      <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#f0c34a]">Cosmic Glass · Signature</p>
      <div className="grid grid-cols-2 gap-1" data-testid="vp-cosmic-ring-finish">
        {(["gold", "copper"] as const).map((finish) => (
          <button key={finish} type="button" data-testid={`vp-cosmic-ring-${finish}`}
            className={`rounded px-2 py-1.5 text-[10px] ${params.ringFinish === finish ? "bg-[#0d72ff]/25 text-[#ffe49a]" : "border border-white/15 text-white/70"}`}
            onClick={() => onPatch(writeCosmicGlassParams(props, { ringFinish: finish }), `Cosmic Glass ${finish} ring`)}>
            {finish === "gold" ? "Gold ring" : "Copper ring"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1" data-testid="vp-cosmic-ring-shape">
        {(["round", "soft_square"] as const).map((shape) => (
          <button key={shape} type="button" data-testid={`vp-cosmic-shape-${shape}`}
            className={`rounded px-2 py-1.5 text-[10px] ${params.ringShape === shape ? "bg-[#0d72ff]/25 text-[#ffe49a]" : "border border-white/15 text-white/70"}`}
            onClick={() => onPatch(writeCosmicGlassParams(props, { ringShape: shape }), `Cosmic Glass ring shape`)}>
            {shape === "round" ? "Round" : "Soft square"}
          </button>
        ))}
      </div>
      <p className="text-[9px] font-semibold uppercase text-white/45">Identity aperture</p>
      <div className="grid grid-cols-3 gap-1" data-testid="vp-cosmic-identity-bezel">
        {(["medallion", "open_lens", "inset_plate"] as const).map((bezel) => (
          <button key={bezel} type="button" data-testid={`vp-cosmic-bezel-${bezel}`}
            className={`rounded px-1 py-1.5 text-[9px] ${params.identityBezel === bezel ? "bg-[#0d72ff]/25 text-[#ffe49a]" : "border border-white/15 text-white/65"}`}
            onClick={() => onPatch(writeCosmicGlassParams(props, { identityBezel: bezel }), "Cosmic Glass identity aperture")}>
            {bezel === "medallion" ? "Medallion" : bezel === "open_lens" ? "Open Lens" : "Inset Plate"}
          </button>
        ))}
      </div>
      <label className="block text-[9px] text-white/60">
        Identity scale · {Math.round(params.identityScale * 100)}%
        <input type="range" min={55} max={125} step={1} value={Math.round(params.identityScale * 100)} data-testid="vp-cosmic-identity-scale"
          className="mt-1 w-full accent-[#0d72ff]" onChange={(event) => onPatch(writeCosmicGlassParams(props, { identityScale: Number(event.target.value) / 100 }), "Cosmic Glass identity scale")} />
      </label>
      <div className="grid grid-cols-3 gap-1">
        {(["contain", "cover"] as const).map((fit) => (
          <button key={fit} type="button" data-testid={`vp-cosmic-identity-fit-${fit}`}
            className={`rounded px-1 py-1.5 text-[9px] ${params.identityFit === fit ? "bg-[#0d72ff]/25 text-[#ffe49a]" : "border border-white/15 text-white/65"}`}
            onClick={() => onPatch(writeCosmicGlassParams(props, { identityFit: fit }), "Cosmic Glass identity fit")}>{fit === "contain" ? "Fit" : "Fill"}</button>
        ))}
        <button type="button" data-testid="vp-cosmic-identity-center" className="rounded border border-white/15 px-1 py-1.5 text-[9px] text-white/65"
          onClick={() => onPatch(writeCosmicGlassParams(props, { identityPositionX: 0, identityPositionY: 0 }), "Center Cosmic Glass identity")}>Center</button>
      </div>
      <button type="button" data-testid="vp-cosmic-toggle-description" className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75"
        onClick={() => onPatch(writeCosmicGlassParams(props, { descriptionVisible: !params.descriptionVisible }), "Cosmic Glass description visibility")}>
        Description: {params.descriptionVisible ? "On" : "Off"}
      </button>
      <button type="button" data-testid="vp-cosmic-open-text" className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75" onClick={() => onPassthrough?.("text")}>Live copy (Text authority)</button>
      <button type="button" data-testid="vp-cosmic-open-action" className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75" onClick={() => onPassthrough?.("action")}>Destination (Action authority)</button>
      <p className="text-[9px] font-semibold uppercase text-white/45">Divider center</p>
      <div className="grid grid-cols-3 gap-1">
        {(["diamond", "identity", "none"] as const).map((center) => (
          <button key={center} type="button" data-testid={`vp-cosmic-divider-${center}`}
            className={`rounded px-1 py-1.5 text-[9px] ${params.dividerCenter === center ? "bg-[#0d72ff]/25 text-[#ffe49a]" : "border border-white/15 text-white/65"}`}
            onClick={() => onPatch(writeCosmicGlassParams(props, { dividerCenter: center }), "Cosmic Glass divider center")}>{center}</button>
        ))}
      </div>
      <label className="block text-[9px] text-white/60">
        Divider scale · {Math.round(params.dividerScale * 100)}%
        <input type="range" min={75} max={125} step={1} value={Math.round(params.dividerScale * 100)} data-testid="vp-cosmic-divider-scale"
          className="mt-1 w-full accent-[#0d72ff]" onChange={(event) => onPatch(writeCosmicGlassParams(props, { dividerScale: Number(event.target.value) / 100 }), "Cosmic Glass divider scale")} />
      </label>
      <label className="block text-[9px] text-white/60">
        Divider span · {Math.round(params.dividerSpan * 100)}%
        <input type="range" min={65} max={100} step={1} value={Math.round(params.dividerSpan * 100)} data-testid="vp-cosmic-divider-span"
          className="mt-1 w-full accent-[#0d72ff]" onChange={(event) => onPatch(writeCosmicGlassParams(props, { dividerSpan: Number(event.target.value) / 100 }), "Cosmic Glass divider span")} />
      </label>
      <label className="block text-[9px] text-white/60">
        Divider position · {Math.round(params.dividerPositionX * 100)}
        <input type="range" min={-100} max={100} step={1} value={Math.round(params.dividerPositionX * 100)} data-testid="vp-cosmic-divider-position"
          className="mt-1 w-full accent-[#0d72ff]" onChange={(event) => onPatch(writeCosmicGlassParams(props, { dividerPositionX: Number(event.target.value) / 100 }), "Cosmic Glass divider position")} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[9px] text-white/60">
          Intensity · {Math.round(params.dividerIntensity * 100)}%
          <input type="range" min={35} max={100} step={1} value={Math.round(params.dividerIntensity * 100)} data-testid="vp-cosmic-divider-intensity"
            className="mt-1 w-full accent-[#0d72ff]" onChange={(event) => onPatch(writeCosmicGlassParams(props, { dividerIntensity: Number(event.target.value) / 100 }), "Cosmic Glass divider intensity")} />
        </label>
        <label className="block text-[9px] text-white/60">
          Opacity · {Math.round(params.dividerOpacity * 100)}%
          <input type="range" min={25} max={100} step={1} value={Math.round(params.dividerOpacity * 100)} data-testid="vp-cosmic-divider-opacity"
            className="mt-1 w-full accent-[#0d72ff]" onChange={(event) => onPatch(writeCosmicGlassParams(props, { dividerOpacity: Number(event.target.value) / 100 }), "Cosmic Glass divider opacity")} />
        </label>
      </div>
      <button type="button" data-testid="vp-cosmic-reset-canonical" className="w-full rounded bg-white/10 px-2 py-2 text-[10px] font-semibold text-[#ffe49a]" onClick={() => onPatch(resetCosmicGlassToCanonical(props), "Reset Cosmic Glass to canonical")}>Reset appearance to canonical</button>
    </div>
  );
}

function ArcEmberPristineControls({
  props,
  onPatch,
  onPassthrough,
}: {
  props: Record<string, unknown>;
  onPatch: (next: Record<string, unknown>, label: string) => void;
  onPassthrough?: (kind: "color" | "text" | "action" | "motion" | "advanced") => void;
}) {
  const cue = readArcEmberActionCue(props);
  const role = readArcEmberRole(props);
  const fieldClass = "mt-1 h-8 w-full rounded border border-white/15 bg-black/30 px-2 text-[10px] text-white";
  return (
    <div className="space-y-2 rounded border border-[#d56c2d]/35 bg-[#120804]/70 p-2" data-testid="vp-arc-ember-pristine-controls">
      <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#f0a05e]">Arc Ember · Pristine Master</p>
      <p className="text-[9px] leading-4 text-white/50">Shell is immutable. Use Icon / Image for the live identity socket.</p>
      <p className="text-[9px] font-semibold uppercase text-white/45">Role preset</p>
      <div className="grid grid-cols-2 gap-1" data-testid="vp-arc-ember-role-controls">
        {ARC_EMBER_ROLE_PRESETS.map((preset) => (
          <button key={preset.id} type="button" data-testid={`vp-arc-ember-role-${preset.id}`}
            aria-pressed={role === preset.id}
            className={`rounded px-1 py-1.5 text-[9px] ${role === preset.id ? "bg-[#d56c2d]/25 text-[#ffd6b0]" : "border border-white/15 text-white/65"}`}
            onClick={() => onPatch(applyArcEmberRolePreset(props, preset.id), `Arc Ember ${preset.label}`)}>
            {preset.label}
          </button>
        ))}
      </div>
      <label className="block text-[9px] text-white/60">Eyebrow / supertitle
        <input className={fieldClass} value={String(props.eyebrow || "")} data-testid="vp-arc-ember-eyebrow"
          onChange={(event) => onPatch({ ...props, eyebrow: event.target.value }, "Arc Ember eyebrow")} />
      </label>
      <label className="block text-[9px] text-white/60">Subtext
        <input className={fieldClass} value={String(props.description || "")} data-testid="vp-arc-ember-subtext"
          onChange={(event) => onPatch({ ...props, description: event.target.value, showDescription: Boolean(event.target.value) }, "Arc Ember subtext")} />
      </label>
      <button type="button" data-testid="vp-arc-ember-open-text" className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75" onClick={() => onPassthrough?.("text")}>Live title, eyebrow & subtext</button>
      <p className="text-[9px] font-semibold uppercase text-white/45">Action cue</p>
      <div className="grid grid-cols-4 gap-1">
        {(["arrow", "chevron", "launch", "none"] as const).map((option) => (
          <button key={option} type="button" data-testid={`vp-arc-ember-cue-${option}`}
            className={`rounded px-1 py-1.5 text-[9px] ${cue === option ? "bg-[#d56c2d]/25 text-[#ffd6b0]" : "border border-white/15 text-white/65"}`}
            onClick={() => onPatch(writeArcEmberActionCue(props, option), "Arc Ember Action Cue")}>
            {option === "arrow" ? "→" : option === "chevron" ? "›" : option === "launch" ? "↗" : "Off"}
          </button>
        ))}
      </div>
      <label className="flex min-h-9 items-center gap-2 rounded border border-white/15 px-2 text-[9px] text-white/65">
        <input type="checkbox" checked={props.disabled === true} data-testid="vp-arc-ember-disabled"
          onChange={(event) => onPatch({ ...props, disabled: event.target.checked }, event.target.checked ? "Disabled Arc Ember" : "Enabled Arc Ember")} />
        Disabled state
      </label>
      <button type="button" data-testid="vp-arc-ember-open-action" className="w-full rounded border border-white/15 px-2 py-1.5 text-[10px] text-white/75" onClick={() => onPassthrough?.("action")}>Destination & accessibility</button>
    </div>
  );
}
