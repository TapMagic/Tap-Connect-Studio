import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  estimateGenerationCost,
  groundPromptWithKnowledge,
  listCostLedger,
  recordCostLedgerEntry,
  resetAutopilotKnowledgeMemory,
  seedBrandKitKnowledge,
  sumCostUsd,
  upsertKnowledgeSnippet,
} from "../knowledge";

describe("Autopilot Knowledge + cost ledger", () => {
  beforeEach(() => resetAutopilotKnowledgeMemory());

  it("grounds prompt with matching snippets", () => {
    upsertKnowledgeSnippet({
      id: "k1",
      businessId: "b1",
      title: "Reserve box promo",
      body: "Weekend cigar lounge 20% off reserve boxes",
      source: "manual",
    });
    const { groundedPrompt, snippets, evidence } = groundPromptWithKnowledge(
      "b1",
      "Write a weekend cigar lounge promo with reserve boxes"
    );
    assert.equal(snippets.length, 1);
    assert.equal(evidence, "confirmed");
    assert.match(groundedPrompt, /Grounded business Knowledge/);
  });

  it("seeds brand kit knowledge", () => {
    const seeded = seedBrandKitKnowledge("b2", {
      businessName: "Tap Lounge",
      voice: "Warm and concise",
      tagline: "Stay connected",
    });
    assert.ok(seeded.length >= 2);
  });

  it("records cost ledger entries", () => {
    const cost = estimateGenerationCost("hello world ".repeat(40));
    recordCostLedgerEntry({
      businessId: "b1",
      recipeId: "campaign_draft_v1",
      recipeVersion: 1,
      estimatedTokens: cost.estimatedTokens,
      estimatedUsd: cost.estimatedUsd,
      model: cost.model,
    });
    assert.equal(listCostLedger("b1").length, 1);
    assert.ok(sumCostUsd("b1") > 0);
  });
});
