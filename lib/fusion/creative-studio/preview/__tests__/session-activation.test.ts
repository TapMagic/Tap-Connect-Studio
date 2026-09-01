import assert from "node:assert/strict";
import test from "node:test";
import { resolveLiveDeviceSessionActivation } from "../session-activation";

const ready = {
  status: "ready" as const,
  token: "signed-token",
  previewUrl: "http://192.168.1.10:3050/preview/live/signed-token",
  expiresAt: "2030-01-01T00:00:00.000Z",
  revision: 12,
  sessionRevision: 12,
  now: Date.parse("2029-01-01T00:00:00.000Z"),
};

test("reuses only a current valid Live Device session", () => {
  assert.equal(resolveLiveDeviceSessionActivation(ready), "reuse");
  assert.equal(resolveLiveDeviceSessionActivation({ ...ready, revision: 13 }), "update");
  assert.equal(resolveLiveDeviceSessionActivation({ ...ready, revision: 11 }), "update");
});

test("creates a new session when delivery authority is absent or expired", () => {
  assert.equal(resolveLiveDeviceSessionActivation({ ...ready, token: null }), "create");
  assert.equal(resolveLiveDeviceSessionActivation({ ...ready, now: Date.parse("2031-01-01T00:00:00.000Z") }), "create");
});
