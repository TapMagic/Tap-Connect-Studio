import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canTransitionCampaign } from "@/lib/services/campaign-commands";
import { campaignIsPlayable } from "@/lib/services/schedule";
import { timeInRange } from "@/lib/utils/schedule-time";
import { canTransitionEmail } from "@/lib/fusion/email/lifecycle";

describe("operational lifecycle rules", () => {
  it("never makes a Draft Campaign publicly eligible", () => {
    assert.equal(campaignIsPlayable("DRAFT"), false);
    assert.equal(campaignIsPlayable("READY"), false);
    assert.equal(campaignIsPlayable("SCHEDULED"), true);
    assert.equal(campaignIsPlayable("LIVE"), true);
    assert.equal(campaignIsPlayable("PAUSED"), false);
    assert.equal(campaignIsPlayable("ARCHIVED"), false);
  });

  it("enforces exact Campaign lifecycle transitions", () => {
    assert.equal(canTransitionCampaign("DRAFT", "READY"), true);
    assert.equal(canTransitionCampaign("DRAFT", "LIVE"), false);
    assert.equal(canTransitionCampaign("READY", "SCHEDULED"), true);
    assert.equal(canTransitionCampaign("LIVE", "PAUSED"), true);
    assert.equal(canTransitionCampaign("PAUSED", "ARCHIVED"), true);
  });

  it("uses start-inclusive and end-exclusive schedule boundaries", () => {
    assert.equal(timeInRange("09:59", "10:00", "11:00"), false);
    assert.equal(timeInRange("10:00", "10:00", "11:00"), true);
    assert.equal(timeInRange("10:30", "10:00", "11:00"), true);
    assert.equal(timeInRange("11:00", "10:00", "11:00"), false);
    assert.equal(timeInRange("23:30", "22:00", "02:00"), true);
    assert.equal(timeInRange("02:00", "22:00", "02:00"), false);
  });

  it("keeps Email scheduling and delivery states explicit", () => {
    assert.equal(canTransitionEmail("DRAFT", "READY"), true);
    assert.equal(canTransitionEmail("DRAFT", "SCHEDULED"), false);
    assert.equal(canTransitionEmail("READY", "SCHEDULED"), true);
    assert.equal(canTransitionEmail("SCHEDULED", "BLOCKED"), true);
    assert.equal(canTransitionEmail("BLOCKED", "DRAFT"), true);
    assert.equal(canTransitionEmail("DELIVERED", "SENDING"), false);
  });
});
