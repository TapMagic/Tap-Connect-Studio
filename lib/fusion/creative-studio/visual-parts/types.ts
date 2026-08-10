/**
 * Studio-wide Visual Parts Cabinet — type contracts.
 * Parts belong to Studio sockets, not to the first object that consumes them.
 */

export type VisualPartCollection = "foundation" | "tapconnect_signature";

export type VisualPartCategory =
  | "body"
  | "finish"
  | "color"
  | "frame_ring"
  | "icon_station"
  | "icon_content"
  | "accent"
  | "position"
  | "text"
  | "layout"
  | "divider"
  | "action_surface"
  | "interaction"
  | "action"
  | "motion"
  | "curated";

/** Socket vocabulary — refineable but must stay cross-object. */
export type VisualPartSocket =
  | "surface.fill"
  | "surface.material"
  | "surface.texture"
  | "surface.rim"
  | "surface.highlight"
  | "surface.effect"
  | "frame.rim"
  | "frame.innerRim"
  | "frame.outerRim"
  | "container.edge"
  | "container.capTop"
  | "container.capBottom"
  | "iconStation.geometry"
  | "iconStation.backing"
  | "iconStation.rim"
  | "iconStation.accent"
  | "iconStation.content"
  | "accent.left"
  | "accent.right"
  | "accent.both"
  | "accent.corner"
  | "accent.center"
  | "divider.line"
  | "divider.endcapStart"
  | "divider.endcapEnd"
  | "divider.centerpiece"
  | "interaction.hover"
  | "interaction.press"
  | "interaction.motion"
  | "actionSurface.background"
  | "actionSurface.edge"
  | "actionSurface.capTop"
  | "actionSurface.capBottom"
  | "actionSurface.divider"
  | "body.geometry"
  | "finish.recipe"
  | "layout.intent"
  | "curated.family";

export type VisualPartTargetFamily =
  | "button"
  | "badge"
  | "icon"
  | "divider"
  | "container"
  | "text"
  | "image"
  | "logo"
  | "coupon"
  | "ticket"
  | "form_submit"
  | "card_root"
  | "action_surface";

export type VisualPartRenderKind =
  | "body_geometry"
  | "finish_recipe"
  | "rim_overlay"
  | "icon_station_shell"
  | "accent_ornament"
  | "divider_treatment"
  | "action_surface_cap"
  | "interaction_recipe"
  | "layout_intent"
  | "curated_family"
  | "passthrough_authority";

export type ColorizationBehavior =
  | "none"
  | "host_base_color"
  | "finish_aware_derivation"
  | "metal_fixed"
  | "ornament_fixed";

export type VisualPartProvenanceRef = {
  provenanceId: string;
};

export type VisualPartPayload =
  | { kind: "body"; presentation: "rounded" | "pill"; radius: number }
  | {
      kind: "finish";
      finishId: "lacquer" | "acrylic";
      /** Optional Material recipe bridge for shine/highlight layers — not a color preset. */
      materialBridgeId?: string;
    }
  | {
      kind: "rim";
      cssClass: string;
      copperFamily?: boolean;
      rimWidthPx: number;
    }
  | {
      kind: "icon_station_geometry";
      shape: "round" | "faceted";
      clipPath?: string;
    }
  | {
      kind: "icon_station_backing";
      /** Explicit backing paint — never implied by geometry alone. */
      background: string;
      tone: "neutral" | "dark";
    }
  | {
      kind: "accent";
      svgAssetId: string;
      defaultPlacement: "left" | "right" | "both";
    }
  | {
      kind: "divider";
      lineStyle: "minimal" | "copper_botanical";
      endcapAssetId?: string;
    }
  | {
      kind: "action_surface";
      edgePartId?: string;
      backgroundTone: "neutral" | "copper_harmonized";
    }
  | {
      kind: "interaction";
      mode: "quiet" | "tactile";
    }
  | {
      kind: "layout";
      intent: "one_column" | "two_column";
      autoStackPhone: boolean;
    }
  | {
      kind: "curated_family";
      ingredientPartIds: Readonly<Record<string, string | null>>;
      defaultBaseColor: string;
    }
  | { kind: "none" };

export type VisualPartDefinition = Readonly<{
  id: string;
  label: string;
  collection: VisualPartCollection;
  category: VisualPartCategory;
  supportedSockets: readonly VisualPartSocket[];
  supportedTargetFamilies: readonly VisualPartTargetFamily[];
  renderKind: VisualPartRenderKind;
  colorization: ColorizationBehavior;
  responsive?: Readonly<{
    minLabelReadable?: boolean;
    preserveTapTarget?: boolean;
    autoStackWhenNarrow?: boolean;
  }>;
  conflictsWith?: readonly string[];
  requires?: readonly string[];
  payload: VisualPartPayload;
  provenance?: VisualPartProvenanceRef;
  previewHint?: string;
}>;

export type IconStationPosition = "left" | "right" | "both" | "none";

/** Durable Visual Parts state on a composition node — Finish ≠ Color. */
export type VisualPartsState = {
  curatedFamilyId?: string | null;
  bodyPartId?: string | null;
  finishPartId?: string | null;
  /** Host-chosen base color. Never store “Red Lacquer” as a finish id. */
  baseColor?: string | null;
  rimPartId?: string | null;
  iconStationGeometryPartId?: string | null;
  /** Explicit Icon Station backing part — independent of geometry. */
  iconStationBackingPartId?: string | null;
  /** Explicit Icon Station rim part (may reuse surface rim IDs such as Pounded Copper). */
  iconStationRimPartId?: string | null;
  iconStationPosition?: IconStationPosition | null;
  accentPartId?: string | null;
  interactionPartId?: string | null;
  layoutIntent?: "one_column" | "two_column" | null;
  dividerLinePartId?: string | null;
  dividerEndcapStartPartId?: string | null;
  dividerEndcapEndPartId?: string | null;
  actionSurfacePartId?: string | null;
};

export type VisualPartsDrawerId =
  | "curated"
  | "body"
  | "finish"
  | "color"
  | "frame_ring"
  | "icon_image"
  | "accents"
  | "text"
  | "layout"
  | "divider"
  | "surface_zone"
  | "action"
  | "motion"
  | "advanced";

export type ApplyPartResult =
  | { ok: true; props: Record<string, unknown>; appliedPartId: string; socket: VisualPartSocket }
  | { ok: false; reason: string; partId: string; targetFamily: VisualPartTargetFamily };
