import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creativeFillSchema,
  creativeFlowSectionSchema,
  DEFAULT_IMAGE_TREATMENT,
  gradientModelSchema,
  imageTreatmentSchema,
  parseCreativeResourcePayload,
  type CreativeOutline,
} from "@/lib/fusion/creative-platform/model";
import {
  contrastRatio,
  creativeFillToStyle,
  imageTreatmentToStyle,
  resolveOutlineWidthPx,
  suggestedReadableText,
} from "@/lib/fusion/creative-platform/render";

const gradient = {
  version: 1 as const,
  kind: "linear" as const,
  angle: 90,
  centerX: 50,
  centerY: 50,
  stops: [
    { id: "start", color: "#000000", position: 0, opacity: 1 },
    { id: "end", color: "#ffffff", position: 100, opacity: 0.5 },
  ],
};

describe("shared creative platform model", () => {
  it("accepts only professional two-to-eight stop typed gradients", () => {
    assert.equal(gradientModelSchema.parse(gradient).stops.length, 2);
    assert.throws(() =>
      gradientModelSchema.parse({ ...gradient, stops: [gradient.stops[0]] })
    );
    assert.throws(() =>
      gradientModelSchema.parse({
        ...gradient,
        stops: Array.from({ length: 9 }, (_, index) => ({
          id: String(index),
          color: "#000000",
          position: index * 10,
          opacity: 1,
        })),
      })
    );
  });

  it("renders all typed fill families through one shared contract", () => {
    assert.equal(
      creativeFillToStyle(
        creativeFillSchema.parse({ kind: "gradient", gradient })
      ).background,
      "linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(255, 255, 255, 0.5) 100%)"
    );
    assert.equal(
      creativeFillToStyle(
        creativeFillSchema.parse({ kind: "solid", color: "#9cff57" })
      ).background,
      "#9cff57"
    );
  });

  it("keeps image adjustments non-destructive and serializable", () => {
    const treatment = imageTreatmentSchema.parse({
      ...DEFAULT_IMAGE_TREATMENT,
      crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8, aspect: "1:1" },
      flipX: true,
      adjustments: {
        ...DEFAULT_IMAGE_TREATMENT.adjustments,
        brightness: 1.2,
        contrast: 1.1,
        saturation: 0.8,
        blurPx: 3,
      },
    });
    const style = imageTreatmentToStyle(treatment);
    assert.match(String(style.filter), /brightness\(1.2\)/);
    assert.match(String(style.transform), /scale\(-1, 1\)/);
    assert.match(String(style.clipPath), /inset/);
    assert.deepEqual(
      imageTreatmentSchema.parse(JSON.parse(JSON.stringify(treatment))),
      treatment
    );
    assert.deepEqual(DEFAULT_IMAGE_TREATMENT.focalPoint, { x: 0.5, y: 0.5 });
  });

  it("resolves fixed and scale-with-object outlines without oversized borders", () => {
    const base: CreativeOutline = {
      widthPx: 12,
      color: "#ffffff",
      opacity: 1,
      style: "solid",
      placement: "center",
      scaleMode: "fixed_px",
      baselineShortEdgePx: 240,
    };
    assert.equal(
      resolveOutlineWidthPx({ outline: base, currentShortEdgePx: 60 }),
      12
    );
    assert.equal(
      resolveOutlineWidthPx({
        outline: { ...base, scaleMode: "scale_with_object" },
        currentShortEdgePx: 60,
      }),
      3
    );
    assert.equal(
      resolveOutlineWidthPx({ outline: { ...base, widthPx: 100 }, currentShortEdgePx: 20 }),
      9.5
    );
  });

  it("provides measurable contrast correction", () => {
    assert.ok(contrastRatio("#ffffff", "#000000") >= 21);
    assert.deepEqual(suggestedReadableText("#ffffff").color, "#000000");
    assert.deepEqual(suggestedReadableText("#000000").color, "#ffffff");
  });

  it("validates structured flow and resource payloads by declared kind", () => {
    const flow = creativeFlowSectionSchema.parse({
      schemaVersion: 1,
      layout: "image_left",
      image: { mediaAssetId: "asset-1", fallbackUrl: "/asset.png" },
      imageTreatment: DEFAULT_IMAGE_TREATMENT,
      heading: "Shared creative story",
      body: "The same treatment moves across supported surfaces.",
      gutterPx: 24,
      imageWidthPercent: 45,
      alignment: "center",
      mobileStack: "image_first",
      background: { kind: "solid", color: "#0b0f19" },
    });
    assert.equal(flow.mobileStack, "image_first");
    assert.equal(
      parseCreativeResourcePayload({
        schemaVersion: 1,
        resourceKind: "GRADIENT",
        value: gradient,
        metadata: { tags: ["brand"] },
      }).resourceKind,
      "GRADIENT"
    );
    assert.throws(() =>
      parseCreativeResourcePayload({
        schemaVersion: 1,
        resourceKind: "GRADIENT",
        value: flow,
      })
    );
  });
});
