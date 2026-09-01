import test from "node:test";
import assert from "node:assert/strict";
import {
  collectPreviewLocalMediaKeys,
  inspectPreviewVisualResourcePortability,
  localMediaKey,
  resolvePreviewVisualResources,
} from "@/lib/fusion/creative-studio/preview/visual-resources";

const token = "signed.preview.token";

test("projects every shared local visual consumer through the signed preview authority", () => {
  const source = {
    rootComposition: {
      nodes: [
        { id: "cn", props: { identityContentUrl: "/api/media/local?key=biz%2Fidentity.png", mediaAssetId: "asset_cn" } },
        { id: "image", props: { src: "http://studio.test/api/media/local?key=biz%2Fmodule.jpg", mediaAssetId: "asset_image" } },
        { id: "container", props: { backgroundImageUrl: "/api/media/local?key=biz%2Fsurface.webp", backgroundMediaAssetId: "asset_surface" } },
      ],
    },
    profile: { logoUrl: "/api/media/local?key=biz%2Fbrand.png" },
    publicLogoUrl: "/tap-connect-logo.png",
    remoteImageUrl: "https://cdn.example.com/image.png",
  };

  const projected = resolvePreviewVisualResources(source, token);
  const expectedPrefix = `/api/preview/card/asset/${token}?key=`;
  assert.ok(String(projected.rootComposition.nodes[0]?.props.identityContentUrl).startsWith(expectedPrefix));
  assert.ok(String(projected.rootComposition.nodes[1]?.props.src).startsWith(expectedPrefix));
  assert.ok(String(projected.rootComposition.nodes[2]?.props.backgroundImageUrl).startsWith(expectedPrefix));
  assert.ok(projected.profile.logoUrl.startsWith(expectedPrefix));
  assert.equal(projected.rootComposition.nodes[0]?.props.mediaAssetId, "asset_cn");
  assert.equal(projected.publicLogoUrl, "/tap-connect-logo.png");
  assert.equal(projected.remoteImageUrl, "https://cdn.example.com/image.png");
});

test("extracts canonical local media keys without depending on the Studio origin", () => {
  assert.equal(localMediaKey("/api/media/local?key=biz%2Flogo.png"), "biz/logo.png");
  assert.equal(localMediaKey("http://127.0.0.1:3050/api/media/local?key=biz%2Flogo.png"), "biz/logo.png");
  assert.equal(localMediaKey("https://cdn.example.com/logo.png"), null);
});

test("collects only local media keys that the signed preview actually references", () => {
  const keys = collectPreviewLocalMediaKeys({
    nodes: [{ props: { src: "/api/media/local?key=biz%2Fone.png", mediaAssetId: "not-a-url" } }],
    logoUrl: "https://cdn.example.com/logo.png",
    actionUrl: "/api/media/local?key=biz%2Fmust-not-be-an-action.png",
  });
  assert.deepEqual([...keys], ["biz/one.png"]);
});

test("fails closed on browser-local, machine-local, and loopback-only visual state", () => {
  const issues = inspectPreviewVisualResourcePortability({
    nodes: [
      { props: { src: "blob:http://localhost:3050/id" } },
      { props: { mediaUrl: "data:image/png;base64,AAAA" } },
      { props: { artworkSrc: "file:///Users/rich/logo.png" } },
      { props: { fallbackUrl: "/Users/rich/logo.png" } },
      { props: { backgroundImageUrl: "http://127.0.0.1:4100/logo.png" } },
      { props: { src: "/api/media/local?key=biz%2Fvalid.png", mediaAssetId: "127.0.0.1" } },
    ],
  });
  assert.deepEqual(issues.map((issue) => issue.kind), [
    "browser_local",
    "browser_local",
    "browser_local",
    "machine_local",
    "loopback_only",
  ]);
  assert.ok(issues.every((issue) => issue.path.length > 0));
});
