import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTimeTravel } from "../time-travel";

describe("time-travel resolver (J1)", () => {
  const slots = [
    {
      id: "s1",
      label: "Happy hour",
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "17:00",
      endTime: "19:00",
      priority: 10,
      enabled: true,
      campaignId: "slot-camp",
      campaignTitle: "Evening special",
    },
  ];

  it("matches timed slot when in window", () => {
    // 2026-07-27 is a Monday
    const at = new Date("2026-07-27T21:30:00.000Z"); // 17:30 America/New_York (EDT)
    const r = resolveTimeTravel({
      at,
      timezone: "America/New_York",
      slots,
      defaultCampaignId: "def",
      defaultCampaignTitle: "Default",
      endCampaignId: "end",
      endCampaignTitle: "End page",
    });
    assert.equal(r.campaignId, "slot-camp");
    assert.match(r.reason, /Matched slot/i);
  });

  it("falls back to default when no slot matches", () => {
    const at = new Date("2026-07-27T15:00:00.000Z"); // 11:00 America/New_York
    const r = resolveTimeTravel({
      at,
      timezone: "America/New_York",
      slots,
      defaultCampaignId: "def",
      defaultCampaignTitle: "Default",
      endCampaignId: "end",
      endCampaignTitle: "End page",
    });
    assert.equal(r.campaignId, "def");
    assert.match(r.reason, /default campaign/i);
  });

  it("falls back to end when no slot and no default", () => {
    const at = new Date("2026-07-27T15:00:00.000Z");
    const r = resolveTimeTravel({
      at,
      timezone: "America/New_York",
      slots,
      endCampaignId: "end",
      endCampaignTitle: "End page",
    });
    assert.equal(r.campaignId, "end");
    assert.match(r.reason, /end \/ fallback/i);
  });
});
