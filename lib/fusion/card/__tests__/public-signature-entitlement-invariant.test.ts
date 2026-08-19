import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CABINET_NOIR_ENTITLEMENT } from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";

describe("published Signature output continuity", () => {
  it("declares that an existing published output remains live after entitlement loss", () => {
    assert.equal(CABINET_NOIR_ENTITLEMENT.afterLoss.existingPublishedOutput, "remain-live");
    assert.equal(CABINET_NOIR_ENTITLEMENT.publicRenderRequiresCurrentEntitlement, false);
  });

  it("keeps the public Tap Card read path independent from current Signature entitlement", () => {
    const source = readFileSync("app/t/[deviceCode]/page.tsx", "utf8");
    assert.doesNotMatch(source, /resolveBusinessSignatureEntitlements|entitlements\.server|serviceDefinition|planEntitlement/);
  });

  it("keeps immutable public Demo snapshot reads independent from current Signature entitlement", () => {
    const source = readFileSync("app/api/public/demo-card/[slotKey]/route.ts", "utf8");
    assert.doesNotMatch(source, /resolveBusinessSignatureEntitlements|entitlements\.server|serviceDefinition|planEntitlement/);
    assert.match(source, /publicationSnapshot\.findUnique/);
  });
});
