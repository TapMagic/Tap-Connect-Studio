import assert from "node:assert/strict";
import test from "node:test";
import { createCompositionNode, createEmptyCreativeComposition } from "../composition";
import { readCardEdgeMode, readContainerEdgeMode, setCardEdgeMode, setContainerEdgeMode } from "../platform/edge-layout";
import { allowedLayeredResizeHandles, isCardSurfaceLayered, layeredResizePolicy, moveLayeredNode, placeNodeInCompositionParent, reorderLayeredNodeZ, resolveLayeredGeometry, setCardSurfaceCompositionMode, setContainerCompositionMode, snapLayeredNode, snapLayeredResize } from "../platform/layered-region";
import { readCardSurfaceDensity, readContainerDensity, setCardSurfaceDensity, setContainerDensity } from "../platform/composition-density";
import { applyStudioVideoPlayback, applyStudioVideoSource, identifyVideoSource, readStudioVideoState, videoAspectRatio, videoEmbedUrl, videoFeatureDefaults } from "../platform/media-module";
import { applyStandardButtonAppearancePreset, readStandardButtonAppearance } from "../reconstitution/standard-button-appearance";

function flowFixture() {
  const container = createCompositionNode("group", { id: "container", compositionKind: "container", parentId: null, siblingOrder: 0, props: { componentKind: "container" } });
  const text = createCompositionNode("text", { id: "text", compositionKind: "module", parentId: container.id, siblingOrder: 0, x: .08, y: .12, width: .84, height: .2 });
  return { ...createEmptyCreativeComposition("test"), parentAuthority: { version: 1 as const, layout: "flow" as const, cardGapPx: 16 }, nodes: [container, text] };
}

test("Card and Container edge modes are explicit and preserve content authority", () => {
  const block = flowFixture();
  assert.equal(readCardEdgeMode(block), "full_bleed");
  const inset = setCardEdgeMode(block, "inset");
  assert.equal(readCardEdgeMode(inset), "inset");
  assert.deepEqual(inset.nodes, block.nodes);
  const props = setContainerEdgeMode(block.nodes[0].props, "full_bleed");
  assert.equal(readContainerEdgeMode(props), "full_bleed");
  assert.equal(props.componentKind, "container");
});

test("layering stays bounded inside one Container and never replaces Card Flow", () => {
  const block = flowFixture();
  const layered = setContainerCompositionMode(block, "container", "layered");
  assert.equal(layered.parentAuthority?.layout, "flow");
  assert.equal(layered.nodes.find((node) => node.id === "container")?.props.layout, "layered");
  assert.equal(layered.nodes.find((node) => node.id === "text")?.parentId, "container");
  const moved = moveLayeredNode(layered, "text", { x: 9, y: -2, width: .4, height: .3, zIndex: 6 });
  const text = moved.nodes.find((node) => node.id === "text")!;
  assert.equal(text.x, .6);
  assert.equal(text.y, 0);
  assert.equal(text.zIndex, 6);
  assert.equal(text.siblingOrder, 0);
});

test("Add geometry is resolved inside the actual layered destination parent", () => {
  const layered = setContainerCompositionMode(flowFixture(), "container", "layered");
  const candidate = createCompositionNode("image", { id: "nested-image", compositionKind: "module", parentId: null, width: .92, height: .5, zIndex: 99, props: { elementKind: "image" } });
  const placed = placeNodeInCompositionParent(layered, candidate, "container", { x: .7, y: .8, width: .4, height: .3 });
  assert.equal(placed.parentId, "container");
  assert.equal(placed.x, .6);
  assert.equal(placed.y, .7);
  assert.equal(placed.width, .4);
  assert.equal(placed.height, .3);
  assert.equal(placed.zIndex, 11);
});

test("Card Surface layering is explicit, bounded, and preserves the parent authority", () => {
  const block = flowFixture();
  const layered = setCardSurfaceCompositionMode(block, "layered");
  assert.equal(isCardSurfaceLayered(layered), true);
  assert.equal(layered.parentAuthority?.layout, "flow");
  assert.equal(layered.compositionMode?.layeredHeightPx, 620);
  const moved = moveLayeredNode(layered, "container", { x: .92, y: .96, width: .3, height: .25, zIndex: 4 });
  const container = moved.nodes.find((node) => node.id === "container")!;
  assert.equal(container.x, .7);
  assert.equal(container.y, .75);
  assert.equal(container.zIndex, 4);
  const restored = setCardSurfaceCompositionMode(moved, "flow");
  assert.equal(isCardSurfaceLayered(restored), false);
  assert.equal(restored.nodes.find((node) => node.id === "text")?.parentId, "container");
  const reopened = setCardSurfaceCompositionMode(restored, "layered");
  assert.deepEqual(reopened.nodes.find((node) => node.id === "container"), container);
});

