import test from "node:test";
import assert from "node:assert/strict";
import { nanoid } from "nanoid";
import { GET } from "@/app/api/preview/card/asset/[token]/route";
import {
  __clearPreviewSessionsForTests,
  createPreviewSession,
} from "@/lib/fusion/creative-studio/preview/tokens";
import { deleteMediaObject, putMediaObject } from "@/lib/media/storage";

function setNodeEnv(value: string | undefined): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

test("signed preview asset route serves tenant media without a Studio auth session", async () => {
  const originalMode = process.env.CREATIVE_PROVIDER_MODE;
  const originalNodeEnv = process.env.NODE_ENV;
  const businessId = `preview-business-${nanoid()}`;
  const storageKey = `${businessId}/uploads/live-device.png`;
  try {
    setNodeEnv("test");
    process.env.CREATIVE_PROVIDER_MODE = "fixture";
    await putMediaObject({
      storageKey,
      bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      mimeType: "image/png",
    });
    __clearPreviewSessionsForTests();
    const session = createPreviewSession({
      businessId,
      brandKitId: "brand-test",
      cardName: "Live Device",
      businessName: "TapConnect",
      snapshotJson: JSON.stringify({ nodes: [{ props: { src: `/api/media/local?key=${encodeURIComponent(storageKey)}` } }] }),
      profileJson: "{}",
      mode: "freeze",
    });
    const response = await GET(
      new Request(`http://phone.test/api/preview/card/asset/${session.token}?key=${encodeURIComponent(storageKey)}`),
      { params: Promise.resolve({ token: session.token }) }
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("x-tapconnect-preview-resource"), "resolved");
    assert.equal((await response.arrayBuffer()).byteLength, 8);

    const crossTenant = await GET(
      new Request(`http://phone.test/api/preview/card/asset/${session.token}?key=${encodeURIComponent("another-business/private.png")}`),
      { params: Promise.resolve({ token: session.token }) }
    );
    assert.equal(crossTenant.status, 200);
    assert.equal(crossTenant.headers.get("x-tapconnect-preview-resource"), "unavailable");
    assert.match(await crossTenant.text(), /Image unavailable in device preview/);
  } finally {
    setNodeEnv("test");
    process.env.CREATIVE_PROVIDER_MODE = "fixture";
    await deleteMediaObject(storageKey);
    setNodeEnv(originalNodeEnv);
    if (originalMode === undefined) delete process.env.CREATIVE_PROVIDER_MODE;
    else process.env.CREATIVE_PROVIDER_MODE = originalMode;
    __clearPreviewSessionsForTests();
  }
});
