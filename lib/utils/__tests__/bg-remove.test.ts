import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chromaKeyImageData } from "@/lib/media/bg-remove/local-mock";
import {
  findBgRemoveWhereUsed,
  getBgRemoveAdapter,
  type BgRemoveProvenance,
} from "@/lib/media/bg-remove";

describe("bg-remove adapter", () => {
  it("exposes provider-neutral local-mock adapter", () => {
    const adapter = getBgRemoveAdapter();
    assert.equal(adapter.id, "local-mock");
    assert.ok(adapter.label.length > 0);
    assert.equal(typeof adapter.removeBackground, "function");
  });
});

describe("bg-remove local mock", () => {
  it("keys near-corner background toward transparent", () => {
    const w = 8;
    const h = 8;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 240;
      data[i + 1] = 240;
      data[i + 2] = 240;
      data[i + 3] = 255;
    }
    const cx = (3 * w + 3) * 4;
    data[cx] = 10;
    data[cx + 1] = 10;
    data[cx + 2] = 10;
    data[cx + 3] = 255;

    const imageData = {
      data,
      width: w,
      height: h,
      colorSpace: "srgb" as const,
    } as ImageData;

    const keyed = chromaKeyImageData(imageData, 40, false);
    assert.ok(keyed.data[3] < 40);
    assert.equal(keyed.data[cx + 3], 255);
  });

  it("softens edges when refine is requested", () => {
    const w = 4;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;
      data[i + 1] = 200;
      data[i + 2] = 200;
      data[i + 3] = 255;
    }
    const plain = chromaKeyImageData(
      { data: new Uint8ClampedArray(data), width: w, height: h, colorSpace: "srgb" } as ImageData,
      30,
      false
    );
    const refined = chromaKeyImageData(
      { data: new Uint8ClampedArray(data), width: w, height: h, colorSpace: "srgb" } as ImageData,
      30,
      true
    );
    let plainAlpha = 0;
    let refinedAlpha = 0;
    for (let i = 3; i < plain.data.length; i += 4) {
      plainAlpha += plain.data[i];
      refinedAlpha += refined.data[i];
    }
    assert.ok(refinedAlpha <= plainAlpha);
  });

  it("reports where-used for original + derived", () => {
    const p: BgRemoveProvenance = {
      provider: "local-mock",
      originalUrl: "https://example.com/a.png",
      derivedUrl: "data:image/png;base64,abc",
      createdAt: new Date().toISOString(),
      refined: false,
      paddingPx: 8,
      shadow: true,
      focal: { x: 0.5, y: 0.45 },
    };
    const hits = findBgRemoveWhereUsed(p, [
      { imageUrl: p.originalUrl },
      { hero: p.derivedUrl },
      { other: "nope" },
    ]);
    assert.equal(hits.find((h) => h.url === p.originalUrl)?.count, 1);
    assert.equal(hits.find((h) => h.url === p.derivedUrl)?.count, 1);
  });
});
