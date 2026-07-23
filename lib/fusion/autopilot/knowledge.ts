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
  tags?: string[];
  updatedAt?: string;
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

export type GroundingResult = {
  groundedPrompt: string;
  snippets: KnowledgeSnippet[];
  evidence: "confirmed" | "derived" | "none";
  scores: Array<{ id: string; score: number }>;
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
  const next = {
    ...snippet,
    updatedAt: snippet.updatedAt ?? new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  knowledgeByBusiness.set(snippet.businessId, list);
  return next;
}

export function listKnowledge(businessId: string): KnowledgeSnippet[] {
  return [...(knowledgeByBusiness.get(businessId) ?? [])];
}

export function deleteKnowledgeSnippet(businessId: string, id: string): boolean {
  const list = knowledgeByBusiness.get(businessId) ?? [];
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  knowledgeByBusiness.set(businessId, next);
  return true;
}

/** Seed / refresh brand-kit derived Knowledge for grounding */
export function seedBrandKitKnowledge(
  businessId: string,
  brand: {
    businessName?: string;
    voice?: string;
    tagline?: string;
    offerHints?: string;
    colors?: string;
  }
): KnowledgeSnippet[] {
  const seeded: KnowledgeSnippet[] = [];
  if (brand.businessName || brand.tagline) {
    seeded.push(
      upsertKnowledgeSnippet({
        id: `${businessId}_brand_identity`,
        businessId,
        source: "brand_kit",
        title: "Brand identity",
        body: [brand.businessName, brand.tagline].filter(Boolean).join(" — "),
        tags: ["brand", "identity"],
      })
    );
  }
  if (brand.voice) {
    seeded.push(
      upsertKnowledgeSnippet({
        id: `${businessId}_brand_voice`,
        businessId,
        source: "brand_kit",
        title: "Brand voice",
        body: brand.voice,
        tags: ["voice", "tone"],
      })
    );
  }
  if (brand.offerHints) {
    seeded.push(
      upsertKnowledgeSnippet({
        id: `${businessId}_brand_offers`,
        businessId,
        source: "brand_kit",
        title: "Offer hints",
        body: brand.offerHints,
        tags: ["offers"],
      })
    );
  }
  if (brand.colors) {
    seeded.push(
      upsertKnowledgeSnippet({
        id: `${businessId}_brand_colors`,
        businessId,
        source: "brand_kit",
        title: "Brand colors",
        body: brand.colors,
        tags: ["visual"],
      })
    );
  }
  return seeded;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/**
 * Token-overlap grounding with title/tag boosts. Evidence:
 * - confirmed: at least one snippet scored
 * - none: empty corpus or no overlap
 */
export function groundPromptWithKnowledge(
  businessId: string,
  prompt: string,
  limit = 3
): GroundingResult {
  const tokens = tokenize(prompt);
  const corpus = listKnowledge(businessId);
  if (!corpus.length || !tokens.length) {
    return { groundedPrompt: prompt, snippets: [], evidence: "none", scores: [] };
  }

  const scored = corpus
    .map((s) => {
      const hay = tokenize(`${s.title} ${s.body} ${(s.tags ?? []).join(" ")}`);
      const haySet = new Set(hay);
      let score = 0;
      for (const t of tokens) {
        if (haySet.has(t)) score += 1;
        if (s.title.toLowerCase().includes(t)) score += 1.5;
        if ((s.tags ?? []).some((tag) => tag.toLowerCase().includes(t))) score += 0.75;
      }
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length) {
    return { groundedPrompt: prompt, snippets: [], evidence: "none", scores: [] };
  }

  const snippets = scored.map((x) => x.s);
  const block = snippets
    .map((s) => `- [${s.source}] ${s.title}: ${s.body.slice(0, 280)}`)
    .join("\n");
  return {
    groundedPrompt: `${prompt}\n\nGrounded business Knowledge (approved):\n${block}`,
    snippets,
    evidence: "confirmed",
    scores: scored.map((x) => ({ id: x.s.id, score: Number(x.score.toFixed(2)) })),
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
