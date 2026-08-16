import type { SignatureLayoutRecipe } from "./types";

export const SIGNATURE_LAYOUT_RECIPES: readonly SignatureLayoutRecipe[] = [
  { id: "SINGLE", label: "Single", minItems: 1, maxItems: 1, columns: 1, compact: false },
  { id: "STACK-2", label: "Two-row stack", minItems: 2, maxItems: 2, columns: 1, compact: false },
  { id: "STACK-3", label: "Three-row stack", minItems: 3, maxItems: 3, columns: 1, compact: false },
  { id: "GRID-2", label: "Two-column grid", minItems: 2, maxItems: 12, columns: 2, compact: false },
  { id: "GROUPED-COMPACT", label: "Grouped compact", minItems: 2, maxItems: 8, columns: 1, compact: true },
  { id: "ICON-ROW", label: "Independent icon row", minItems: 3, maxItems: 6, columns: 1, compact: true },
] as const;

export function getSignatureLayoutRecipe(id: SignatureLayoutRecipe["id"]) {
  return SIGNATURE_LAYOUT_RECIPES.find((recipe) => recipe.id === id);
}
