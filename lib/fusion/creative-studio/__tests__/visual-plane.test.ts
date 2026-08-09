import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import {
  patternVisualPlane,
  photographyVisualPlane,
  readContainerVisualPlane,
  readPageVisualPlane,
  readSurfaceVisualPlane,
  repeatingMediaPatternPlane,
  visualPlaneToStyle,
  writeContainerVisualPlane,
  writePageVisualPlane,
  writeSurfaceVisualPlane,
} from "@/lib/fusion/creative-studio/visual-plane";
import { SURFACE_PATTERN_CATALOG } from "@/lib/fusion/creative-studio/patterns";

function baseConfig(): TapConnectCardConfig {
  return {
    version: 1,
    sections: [],
    surfaceColor: "#0b0f19",
    accentColor: "#b8ff2c",
    textColor: "#ffffff",
    headerEnergy: 0,
    collapsible: false,
    defaultCollapsed: false,
    actionsLayout: "stack",
    defaultFinish: "metallic",
    cardFinish: "metallic",
    defaultShape: "rounded",
    rootComposition: {
      version: 1,
      id: "root",
      label: "Card",
      nodes: [],
      background: { kind: "none" },
      mobileFallback: "scale",
      safeAreaPaddingPx: 12,
    },
  } as TapConnectCardConfig;
}

describe("visual plane authority", () => {
  it("keeps Page, Surface, and Container identities independent", () => {
    let config = baseConfig();
    const page = patternVisualPlane("brick", "pattern", {
      background: "#7c2d12",
      foreground: "#fed7aa",
    });
    const surface = photographyVisualPlane({
      url: "https://example.com/surface.jpg",
      mediaAssetId: "asset-surface",
      overlayOpacity: 0.35,
    });
    const container = patternVisualPlane("linen", "texture", {
      background: "#d6d3d1",
      foreground: "#78716c",
    });

    config = { ...config, ...writePageVisualPlane(config, page) };
    const sectionPatch = writeSurfaceVisualPlane(surface);
    const section = {
      id: "surface-1",
      type: "surface",
      ...sectionPatch,
    } as TapCardSection;
    const containerProps = writeContainerVisualPlane(container);
    const node = {
      id: "container-1",
      primitive: "rect",
      x: 0.1,
      y: 0.1,
      width: 0.5,
      height: 0.4,
      rotationDeg: 0,
      zIndex: 1,
      name: "Container",
      props: { componentKind: "container", ...containerProps },
    } as CreativeCompositionNode;

    assert.equal(readPageVisualPlane(config).kind, "pattern");
    assert.equal(readSurfaceVisualPlane(section).kind, "image");
    assert.equal(readContainerVisualPlane(node).kind, "texture");

    const nextPage = patternVisualPlane("damask", "pattern");
    config = { ...config, ...writePageVisualPlane(config, nextPage) };
    assert.equal(readPageVisualPlane(config).kind, "pattern");
    assert.equal(
      (readPageVisualPlane(config) as { pattern: { id: string } }).pattern.id,
      "damask"
    );
    assert.equal(readSurfaceVisualPlane(section).kind, "image");
    assert.equal(readContainerVisualPlane(node).kind, "texture");

    const nextSurface = writeSurfaceVisualPlane(
      patternVisualPlane("baroque", "pattern", { background: "#111827" })
    );
    const section2 = { ...section, ...nextSurface } as TapCardSection;
    assert.equal(readSurfaceVisualPlane(section2).kind, "pattern");
    assert.equal(readPageVisualPlane(config).kind, "pattern");
    assert.equal(readContainerVisualPlane(node).kind, "texture");

    const nextContainer = writeContainerVisualPlane(
      photographyVisualPlane({
        url: "https://example.com/container.jpg",
        mediaAssetId: "asset-container",
      })
    );
    const node2 = {
      ...node,
      props: { ...node.props, ...nextContainer },
    } as CreativeCompositionNode;
    assert.equal(readContainerVisualPlane(node2).kind, "image");
    assert.equal(readPageVisualPlane(config).kind, "pattern");
    assert.equal(readSurfaceVisualPlane(section2).kind, "pattern");
  });

  it("renders distinct styles for every finite catalog entry", () => {
    const signatures = new Set<string>();
    for (const entry of SURFACE_PATTERN_CATALOG) {
      const plane = patternVisualPlane(entry.id, entry.kind, {
        background: "#0b0f19",
        foreground: "#ffffff",
        opacity: 0.4,
      });
      const style = visualPlaneToStyle(plane);
      const signature = JSON.stringify({
        id: entry.id,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
      });
      assert.equal(signatures.has(signature), false, `duplicate style for ${entry.id}`);
      signatures.add(signature);
      assert.ok(String(style.backgroundImage || ""), `${entry.id} must paint`);
    }
    assert.equal(signatures.size, SURFACE_PATTERN_CATALOG.length);
  });

  it("builds repeating Brand pattern with durable media identity", () => {
    const plane = repeatingMediaPatternPlane({
      url: "https://cdn.example/logo.png",
      mediaAssetId: "brand-logo-1",
      scale: 0.2,
    });
    assert.equal(plane.kind, "image");
    if (plane.kind !== "image") return;
    assert.equal(plane.media.mediaAssetId, "brand-logo-1");
    assert.equal(plane.treatment.repeat, "repeat");
    const style = visualPlaneToStyle(plane);
    assert.equal(String(style.backgroundRepeat), "repeat");
    assert.match(String(style.backgroundImage), /logo\.png/);
  });
});
