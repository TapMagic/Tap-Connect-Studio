import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const experienceSource = readFileSync("components/tap/tap-connect-experience.tsx", "utf8");
const mapSource = readFileSync("components/tap/map-location-container.tsx", "utf8");
const publicSource = readFileSync("app/everencore/[experienceSlug]/[[...pageSlug]]/page.tsx", "utf8");
const draftSource = readFileSync("components/fusion/creative-studio/live-device-qr-panel.tsx", "utf8");

describe("Experience session continuity", () => {
  it("restores the shared return context on browser, tab, and app returns", () => {
    assert.match(experienceSource, /addEventListener\("pageshow", restoreReturnContext\)/);
    assert.match(experienceSource, /addEventListener\("focus", restoreReturnContext\)/);
    assert.match(experienceSource, /addEventListener\("visibilitychange", onVisibilityChange\)/);
    assert.match(experienceSource, /selectedLocationId: element\.dataset\.locationId/);
    assert.match(experienceSource, /actionId: element\.dataset\.actionId/);
    assert.match(mapSource, /EXPERIENCE_RETURN_CONTEXT_EVENT/);
    assert.match(mapSource, /setSelectedId\(locationId\)/);
  });

  it("keeps internal routing, external safety, and hidden-Page recovery in one Experience shell", () => {
    assert.match(experienceSource, /window\.history\.pushState/);
    assert.match(experienceSource, /tapExperiencePreviousPageId: activePage\?\.pageId/);
    assert.match(experienceSource, /data-return-page-id=\{returnPageId \|\| experience\.defaultPageId\}/);
    assert.match(experienceSource, /prepareExternalAnchor\(element\)/);
    assert.match(experienceSource, /Back to Experience/);
    assert.match(publicSource, /<TapConnectCardPublic/);
    assert.match(draftSource, /phonePreviewEntryUrl/);
  });
});
