import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  toKeywordChannelId,
  toTapCastChannelId,
  TAPCAST_CHANNEL_IDS,
} from "../canonical";

describe("Canonical channel ID map", () => {
  it("exposes 18 TapCast channels", () => {
    assert.equal(TAPCAST_CHANNEL_IDS.length, 18);
  });

  it("maps gbp ↔ google_business and instagram_direct ↔ instagram_dm", () => {
    assert.equal(toTapCastChannelId("gbp"), "google_business");
    assert.equal(toTapCastChannelId("instagram_direct"), "instagram_dm");
    assert.equal(toKeywordChannelId("google_business"), "gbp");
    assert.equal(toKeywordChannelId("instagram_dm"), "instagram_direct");
  });

  it("keeps studio-only keyword channels unmapped to TapCast publish", () => {
    assert.equal(toTapCastChannelId("email"), null);
    assert.equal(toTapCastChannelId("tapcanvas"), null);
    assert.equal(toTapCastChannelId("tapflow"), null);
  });
});