test("first Flow to Layered conversion seeds a two-dimensional composition and remains reversible", () => {
  const block = flowFixture();
  const rootText = createCompositionNode("text", { id: "root-text", compositionKind: "module", parentId: null, siblingOrder: 1, props: { elementKind: "text", flowWidthPercent: 48, flowAlignment: "end" } });
  const layered = setCardSurfaceCompositionMode({ ...block, nodes: [...block.nodes, rootText] }, "layered");
  const seededContainer = layered.nodes.find((node) => node.id === "container")!;
  const seededText = layered.nodes.find((node) => node.id === "root-text")!;
  assert.equal(layered.compositionMode?.layeredPlacementInitialized, true);
  assert.ok(seededText.x >= seededContainer.x + seededContainer.width);
  assert.ok(Math.abs(seededText.y - seededContainer.y) < .01);
  assert.equal(seededText.width, .48);
  assert.ok(seededText.x > .48);
  assert.ok(seededText.anchor);
  const moved = moveLayeredNode(layered, "root-text", { x: .31, y: .42 });
  const roundTrip = setCardSurfaceCompositionMode(setCardSurfaceCompositionMode(moved, "flow"), "layered");
  assert.equal(roundTrip.nodes.find((node) => node.id === "root-text")?.x, .31);
  assert.equal(roundTrip.nodes.find((node) => node.id === "root-text")?.y, .42);
});

test("layered snapping returns transient parent, sibling, safe-area, and rhythm guides", () => {
  const left = createCompositionNode("image", { id: "left", compositionKind: "module", parentId: null, siblingOrder: 0, x: .03, y: .05, width: .4, height: .2 });
  const right = createCompositionNode("text", { id: "right", compositionKind: "module", parentId: null, siblingOrder: 1, x: .445, y: .052, width: .4, height: .2 });
  const block = setCardSurfaceCompositionMode({ ...createEmptyCreativeComposition("snap"), parentAuthority: { version: 1 as const, layout: "flow" as const, cardGapPx: 16 }, nodes: [left, right], compositionMode: { version: 1 as const, mode: "flow" as const, layeredHeightPx: 620, layeredPlacementInitialized: true } }, "layered");
  const snapped = snapLayeredNode({ block, nodeId: "right", patch: { x: .432, y: .051 }, threshold: .015, grid: .04, safeMargin: .03 });
  assert.ok(snapped.guides.length > 0);
  assert.ok(snapped.guides.some((guide) => ["edge", "center", "safe-margin", "grid"].includes(guide.kind)));
  assert.equal(snapped.block.nodes.find((node) => node.id === "right")?.parentId, null);
});

test("local z-order changes only siblings inside the same layered parent", () => {
  const block = setContainerCompositionMode(flowFixture(), "container", "layered");
  const second = createCompositionNode("image", { id: "second", compositionKind: "module", parentId: "container", siblingOrder: 1, zIndex: 8 });
  const outside = createCompositionNode("button", { id: "outside", compositionKind: "module", parentId: null, siblingOrder: 1, zIndex: 99 });
  const withPeers = { ...block, nodes: [...block.nodes, second, outside] };
  const reordered = reorderLayeredNodeZ(withPeers, "text", "front");
  assert.ok(reordered.nodes.find((node) => node.id === "text")!.zIndex > reordered.nodes.find((node) => node.id === "second")!.zIndex);
  assert.equal(reordered.nodes.find((node) => node.id === "outside")!.zIndex, 99);
});

test("density governs Flow gap and Layered rhythm without changing membership", () => {
  const block = flowFixture();
  const dense = setCardSurfaceDensity(block, "dense");
  assert.equal(readCardSurfaceDensity(dense).gapPx, 8);
  assert.deepEqual(dense.nodes, block.nodes);
  const customProps = setContainerDensity(block.nodes[0].props, "custom", 22);
  assert.equal(readContainerDensity({ ...block.nodes[0], props: customProps }).gapPx, 22);
  assert.ok(readContainerDensity({ ...block.nodes[0], props: customProps }).snapGrid > .05);
});

test("layered transform policy protects governed Curated proportions and resolves at phone width", () => {
  const curated = createCompositionNode("frame", { id: "curated", compositionKind: "module", parentId: null, x: .4, y: .26, width: .57, height: .13, zIndex: 5, anchor: "right", moduleComposition: { ...createEmptyCreativeComposition("nested"), signatureAssembly: {} as NonNullable<ReturnType<typeof createEmptyCreativeComposition>["signatureAssembly"]> } });
  assert.equal(layeredResizePolicy(curated), "governed-aspect");
  assert.equal(layeredResizePolicy(createCompositionNode("text")), "width-only");
  assert.equal(layeredResizePolicy(createCompositionNode("image", { props: { elementKind: "image", fit: "contain", aspectLocked: true } })), "governed-aspect");
  assert.deepEqual(resolveLayeredGeometry(curated, { widthPx: 390, heightPx: 800 }), { xPx: 156, yPx: 208, widthPx: 222.29999999999998, heightPx: 104, anchor: "right", zIndex: 5 });
});

