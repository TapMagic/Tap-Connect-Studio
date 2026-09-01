import test from "node:test";
import assert from "node:assert/strict";
import {
  __clearPreviewSessionsForTests,
  createPreviewSession,
  getPreviewSession,
  revokePreviewSession,
  updatePreviewSession,
  verifyPreviewToken,
} from "@/lib/fusion/creative-studio/preview/tokens";
import {
  buildPreviewAbsoluteUrl,
  detectLanBaseUrl,
  resolvePreviewBaseUrl,
} from "@/lib/fusion/creative-studio/preview/url";

test("signed preview tokens verify, expire, and revoke", () => {
  __clearPreviewSessionsForTests();
  const session = createPreviewSession({
    businessId: "biz_1",
    brandKitId: "brand_1",
    cardName: "Demo",
    businessName: "Demo Co",
    snapshotJson: JSON.stringify({ version: 1 }),
    profileJson: JSON.stringify({ displayName: "Demo" }),
    mode: "follow",
  });
  assert.match(session.path, /^\/preview\/live\//);
  const verified = verifyPreviewToken(session.token);
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.equal(verified.payload.mode, "follow");
  const got = getPreviewSession(session.token);
  assert.equal(got.ok, true);
  assert.equal(revokePreviewSession(session.token).ok, true);
  const revoked = getPreviewSession(session.token);
  assert.equal(revoked.ok, false);
  if (!revoked.ok) assert.equal(revoked.reason, "preview_revoked");
});

test("follow updates snapshot; freeze keeps prior snapshot", () => {
  __clearPreviewSessionsForTests();
  const session = createPreviewSession({
    businessId: "biz_1",
    brandKitId: "brand_1",
    cardName: "Demo",
    businessName: "Demo Co",
    snapshotJson: JSON.stringify({ rev: 1 }),
    profileJson: JSON.stringify({}),
    revision: 1,
    mode: "follow",
  });
  const follow = updatePreviewSession(session.token, {
    snapshotJson: JSON.stringify({ rev: 2 }),
    revision: 2,
    mode: "follow",
  });
  assert.equal(follow.ok, true);
  const freeze = updatePreviewSession(session.token, {
    mode: "freeze",
  });
  assert.equal(freeze.ok, true);
  if (freeze.ok) assert.equal(freeze.mode, "freeze");
  const ignored = updatePreviewSession(session.token, {
    snapshotJson: JSON.stringify({ rev: 3 }),
    revision: 3,
  });
  assert.equal(ignored.ok, true);
  const got = getPreviewSession(session.token);
  assert.equal(got.ok, true);
  if (!got.ok) return;
  assert.equal(got.record.mode, "freeze");
  assert.equal(JSON.parse(got.record.snapshotJson).rev, 2);
});

test("preview URL assessment never treats localhost as phone-reachable", () => {
  const localhost = resolvePreviewBaseUrl({
    configured: "http://localhost:3050",
    preferLanPort: 3050,
  });
  // Auto LAN may rescue localhost environments; if not, unreachable.
  if (!detectLanBaseUrl(3050)) {
    assert.equal(localhost.reachableForPhone, false);
    assert.equal(localhost.isLocalhost, true);
  } else {
    assert.equal(localhost.reachableForPhone, true);
    assert.match(localhost.baseUrl, /^http:\/\/\d+\.\d+\.\d+\.\d+:3050$/);
  }
  const lan = resolvePreviewBaseUrl({
    configured: "http://192.168.1.20:3050",
  });
  assert.equal(lan.reachableForPhone, true);
  assert.equal(lan.candidateKind, "lan_candidate");
  assert.equal(lan.physicallyVerified, false);
  const built = buildPreviewAbsoluteUrl("/preview/live/token", lan);
  assert.equal(built.url, "http://192.168.1.20:3050/preview/live/token");
  assert.doesNotMatch(built.url, /localhost|127\.0\.0\.1/);

  const publicCandidate = resolvePreviewBaseUrl({
    configured: "https://preview.example.tunnel/app",
  });
  assert.equal(publicCandidate.reachableForPhone, true);
  assert.equal(publicCandidate.candidateKind, "configured_public_candidate");
  assert.equal(publicCandidate.physicallyVerified, false);
  assert.match(publicCandidate.guidance || "", /does not probe remote tunnel liveness/i);
});

test("Live Device LAN URL preserves non-default application port from request origin", () => {
  const prevPreview = process.env.NEXT_PUBLIC_PREVIEW_BASE_URL;
  const prevApp = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_PREVIEW_BASE_URL = "";
  process.env.NEXT_PUBLIC_APP_URL = "";
  try {
    const assessment = resolvePreviewBaseUrl({
      configured: "",
      appUrl: "",
      requestOrigin: "http://localhost:3055",
      preferLanPort: 3055,
    });
    if (!detectLanBaseUrl(3055)) {
      assert.equal(assessment.reachableForPhone, false);
      assert.match(assessment.guidance || "", /3055/);
      return;
    }
    assert.equal(assessment.reachableForPhone, true);
    assert.match(assessment.baseUrl, /^http:\/\/\d+\.\d+\.\d+\.\d+:3055$/);
    assert.doesNotMatch(assessment.baseUrl, /:3050(?:\/|$)/);
    const built = buildPreviewAbsoluteUrl("/preview/live/abc", assessment);
    assert.match(built.url, /^http:\/\/\d+\.\d+\.\d+\.\d+:3055\/preview\/live\/abc$/);
  } finally {
    if (prevPreview === undefined) delete process.env.NEXT_PUBLIC_PREVIEW_BASE_URL;
    else process.env.NEXT_PUBLIC_PREVIEW_BASE_URL = prevPreview;
    if (prevApp === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevApp;
  }
});

test("production preview signing fails closed without a configured secret", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPreviewSecret = process.env.PREVIEW_TOKEN_SECRET;
  const previousClerkSecret = process.env.CLERK_SECRET_KEY;
  mutableEnv.NODE_ENV = "production";
  delete process.env.PREVIEW_TOKEN_SECRET;
  delete process.env.CLERK_SECRET_KEY;
  try {
    assert.throws(
      () => createPreviewSession({
        businessId: "biz_1",
        brandKitId: "brand_1",
        cardName: "Demo",
        businessName: "Demo Co",
        snapshotJson: "{}",
        profileJson: "{}",
      }),
      /PREVIEW_TOKEN_SECRET is required/
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
    if (previousPreviewSecret === undefined) delete process.env.PREVIEW_TOKEN_SECRET;
    else process.env.PREVIEW_TOKEN_SECRET = previousPreviewSecret;
    if (previousClerkSecret === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previousClerkSecret;
  }
});
