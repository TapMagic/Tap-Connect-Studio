import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMapHref,
  buildButtonHref,
  buttonElementDefaults,
  mapElementDefaults,
  resolveMapLocation,
  safeHttpUrl,
} from "../designer-elements";

const locations = [
  { id: "secondary", name: "Warehouse", address: "20 Pine St" },
  { id: "main", name: "Main entrance", address: "10 Magnolia Ave, Ocala, FL", isDefault: true },
];

test("designer button defaults are universal, accessible, and presentation-ready", () => {
  const directions = buttonElementDefaults("directions");
  assert.equal(directions.elementKind, "button");
  assert.equal(directions.actionType, "directions");
  assert.equal(directions.icon, "map-pin");
  assert.equal(directions.showLabel, true);
  assert.equal(directions.showDescription, false);
  assert.ok(Number(directions.touchTargetPx) >= 44);
  assert.match(String(directions.accessibleLabel), /directions/i);
});

test("Map defaults never create an unexplained empty provider rectangle", () => {
  const defaults = mapElementDefaults();
  assert.equal(defaults.mapSourceMode, "workspace_default");
  assert.equal(defaults.mapDisplayMode, "location_card");
  assert.equal(defaults.mapOpenApp, "default");
  assert.equal(defaults.mapOpenAction, "directions");
});

test("Workspace, address, coordinates, and pasted Map sources resolve deterministically", () => {
  assert.deepEqual(resolveMapLocation({ mapSourceMode: "workspace_default" }, locations), {
    name: "Main entrance",
    address: "10 Magnolia Ave, Ocala, FL",
    pastedUrl: undefined,
  });
  assert.equal(resolveMapLocation({ mapSourceMode: "workspace_location", locationId: "secondary" }, locations)?.name, "Warehouse");
  assert.equal(resolveMapLocation({ mapSourceMode: "custom_address", address: "1 Event Way" }, locations)?.address, "1 Event Way");
  assert.equal(resolveMapLocation({ mapSourceMode: "coordinates", latitude: 29.1872, longitude: -82.1401 }, locations)?.address, "29.1872, -82.1401");
  assert.equal(resolveMapLocation({ mapSourceMode: "pasted_url", mapUrl: "javascript:alert(1)" }, locations), null);
});

test("Map app links are safely generated for default, Apple, Google, Waze, browser and custom", () => {
  const base = { mapSourceMode: "custom_address" as const, address: "10 Magnolia Ave, Ocala, FL", mapOpenAction: "directions" as const };
  assert.match(buildMapHref({ ...base, mapOpenApp: "default" }) || "", /^geo:0,0\?q=/);
  assert.match(buildMapHref({ ...base, mapOpenApp: "apple" }) || "", /^https:\/\/maps\.apple\.com\/\?daddr=/);
  assert.match(buildMapHref({ ...base, mapOpenApp: "google" }) || "", /^https:\/\/www\.google\.com\/maps\/dir/);
  assert.match(buildMapHref({ ...base, mapOpenApp: "waze" }) || "", /^https:\/\/www\.waze\.com\/ul/);
  assert.match(buildMapHref({ ...base, mapOpenApp: "browser" }) || "", /^https:\/\/www\.openstreetmap\.org\/search/);
  assert.equal(buildMapHref({ ...base, mapOpenApp: "custom", customDirectionsUrl: "https://example.com/route" }), "https://example.com/route");
  assert.equal(buildMapHref({ ...base, mapOpenApp: "custom", customDirectionsUrl: "data:text/html,bad" }), undefined);
  assert.equal(safeHttpUrl("https://example.com"), "https://example.com/");
});

test("Button actions generate safe callable, email, web and independent Directions destinations", () => {
  assert.equal(buildButtonHref({ actionType: "call", href: "+1 (352) 555-0100" }), "tel:+13525550100");
  assert.equal(buildButtonHref({ actionType: "email", href: "hello@example.com" }), "mailto:hello@example.com");
  assert.equal(buildButtonHref({ actionType: "website", href: "https://example.com/menu" }), "https://example.com/menu");
  assert.match(buildButtonHref({ actionType: "directions", mapSourceMode: "custom_address", address: "10 Magnolia Ave", mapOpenApp: "google" }) || "", /google\.com\/maps\/dir/);
  assert.equal(buildButtonHref({ actionType: "website", href: "javascript:alert(1)" }), undefined);
});
