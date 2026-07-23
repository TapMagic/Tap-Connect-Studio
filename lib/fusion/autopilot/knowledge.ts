/**
 * Autopilot Knowledge grounding + cost ledger (local FUNCTIONAL depth).
 * Full RAG against tenant Knowledge remains pending isolated DB + embeddings.
 */

export type KnowledgeSnippet = {
  id: string;
  title: string;
  body: string;
  source: "brand_kit" | "campaign" | "manual" | "seed";
  businessId: string;
};

export type CostLedgerEntry = {
  id: string;
  businessId: string;
  proposalId?: string;
  recipeId: string;
  recipeVersion?: string | number;
  estimatedTokens: number;
  estimatedUsd: number;
  model: string;
  createdAt: string;
};

const knowledgeByBusiness = new Map<string, KnowledgeSnippet[]>();
const costLedger: CostLedgerEntry[] = [];

export function resetAutopilotKnowledgeMemory() {
  knowledgeByBusiness.clear();
  costLedger.length = 0;
}

export function upsertKnowledgeSnippet(snippet: KnowledgeSnippet) {
  const list = knowledgeByBusiness.get(snippet.businessId) ?? [];
  const idx = list.findIndex((s) => s.id === snippet.id);
  if (idx >= 0) list[idx] = snippet;
  else list.push(snippet);
  knowledgeByBusiness.set(snippet.businessId, list);
  return snippet;
}

export function listKnowledge(businessId: string): KnowledgeSnippet[] {
  return [...(knowledgeByBusiness.get(businessId) ?? [])];
}

/** Naive keyword grounding — returns top snippets for prompt enrichment */
export function groundPromptWithKnowledge(
  businessId: string,
  prompt: string,
  limit = 3
): { groundedPrompt: string; snippets: KnowledgeSnippet[] } {
  const tokens = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
  const scored = listKnowledge(businessId)
    .map((s) => {
      const hay = `${s.title} ${s.body}`.toLowerCase();
      const score = tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);

  if (!scored.length) {
    return { groundedPrompt: prompt, snippets: [] };
  }

  const block = scored
    .map((s) => `- [${s.source}] ${s.title}: ${s.body.slice(0, 240)}`)
    .join("\n");
  return {
    groundedPrompt: `${prompt}\n\nGrounded business Knowledge (approved):\n${block}`,
    snippets: scored,
  };
}

export function recordCostLedgerEntry(
  input: Omit<CostLedgerEntry, "id" | "createdAt"> & { id?: string }
): CostLedgerEntry {
  const entry: CostLedgerEntry = {
    id: input.id ?? `cost_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  costLedger.unshift(entry);
  return entry;
}

export function listCostLedger(businessId: string, limit = 50): CostLedgerEntry[] {
  return costLedger.filter((e) => e.businessId === businessId).slice(0, limit);
}

export function sumCostUsd(businessId: string): number {
  return listCostLedger(businessId, 10_000).reduce((n, e) => n + e.estimatedUsd, 0);
}

/** Rough estimate used until provider usage APIs are wired */
export function estimateGenerationCost(prompt: string, model = "gpt-4o-mini") {
  const estimatedTokens = Math.max(200, Math.ceil(prompt.length / 4) + 400);
  const estimatedUsd = Number(((estimatedTokens / 1000) * 0.002).toFixed(5));
  return { estimatedTokens, estimatedUsd, model };
}
