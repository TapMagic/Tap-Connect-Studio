/**
 * Autopilot — authoritative contract world (F0 foundation).
 *
 * Authoritative:
 * - types.ts — proposal lifecycle (J16 accept/partial/reject/apply/undo/supersede)
 * - recipes.ts — campaign generation recipe catalog
 * - plan.ts — versioned AutopilotPlan
 * - knowledge-fact.ts — governed KnowledgeFact
 * - intervention.ts — structured human-intervention reasons
 * - approval-policy.ts — deterministic Approval Policy Engine
 * - outcome-recipe.ts — certified outcome recipe stubs (card.offer.measurable)
 * - prepared-execution.ts — versioned prepared-outcome execution contract (F2)
 * - prepared-orchestrator.ts — deterministic draft preparation + rollback (F2)
 *
 * Compatible (existing):
 * - proposals.ts, budget.ts, knowledge.ts (snippets), facade.ts, etc.
 *
 * Deprecated shim (unused at runtime; do not expand):
 * - team.ts — legacy worker-role / duplicate proposal world
 */

export * from "./types";
export * from "./recipes";
export * from "./facade";
export * from "./proposals";
export * from "./budget";
export * from "./knowledge";
export * from "./artifact-shaping";
export * from "./editor-revert";

export * from "./intervention";
export * from "./knowledge-fact";
export * from "./plan";
export * from "./approval-policy";
export * from "./outcome-recipe";
export * from "./plain-language";
export * from "./host-questions";
export * from "./outcome-assembler";
export * from "./prepared-execution";
export * from "./prepared-host";
export * from "./prepared-orchestrator";
