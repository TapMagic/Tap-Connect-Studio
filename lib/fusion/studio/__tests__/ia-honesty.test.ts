import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREATE_ACTIONS,
  STUDIO_NAV,
  STUDIO_SECTIONS,
  findDishonestAliasFanIn,
  findDishonestCreateActions,
  sectionsForDestination,
} from "../ia";

describe("Studio IA · UX spine honesty (ID-004)", () => {
  it("has no dishonest alias fan-in across destinations", () => {
    const problems = findDishonestAliasFanIn();
    assert.deepEqual(problems, [], problems.join("\n"));
  });

  it("names Campaign workbench distinctly from Experiences primary", () => {
    const workbench = sectionsForDestination("experiences").find((s) => s.id === "workbench");
    assert.ok(workbench);
    assert.equal(workbench.label, "Campaign workbench");
    assert.notEqual(workbench.label, STUDIO_NAV.find((n) => n.id === "experiences")?.label);
  });

  it("parks TapTrail / TapGuide / Locations as coming-later aliases", () => {
    const taptrail = sectionsForDestination("experiences").find((s) => s.id === "taptrail");
    const tapguide = sectionsForDestination("audience").find((s) => s.id === "tapguide");
    const locations = sectionsForDestination("settings").find((s) => s.id === "locations");
    assert.ok(taptrail && taptrail.maturity === "scaffolded");
    assert.ok(tapguide && tapguide.maturity === "scaffolded");
    assert.ok(locations && locations.maturity === "scaffolded");
    assert.match(taptrail.description, /coming later/i);
    assert.match(tapguide.description, /coming later/i);
    assert.match(locations.description, /coming later/i);
    assert.equal(taptrail.opensSurface, "Insights");
    assert.equal(tapguide.opensSurface, "Audience");
    assert.equal(locations.opensSurface, "Settings");
  });

  it("collapses former Contacts/Relationships/Consent fan-in into Audience workspace", () => {
    const audience = sectionsForDestination("audience");
    const ids = audience.map((s) => s.id);
    assert.ok(ids.includes("contacts"));
    assert.equal(ids.includes("relationships"), false);
    assert.equal(ids.includes("consent"), false);
    assert.equal(ids.includes("tapsave"), false);
    assert.equal(ids.includes("mytap"), false);
    const contacts = audience.find((s) => s.id === "contacts");
    assert.equal(contacts?.label, "Audience workspace");
    assert.ok(contacts?.href.includes("#workspace"));
  });

  it("keeps every primary destination id in STUDIO_SECTIONS", () => {
    for (const nav of STUDIO_NAV) {
      assert.ok(
        Array.isArray(STUDIO_SECTIONS[nav.id]) && STUDIO_SECTIONS[nav.id]!.length > 0,
        `missing sections for ${nav.id}`
      );
    }
  });
});

describe("Studio IA · Create honesty (ID-005)", () => {
  it("has no dishonest create intents landing on list hubs", () => {
    const problems = findDishonestCreateActions();
    assert.deepEqual(problems, [], problems.join("\n"));
  });

  it("routes Campaign create to workbench, not campaigns list", () => {
    const campaign = CREATE_ACTIONS.find((a) => a.id === "campaign");
    assert.ok(campaign);
    assert.equal(campaign.intent, "create");
    assert.equal(campaign.href, "/dashboard/workbench");
  });

  it("marks Booking unavailable with reason", () => {
    const booking = CREATE_ACTIONS.find((a) => a.id === "booking");
    assert.ok(booking);
    assert.equal(booking.intent, "unavailable");
    assert.ok(booking.unavailableReason);
  });
});