test("rectangular resize grammar distinguishes auto Text, fixed Text, media, Container, and future Map", () => {
  const autoText = createCompositionNode("text", { props: { elementKind: "text", textHeightMode: "auto" } });
  const fixedText = createCompositionNode("text", { props: { elementKind: "text", textHeightMode: "fixed", textOverflow: "scroll" } });
  const image = createCompositionNode("image", { props: { elementKind: "image", fit: "contain", aspectLocked: true } });
  const croppedImage = createCompositionNode("image", { props: { elementKind: "image", fit: "cover", focalX: .5, focalY: .5 } });
  const map = createCompositionNode("image", { props: { elementKind: "map" } });
  const container = createCompositionNode("group", { compositionKind: "container", props: { elementKind: "container" } });
  assert.deepEqual(allowedLayeredResizeHandles(autoText), ["e", "w"]);
  assert.deepEqual(allowedLayeredResizeHandles(fixedText), ["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
  assert.deepEqual(allowedLayeredResizeHandles(image), ["nw", "ne", "se", "sw"]);
  assert.deepEqual(allowedLayeredResizeHandles(croppedImage), ["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
  assert.deepEqual(allowedLayeredResizeHandles(map), ["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
  assert.deepEqual(allowedLayeredResizeHandles(container), ["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
});

test("resize edges snap to sibling and safe-area guides without changing membership", () => {
  const first = createCompositionNode("text", { id: "first", x: .05, y: .1, width: .4, height: .2, parentId: null });
  const second = createCompositionNode("text", { id: "second", x: .5, y: .4, width: .3, height: .2, parentId: null });
  const block = setCardSurfaceCompositionMode({ ...createEmptyCreativeComposition("resize-snap"), nodes: [first, second] }, "layered");
  const snapped = snapLayeredResize({ block, nodeId: "first", frame: { x: .05, y: .1, width: .444, height: .2 }, handle: "e", threshold: .01 });
  assert.equal(snapped.frame.x + snapped.frame.width, .5);
  assert.ok(snapped.guides.some((guide) => guide.axis === "x" && guide.value === .5));
  assert.equal(block.nodes.find((node) => node.id === "first")?.parentId, null);
});

test("Video detects provider URLs and enforces muted autoplay", () => {
  assert.deepEqual(identifyVideoSource("https://youtu.be/dQw4w9WgXcQ"), { provider: "youtube", sourceId: "dQw4w9WgXcQ" });
  assert.deepEqual(identifyVideoSource("https://vimeo.com/123456"), { provider: "vimeo", sourceId: "123456" });
  let props = applyStudioVideoSource({}, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  props = applyStudioVideoPlayback({ ...props, muted: false }, "autoplay_muted");
  const state = readStudioVideoState(props);
  assert.equal(state.muted, true);
  assert.match(videoEmbedUrl(state, true) || "", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(videoEmbedUrl(state, true) || "", /mute=1/);
});

test("Video Feature preserves the shared source contract across provider and direct media", () => {
  const defaults = videoFeatureDefaults();
  const youtube = readStudioVideoState(applyStudioVideoSource({ ...defaults, videoTitle: "Studio performance", analyticsId: "video:studio" }, "https://youtu.be/dQw4w9WgXcQ"));
  assert.equal(youtube.presentation, "feature");
  assert.equal(youtube.provider, "youtube");
  assert.equal(youtube.aspect, "16:9");
  assert.equal(youtube.analyticsId, "video:studio");
  const direct = readStudioVideoState(applyStudioVideoSource({ ...defaults, videoAspect: "9:16", posterUrl: "/media/poster.jpg" }, "/media/performance.mp4"));
  assert.equal(direct.provider, "hosted");
  assert.equal(direct.sourceUrl, "/media/performance.mp4");
  assert.equal(direct.posterUrl, "/media/poster.jpg");
  assert.equal(videoAspectRatio(direct.aspect), 9 / 16);
  const locked = readStudioVideoState({ ...defaults, videoLocked: true, lockedBehavior: { mode: "cta", ctaLabel: "Unlock", ctaDestinationType: "internal_page", ctaDestinationRef: "page-vault" } });
  assert.equal(locked.lockedBehavior?.ctaDestinationRef, "page-vault");
});

test("Standard appearance presets preserve Content and Action while using one material authority", () => {
  const original = { label: "Call Rich", href: "tel:+13525551212", actionType: "call", accessibleLabel: "Call Rich now", icon: "phone" };
  const next = applyStandardButtonAppearancePreset(original, "black-chrome");
  assert.equal(next.label, original.label);
  assert.equal(next.href, original.href);
  assert.equal(next.actionType, original.actionType);
  assert.equal(next.accessibleLabel, original.accessibleLabel);
  assert.equal(next.icon, original.icon);
  assert.equal(next.materialPreset, "black_chrome");
  assert.equal(readStandardButtonAppearance(next).depth, "standard");
  const embossed = applyStandardButtonAppearancePreset(original, "embossed-light");
  assert.equal(embossed.materialPreset, "embossed");
  assert.equal(readStandardButtonAppearance(embossed).depth, "low");
});
