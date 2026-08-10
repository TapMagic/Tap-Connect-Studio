import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CURATED_FAMILY_BRIGHT_LACQUER_ID,
  LACQUER_PROOF_COLORS,
  POUNDED_COPPER_PART_ID,
  applyCuratedFamily,
  applyIconStationContent,
  applyIconStationPosition,
  applyVisualPart,
  applyVisualPartBaseColor,
  curatedFamilyIngredientIds,
  deriveFinishSurface,
  getProvenanceForPart,
  getVisualPart,
  listVisualParts,
  partCompatibleWithTarget,
  partTilePreviewBackground,
  partTilePreviewKind,
  readVisualPartsState,
  removeVisualPartSocket,
  resolveRimDescriptor,
  visualPartsStateMatchesIngredients,
} from "../visual-parts";

describe("Visual Parts Cabinet — registry & provenance", () => {
  it("lists Foundation and Signature collections separately", () => {
    const foundation = listVisualParts({ collection: "foundation" });
    const signature = listVisualParts({ collection: "tapconnect_signature" });
    assert.ok(foundation.length >= 6);
    assert.ok(signature.some((p) => p.id === POUNDED_COPPER_PART_ID));
    assert.ok(signature.every((p) => p.collection === "tapconnect_signature"));
  });

  it("records TapConnect-original provenance without fake external sources", () => {
    const prov = getProvenanceForPart(POUNDED_COPPER_PART_ID);
    assert.ok(prov);
    assert.equal(prov!.sourceType, "tapconnect_original");
    assert.equal(prov!.commercialUseReviewed, true);
  });

  it("Pounded Copper rim supports multiple sockets / targets", () => {
    const part = getVisualPart(POUNDED_COPPER_PART_ID)!;
    assert.ok(part.supportedSockets.includes("surface.rim"));
    assert.ok(part.supportedSockets.includes("frame.rim"));
    assert.ok(part.supportedSockets.includes("iconStation.rim"));
    assert.ok(part.supportedTargetFamilies.includes("button"));
    assert.ok(part.supportedTargetFamilies.includes("image"));
    assert.ok(part.supportedTargetFamilies.includes("container"));
  });

  it("rejects incompatible targets with explanation", () => {
    const bad = partCompatibleWithTarget("divider_copper_botanical", "button");
    assert.equal(bad.compatible, false);
    assert.match(bad.reason || "", /not compatible/i);
  });
});

describe("Visual Parts Cabinet — Finish ≠ Color", () => {
  it("derives distinct lacquer surfaces for proof colors without renaming finish", () => {
    const green = deriveFinishSurface("lacquer", LACQUER_PROOF_COLORS.green);
    const red = deriveFinishSurface("lacquer", LACQUER_PROOF_COLORS.red);
    const blue = deriveFinishSurface("lacquer", LACQUER_PROOF_COLORS.blue);
    const black = deriveFinishSurface("lacquer", LACQUER_PROOF_COLORS.black);
    assert.equal(green.finishId, "lacquer");
    assert.equal(red.finishId, "lacquer");
    assert.notEqual(green.gradient, red.gradient);
    assert.notEqual(red.gradient, blue.gradient);
    assert.notEqual(blue.gradient, black.gradient);
    assert.ok(green.shine && red.shine);
  });

  it("color change preserves finish part id, rim/accent, and Action", () => {
    let props = applyCuratedFamily(
      { actionType: "call", href: "tel:+15551234567" },
      CURATED_FAMILY_BRIGHT_LACQUER_ID,
      "button"
    );
    const before = readVisualPartsState(props);
    props = applyVisualPartBaseColor(props, LACQUER_PROOF_COLORS.red, "button");
    props = applyVisualPartBaseColor(props, LACQUER_PROOF_COLORS.blue, "button");
    const after = readVisualPartsState(props);
    assert.equal(after.finishPartId, "finish_lacquer");
    assert.equal(after.rimPartId, before.rimPartId);
    assert.equal(after.accentPartId, before.accentPartId);
    assert.equal(after.bodyPartId, before.bodyPartId);
    assert.equal(props.actionType, "call");
    assert.equal(props.href, "tel:+15551234567");
    assert.equal(after.baseColor, LACQUER_PROOF_COLORS.blue);
  });
});

