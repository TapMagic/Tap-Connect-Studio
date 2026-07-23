import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeContentBlocks } from "../normalize-content-blocks";

describe("normalizeContentBlocks", () => {
  it("maps legacy seed heading/text/offer + props into renderer blocks", () => {
    const blocks = normalizeContentBlocks([
      { id: "seed_heading", type: "heading", props: { text: "Hello Cafe" } },
      { id: "seed_text", type: "text", props: { text: "Body copy" } },
      {
        id: "seed_offer",
        type: "offer",
        props: { title: "SEEDDEMO", description: "10% off" },
      },
    ]);

    assert.equal(blocks.length, 3);
    assert.equal(blocks[0].type, "headline");
    assert.equal(blocks[0].enabled, true);
    assert.equal(blocks[0].data.headline, "Hello Cafe");
    assert.equal(blocks[1].type, "rich_text");
    assert.equal(blocks[1].data.body, "Body copy");
    assert.equal(blocks[2].type, "offer_coupon");
    assert.equal(blocks[2].data.code, "SEEDDEMO");
    assert.equal(blocks[2].data.title, "SEEDDEMO");
  });

  it("preserves modern blocks and treats missing enabled as on", () => {
    const blocks = normalizeContentBlocks([
      {
        id: "a",
        type: "headline",
        order: 0,
        label: "Headline",
        data: { headline: "Exclusive Offer", alignment: "center" },
      },
    ]);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].enabled, true);
    assert.equal(blocks[0].data.headline, "Exclusive Offer");
  });

  it("drops unknown types", () => {
    const blocks = normalizeContentBlocks([{ id: "x", type: "not_a_block", data: {} }]);
    assert.equal(blocks.length, 0);
  });
});
