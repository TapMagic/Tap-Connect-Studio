/**
 * Studio-wide Visual Parts Cabinet — type contracts.
 * Parts belong to Studio sockets, not to the first object that consumes them.
 * Visual Grammar extends these contracts without inventing a second Studio.
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
  | "mount"
  | "bottom_stop"
  | "hero"
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
  | "mount.plate"
  | "body.geometry"
  | "finish.recipe"
  | "layout.intent"
  | "bottomStop.cap"
  | "hero.section"
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
  | "action_surface"
  | "hero"
  | "launch"
  | "bottom_stop";

export type VisualPartRenderKind =
  | "body_geometry"
  | "finish_recipe"
  | "rim_overlay"
  | "icon_station_shell"
  | "accent_ornament"
  | "divider_treatment"
  | "action_surface_cap"
  | "mount_plate"
  | "bottom_stop_cap"
  | "hero_section"
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

/** Action visual role — not a separate Action engine. */
export type ActionVisualRole = "utility" | "signature" | "hero" | "launch";

/** Surface / Stage treatment concepts (optional local staging). */
export type SurfaceTreatment =
  | "off"
  | "quiet_field"
  | "panel_plaque"
  | "recess_well"
  | "energy_field"
  | "plinth_base"
  | "copper_harmonized";

export type IconStationAnchor =
  | "left_center"
  | "right_center"
  | "top_left"
  | "top_right"
  | "center_overlap";

export type HeroSizeIntent = "compact" | "standard" | "feature";
export type HeroStructureType = "compact" | "identity" | "spotlight" | "media";

export type FinishColorRefinement = {
  /** 0 muted ↔ 1 saturated/deep */
  richness?: number;
  /** 0 light/open ↔ 1 dark/luxurious (finish depth — not MaterialRecipe.depth) */
  depth?: number;
  /** 0 cool ↔ 1 warm */
  temperature?: number;
  /** 0 subtle ↔ 1 dramatic */
  contrast?: number;
  /** 0 soft/matte ↔ 1 brilliant/specular */
  lightResponse?: number;
  /** Degrees — feeds shared Material highlight direction (renderer channel, optional Host). */
  lightDirectionDeg?: number;
  /** 0 glossy ↔ 1 matte — shared Material response channel */
  roughness?: number;
  /** Specular strength override (defaults from lightResponse) */
  highlightStrength?: number;
  /** Edge darkening / falloff */
  edgeFalloff?: number;
};

export type VisualPartPayload =
  | {
      kind: "body";
      presentation: "rounded" | "pill" | "rectangle" | "angular" | "circle";
      radius: number;
    }
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
      industrialFamily?: boolean;
      electricFamily?: boolean;
      rimWidthPx: number;
    }
  | {
      kind: "icon_station_geometry";
      shape: "round" | "faceted" | "rounded_square" | "square" | "oval" | "shield";
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
      lineStyle: "minimal" | "copper_botanical" | "geometric" | "industrial" | "electric";
      endcapAssetId?: string;
      motion?: "none" | "energy_travel" | "neon_flicker";
    }
  | {
      kind: "action_surface";
      edgePartId?: string;
      backgroundTone: "neutral" | "copper_harmonized" | "quiet_field" | "energy_field" | "recess_well" | "panel_plaque" | "plinth_base";
      intensityDefault?: number;
      depthDefault?: number;
    }
  | {
      kind: "mount";
      style: "dark_plaque" | "beveled_plate" | "mission_control_plate" | "glass_plate";
      paddingPx: number;
      radius: number;
      background: string;
      border?: string;
      shadow?: string;
    }
  | {
      kind: "bottom_stop";
      style: "minimal" | "themed_border" | "surface_closure" | "brand_footer_plate";
      heightPx: number;
    }
  | {
      kind: "hero";
      structure: HeroStructureType;
      sizeIntent: HeroSizeIntent;
      flowShape?: "arc" | "swoosh" | "ribbon" | "geometric_band" | "organic_wave" | "none";
    }
  | {
      kind: "interaction";
      mode: "quiet" | "tactile" | "mechanical";
    }
  | {
      kind: "layout";
      intent: "one_column" | "two_column" | "round_team_grid";
      autoStackPhone: boolean;
      railAware?: boolean;
    }
  | {
      kind: "curated_family";
      ingredientPartIds: Readonly<Record<string, string | null>>;
      defaultBaseColor: string;
      actionRole?: ActionVisualRole;
      mountPartId?: string | null;
      surfaceTreatment?: SurfaceTreatment;
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
  colorRefinement?: FinishColorRefinement | null;
  brandRecipeId?: string | null;
  rimPartId?: string | null;
  iconStationGeometryPartId?: string | null;
  /** Explicit Icon Station backing part — independent of geometry. */
  iconStationBackingPartId?: string | null;
  /** Explicit Icon Station rim part (may reuse surface rim IDs such as Pounded Copper). */
  iconStationRimPartId?: string | null;
  iconStationPosition?: IconStationPosition | null;
  /** 0–1 within family-safe MIN/MAX. Geometry stays proportional. */
  iconStationScale?: number | null;
  iconStationAnchor?: IconStationAnchor | null;
  accentPartId?: string | null;
  interactionPartId?: string | null;
  layoutIntent?: "one_column" | "two_column" | "round_team_grid" | null;
  dividerLinePartId?: string | null;
  dividerEndcapStartPartId?: string | null;
  dividerEndcapEndPartId?: string | null;
  /** Surface ON/OFF — independent from Page Background. */
  surfaceEnabled?: boolean | null;
  surfaceTreatment?: SurfaceTreatment | null;
  surfaceIntensity?: number | null;
  surfaceDepth?: number | null;
  actionSurfacePartId?: string | null;
  mountPartId?: string | null;
  bottomStopPartId?: string | null;
  actionRole?: ActionVisualRole | null;
  heroStructure?: HeroStructureType | null;
  heroSizeIntent?: HeroSizeIntent | null;
  heroFlowShape?: string | null;
  /** Full cake recipe for curated reassembly — not ingredient list alone. */
  assemblyRecipeId?: string | null;
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
  | "mount"
  | "bottom_stop"
  | "hero"
  | "action"
  | "motion"
  | "advanced";

export type ApplyPartResult =
  | { ok: true; props: Record<string, unknown>; appliedPartId: string; socket: VisualPartSocket }
  | { ok: false; reason: string; partId: string; targetFamily: VisualPartTargetFamily };