describe("Visual Parts Cabinet — Action independence from curated family", () => {
  it("preserves existing Call Action when curated family is applied", () => {
    const props = applyCuratedFamily(
      { label: "Call us", actionType: "call", href: "tel:+15551234567" },
      CURATED_FAMILY_BRIGHT_LACQUER_ID,
      "button"
    );
    assert.equal(props.actionType, "call");
    assert.equal(props.href, "tel:+15551234567");
    assert.equal(readVisualPartsState(props).rimPartId, POUNDED_COPPER_PART_ID);
  });

  it("preserves exact Website URL when curated family is applied", () => {
    const props = applyCuratedFamily(
      {
        label: "Menu",
        actionType: "website",
        href: "https://host.example/menu?utm=keep",
      },
      CURATED_FAMILY_BRIGHT_LACQUER_ID,
      "button"
    );
    assert.equal(props.actionType, "website");
    assert.equal(props.href, "https://host.example/menu?utm=keep");
  });

  it("curated family Surface does not demote Button to Container", () => {
    const props = applyCuratedFamily(
      { componentKind: "container", actionType: "call", href: "tel:+15551230000" },
      CURATED_FAMILY_BRIGHT_LACQUER_ID,
      "button"
    );
    assert.equal(props.componentKind, undefined);
    assert.equal(props.actionType, "call");
  });

  it("visual Color/Finish/Rim/Icon/Accent/Layout edits leave Action unchanged", () => {
    let props: Record<string, unknown> = {
      actionType: "call",
      href: "tel:+18005550199",
      campaignBindId: "bind-demo-keep",
    };
    props = applyCuratedFamily(props, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    props = applyVisualPartBaseColor(props, LACQUER_PROOF_COLORS.red, "button");
    let result = applyVisualPart(props, "rim_simple_chrome", {
      targetFamily: "button",
      socket: "surface.rim",
    });
    assert.equal(result.ok, true);
    if (result.ok) props = result.props;
    result = applyVisualPart(props, POUNDED_COPPER_PART_ID, {
      targetFamily: "button",
      socket: "surface.rim",
    });
    assert.equal(result.ok, true);
    if (result.ok) props = result.props;
    props = applyIconStationPosition(props, "right");
    props = removeVisualPartSocket(props, "accent.left");
    result = applyVisualPart(props, "layout_two_column", { targetFamily: "button" });
    assert.equal(result.ok, true);
    if (result.ok) props = result.props;
    assert.equal(props.actionType, "call");
    assert.equal(props.href, "tel:+18005550199");
    assert.equal(props.campaignBindId, "bind-demo-keep");
  });

  it("curated family contract has no Action defaults", () => {
    const family = getVisualPart(CURATED_FAMILY_BRIGHT_LACQUER_ID)!;
    assert.equal(family.payload.kind, "curated_family");
    if (family.payload.kind === "curated_family") {
      assert.equal("defaultActionType" in family.payload, false);
      assert.equal("defaultHref" in family.payload, false);
    }
  });
});

describe("Visual Parts Cabinet — Curated → Customize", () => {
  it("applies Bright Lacquer + Pounded Copper with exposed ingredient IDs", () => {
    const props = applyCuratedFamily(
      { label: "Go", actionType: "call", href: "tel:+10000000000" },
      CURATED_FAMILY_BRIGHT_LACQUER_ID,
      "button"
    );
    const match = visualPartsStateMatchesIngredients(props, CURATED_FAMILY_BRIGHT_LACQUER_ID);
    assert.equal(match.ok, true, match.missing.join(","));
    const ingredients = curatedFamilyIngredientIds(CURATED_FAMILY_BRIGHT_LACQUER_ID)!;
    assert.equal(ingredients.rim, POUNDED_COPPER_PART_ID);
    assert.equal(ingredients.finish, "finish_lacquer");
    assert.equal(ingredients.iconStationBacking, "icon_station_backing_dark");
    assert.equal(ingredients.iconStationRim, POUNDED_COPPER_PART_ID);
    assert.ok(props.gradientFill);
    const state = readVisualPartsState(props);
    assert.equal(state.rimPartId, POUNDED_COPPER_PART_ID);
    assert.equal(state.iconStationBackingPartId, "icon_station_backing_dark");
    assert.equal(state.iconStationRimPartId, POUNDED_COPPER_PART_ID);
    assert.equal(props.actionType, "call");
  });

  it("remove accent only leaves rim + finish", () => {
    let props = applyCuratedFamily({}, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    props = removeVisualPartSocket(props, "accent.left");
    const state = readVisualPartsState(props);
    assert.equal(state.accentPartId, "accent_none");
    assert.equal(state.rimPartId, POUNDED_COPPER_PART_ID);
    assert.equal(state.finishPartId, "finish_lacquer");
  });

  it("icon station position Left → Right → Both", () => {
    let props = applyCuratedFamily({}, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    props = applyIconStationPosition(props, "right");
    assert.equal(readVisualPartsState(props).iconStationPosition, "right");
    assert.equal(props.iconPosition, "after");
    props = applyIconStationPosition(props, "both");
    assert.equal(props.iconStationBoth, true);
    props = applyIconStationPosition(props, "left");
    assert.equal(readVisualPartsState(props).iconStationPosition, "left");
  });

  it("uploaded logo/photo content uses Icon Station without wiping rim", () => {
    let props = applyCuratedFamily({}, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    props = applyIconStationContent(props, {
      kind: "upload",
      mediaUrl: "/tap-connect-mark.png",
      mediaAssetId: "demo",
    });
    assert.equal(props.iconMediaUrl, "/tap-connect-mark.png");
    assert.equal(readVisualPartsState(props).rimPartId, POUNDED_COPPER_PART_ID);
  });
});

describe("Visual Parts Cabinet — Icon Station geometry ≠ style", () => {
  it("Foundation Round geometry alone does not attach dark backing or copper rim", () => {
    const result = applyVisualPart({}, "icon_station_round", { targetFamily: "button" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const state = readVisualPartsState(result.props);
    assert.equal(state.iconStationGeometryPartId, "icon_station_round");
    assert.equal(state.iconStationBackingPartId ?? null, null);
    assert.equal(state.iconStationRimPartId ?? null, null);
    assert.equal(result.props.iconStationShape, "round");
  });

  it("curated family composes Round + dark backing + Pounded Copper as separate ingredients", () => {
    const props = applyCuratedFamily({}, CURATED_FAMILY_BRIGHT_LACQUER_ID, "button");
    const state = readVisualPartsState(props);
    assert.equal(state.iconStationGeometryPartId, "icon_station_round");
    assert.equal(state.iconStationBackingPartId, "icon_station_backing_dark");
    assert.equal(state.iconStationRimPartId, POUNDED_COPPER_PART_ID);
    assert.equal(state.rimPartId, POUNDED_COPPER_PART_ID);
  });
});

describe("Visual Parts Cabinet — rim tile preview parity", () => {
  it("Simple Chrome and Pounded Copper previews derive from resolveRimDescriptor and differ", () => {
    const chrome = getVisualPart("rim_simple_chrome")!;
    const copper = getVisualPart(POUNDED_COPPER_PART_ID)!;
    const chromeDesc = resolveRimDescriptor({ rimPartId: chrome.id })!;
    const copperDesc = resolveRimDescriptor({ rimPartId: copper.id })!;
    assert.equal(partTilePreviewBackground(chrome), chromeDesc.background);
    assert.equal(partTilePreviewBackground(copper), copperDesc.background);
    assert.notEqual(partTilePreviewBackground(chrome), partTilePreviewBackground(copper));
    assert.equal(partTilePreviewKind(chrome), "rim-chrome");
    assert.equal(partTilePreviewKind(copper), "rim-copper");
    assert.equal(chromeDesc.previewKind, "rim-chrome");
    assert.equal(copperDesc.previewKind, "rim-copper");
  });
});

describe("Visual Parts Cabinet — cross-object same part ID", () => {
  it("applies the same Pounded Copper part id to Button and Image", () => {
    const onButton = applyVisualPart({}, POUNDED_COPPER_PART_ID, {
      targetFamily: "button",
      socket: "surface.rim",
    });
    const onImage = applyVisualPart({}, POUNDED_COPPER_PART_ID, {
      targetFamily: "image",
      socket: "frame.rim",
    });
    assert.equal(onButton.ok, true);
    assert.equal(onImage.ok, true);
    if (onButton.ok && onImage.ok) {
      assert.equal(readVisualPartsState(onButton.props).rimPartId, POUNDED_COPPER_PART_ID);
      assert.equal(readVisualPartsState(onImage.props).rimPartId, POUNDED_COPPER_PART_ID);
      assert.equal(onButton.appliedPartId, onImage.appliedPartId);
    }
  });

  it("Divider and Action Surface Signature parts apply", () => {
    const divider = applyVisualPart({}, "divider_copper_botanical", { targetFamily: "divider" });
    const surface = applyVisualPart(
      { componentKind: "container" },
      "action_surface_copper_harmonized",
      { targetFamily: "container" }
    );
    assert.equal(divider.ok, true);
    assert.equal(surface.ok, true);
    if (divider.ok) assert.equal(readVisualPartsState(divider.props).dividerLinePartId, "divider_copper_botanical");
    if (surface.ok) {
      assert.equal(readVisualPartsState(surface.props).actionSurfacePartId, "action_surface_copper_harmonized");
      assert.equal(readVisualPartsState(surface.props).rimPartId, POUNDED_COPPER_PART_ID);
    }
  });
});

describe("Visual Parts Cabinet — layout + interaction", () => {
  it("layout intents and tactile interaction apply without inventing engines", () => {
    let props = applyVisualPart({}, "layout_two_column", { targetFamily: "button" });
    assert.equal(props.ok, true);
    if (props.ok) {
      assert.equal(readVisualPartsState(props.props).layoutIntent, "two_column");
      assert.equal(props.props.vpAutoStackPhone, true);
    }
    props = applyVisualPart(props.ok ? props.props : {}, "interaction_tactile", { targetFamily: "button" });
    assert.equal(props.ok, true);
    if (props.ok) assert.equal(props.props.vpInteractionMode, "tactile");
  });
});
