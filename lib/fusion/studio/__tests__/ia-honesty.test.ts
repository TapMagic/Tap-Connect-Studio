import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDIO_NAV,
  STUDIO_SECTIONS,
  findDishonestAliasFanIn,
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

  it("parks TapTrail / TapGuide / Locations as not-shipped aliases", () => {
    const taptrail = sectionsForDestination("experiences").find((s) => s.id === "taptrail");
    const tapguide = sectionsForDestination("audience").find((s) => s.id === "tapguide");
    const locations = sectionsForDestination("settings").find((s) => s.id === "locations");
    assert.ok(taptrail && /not shipped/i.test(taptrail.label));
    assert.ok(tapguide && /not shipped/i.test(tapguide.label));
    assert.ok(locations && /not shipped/i.test(locations.label));
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
