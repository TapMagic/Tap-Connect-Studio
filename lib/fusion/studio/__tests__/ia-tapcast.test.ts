import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREATE_ACTIONS,
  sectionsForDestination,
} from "../ia";
import { listTapCastChannels } from "../../tapcast/registry/channels";

describe("Studio IA · TapCast / TikTok hierarchy", () => {
  it("Experiences nav lists TapCast but not TikTok as a sibling row", () => {
    const sections = sectionsForDestination("experiences");
    const ids = sections.map((s) => s.id);
    assert.ok(ids.includes("tapcast"), "TapCast must remain under Experiences");
    assert.equal(
      ids.includes("tapcast_tiktok"),
      false,
      "TikTok must not be a permanent Experiences sibling"
    );
    assert.equal(
      sections.some((s) => s.label === "TikTok"),
      false,
      "No Experiences row labeled TikTok"
    );
  });

  it("TapCast section points at the omnichannel hub", () => {
    const tapcast = sectionsForDestination("experiences").find((s) => s.id === "tapcast");
    assert.ok(tapcast);
    assert.equal(tapcast.href, "/dashboard/experiences/tapcast");
  });

  it("Create → TikTok content enters through TapCast TikTok path", () => {
    const create = CREATE_ACTIONS.find((a) => a.id === "tiktok_cast");
    assert.ok(create);
    assert.equal(create.label, "TikTok content");
    assert.equal(create.href, "/dashboard/experiences/tapcast/tiktok");
  });

  it("Create → Social distribution opens TapCast hub", () => {
    const social = CREATE_ACTIONS.find((a) => a.id === "social");
    assert.ok(social);
    assert.equal(social.href, "/dashboard/experiences/tapcast");
  });

  it("registry keeps TikTok first-class with nested TapCast href", () => {
    const tt = listTapCastChannels().find((c) => c.id === "tiktok");
    assert.ok(tt);
    assert.equal(tt.firstClass, true);
    assert.equal(tt.href, "/dashboard/experiences/tapcast/tiktok");
  });
});
