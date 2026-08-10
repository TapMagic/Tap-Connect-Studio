"use client";

import { useMemo, useState } from "react";
import {
  CURATED_FAMILY_BRIGHT_LACQUER_ID,
  LACQUER_PROOF_COLORS,
  POUNDED_COPPER_PART_ID,
  VISUAL_PARTS_DRAWER_CONTRACT,
  applyCuratedFamily,
  applyIconStationContent,
  applyIconStationPosition,
  applyVisualPart,
  applyVisualPartBaseColor,
  curatedFamilyIngredientIds,
  getVisualPart,
  listVisualParts,
  partCompatibleWithTarget,
  poundedCopperRimBackground,
  readVisualPartsState,
  removeVisualPartSocket,
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
};

const DRAWER_ORDER: VisualPartsDrawerId[] = [
  "curated",
  "body",
  "finish",
  "color",
  "frame_ring",
  "icon_image",
  "accents",
  "text",
  "layout",
  "divider",
  "surface_zone",
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
  const rimPreview =
    part.id === POUNDED_COPPER_PART_ID || part.payload.kind === "rim"
      ? poundedCopperRimBackground()
      : part.payload.kind === "finish"
        ? "linear-gradient(180deg,#ffffffaa,#16a34a 40%,#052e16)"
        : undefined;

  return (
    <button
      type="button"
      disabled={Boolean(disabledReason)}
      title={disabledReason || part.label}
      aria-pressed={active}
      data-testid={`vp-part-${part.id}`}
      data-vp-collection={part.collection}
      data-vp-active={active ? "true" : "false"}
      className={`relative min-h-16 overflow-hidden rounded border px-2 py-1.5 text-left text-[10px] ${
        active ? "border-[#b8ff2c]/80 bg-[#b8ff2c]/10" : "border-white/15 hover:border-[#b8ff2c]/50"
      } ${disabledReason ? "opacity-40" : ""}`}
      onClick={onApply}
    >
      {rimPreview ? (
        <span aria-hidden className="absolute inset-0 opacity-80" style={{ background: rimPreview }} />
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

export function VisualPartsCabinetPanel({ props, targetFamily, onPatch, onPassthrough }: Props) {
  const [drawer, setDrawer] = useState<VisualPartsDrawerId>("curated");
  const [collection, setCollection] = useState<"all" | VisualPartCollection>("all");
  const state = readVisualPartsState(props);
  const contract = VISUAL_PARTS_DRAWER_CONTRACT[drawer];

  const parts = useMemo(() => {
    const listed = listVisualParts({
      collection: collection === "all" ? undefined : collection,
      targetFamily,
    }).filter((part) => contract.categories.includes(part.category));
    return listed;
  }, [collection, contract.categories, targetFamily]);

  const ingredients = state.curatedFamilyId
    ? curatedFamilyIngredientIds(state.curatedFamilyId)
    : curatedFamilyIngredientIds(CURATED_FAMILY_BRIGHT_LACQUER_ID);

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
      default:
        return "passthrough";
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
              if (pass && onPassthrough) {
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
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[9px] text-white/45">
                Architecture proof — not the final Signature visual lock.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {drawer === "color" ? null : null}

      {drawer === "finish" || drawer === "body" || drawer === "frame_ring" || drawer === "accents" || drawer === "layout" || drawer === "divider" || drawer === "surface_zone" ? (
        <div className="grid grid-cols-2 gap-1.5" data-testid={`vp-drawer-body-${drawer}`}>
          {parts.map((part) => {
            const compat = partCompatibleWithTarget(part.id, targetFamily);
            const active =
              state.bodyPartId === part.id ||
              state.finishPartId === part.id ||
              state.rimPartId === part.id ||
              state.accentPartId === part.id ||
              state.layoutIntent === (part.payload.kind === "layout" ? part.payload.intent : undefined) ||
              state.dividerLinePartId === part.id ||
              state.actionSurfacePartId === part.id;
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
                active={state.iconStationGeometryPartId === part.id}
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
              data-testid="vp-icon-upload-demo"
              onClick={() =>
                onPatch(
                  applyIconStationContent(props, {
                    kind: "upload",
                    mediaUrl: "/tap-connect-mark.png",
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
            Upload reuses durable Media paths in production; demo uses Host mark for proof.
          </p>
        </div>
      ) : null}

      {drawer === "color" ? (
        <div className="space-y-2" data-testid="vp-color-passthrough">
          <p className="text-[11px] text-white/70">Color uses the shared Studio color authority.</p>
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
        </div>
      ) : null}
    </div>
  );
}
