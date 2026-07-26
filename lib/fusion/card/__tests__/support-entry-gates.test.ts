import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { submitCardSupportEntry } from "@/lib/fusion/card/support-entry";

describe("card support entry gates", () => {
  it("requires consent before any persistence", async () => {
    const result = await submitCardSupportEntry({
      businessId: "biz_test",
      email: "guest@example.com",
      question: "What are your hours?",
      consentGiven: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "consent_required");
  });

  it("validates empty question", async () => {
    const result = await submitCardSupportEntry({
      businessId: "biz_test",
      email: "guest@example.com",
      question: "  ",
      consentGiven: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "validation");
  });
});
