import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CustomerOutcome } from "@prisma/client";
import { buildFirstCardDraft } from "@/lib/fusion/card/first-card-draft";

describe("deterministic first Card draft", () => {
  it("renders only actions backed by approved facts", () => {
    const result = buildFirstCardDraft({
      businessName: "Northstar Workshop",
      outcome: "CONTACT",
      facts: [
        {
          id: "fact-website",
          factKey: "website",
          value: "https://northstar.example",
        },
      ],
    });
    const actions = result.draft.sections.filter((section) => section.type === "action");
    assert.deepEqual(actions.map((section) => section.actionKind), ["website"]);
    assert.equal(
      result.draft.utilityLayer?.utilities?.find((item) => item.kind === "map")?.enabled,
      false
    );
    assert.doesNotMatch(JSON.stringify(result.draft), /discount|coupon|best|testimonial/i);
  });

  it("asks one bounded question when outcome data is missing", () => {
    const outcomes: CustomerOutcome[] = [
      "CONTACT",
      "REVIEWS",
      "OFFER",
      "APPOINTMENTS",
      "DIRECTIONS",
      "ESSENTIALS",
      "LOYALTY",
      "FAQ",
    ];
    for (const outcome of outcomes) {
      const result = buildFirstCardDraft({
        businessName: "Northstar Workshop",
        outcome,
        facts: [],
      });
      assert.ok(result.manifest.questions.length <= 1);
      assert.doesNotMatch(
        JSON.stringify(result.draft),
        /price|discount|offer code|opening hours|testimonial/i
      );
    }
  });

  it("uses exact confirmed offer details without inventing terms", () => {
    const result = buildFirstCardDraft({
      businessName: "Northstar Workshop",
      outcome: "OFFER",
      facts: [
        { id: "title", factKey: "offerTitle", value: "Owner supplied title" },
        { id: "detail", factKey: "offerDescription", value: "Owner supplied terms" },
        { id: "url", factKey: "offerUrl", value: "https://northstar.example/offer" },
      ],
    });
    const serialized = JSON.stringify(result.draft);
    assert.match(serialized, /Owner supplied title/);
    assert.match(serialized, /Owner supplied terms/);
    assert.doesNotMatch(serialized, /% off|expires|code/i);
  });
});
