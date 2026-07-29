/**
 * Prove Live Device QR encodes a real preview URL (encode → decode round-trip).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Buffer } from "node:buffer";
import QRCode from "qrcode";
import { PNG } from "pngjs";
// jsqr ships without official @types
// eslint-disable-next-line @typescript-eslint/no-require-imports
import jsQR from "jsqr";

describe("creative-studio live device QR encoding", () => {
  it("encodes a reachable preview URL that decodes back to the same string", async () => {
    const url =
      "http://192.168.2.24:3010/preview/card/tok_test_abc123XYZ";
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
    });
    assert.ok(dataUrl.startsWith("data:image/png;base64,"));
    const b64 = dataUrl.slice("data:image/png;base64,".length);
    const png = PNG.sync.read(Buffer.from(b64, "base64"));
    const code = jsQR(
      new Uint8ClampedArray(png.data),
      png.width,
      png.height
    );
    assert.ok(code, "QR must decode");
    assert.equal(code.data, url);
    assert.ok(code.data.includes("/preview/card/"));
    assert.equal(code.data.includes("/t/"), false);
  });
});
