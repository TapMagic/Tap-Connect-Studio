import assert from "node:assert/strict";
import test from "node:test";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";

function experienceDraft(payloadBytes: number) {
  return {
    version: 3,
    sections: [],
    experience: {
      contractId: "tapExperience@1.0.0",
      experienceId: "experience-proof",
      defaultPageId: "page-home",
      pages: [{
        pageId: "page-home",
        title: "Home",
        composition: { sections: [] },
      }],
    },
    proofPayload: "x".repeat(payloadBytes),
  };
}

test("accepts a production-sized multi-Page Experience draft above the obsolete 2 MB ceiling", () => {
  assert.equal(isTapConnectCardDraft(experienceDraft(2_400_000)), true);
});

test("retains a bounded server-side draft size guard", () => {
  assert.equal(isTapConnectCardDraft(experienceDraft(8_100_000)), false);
});
