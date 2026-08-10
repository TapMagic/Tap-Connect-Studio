/**
 * Future tApIt Brand Environment readiness seam — architecture only.
 * No AI credentials, crawling, or Campaign intelligence in this assignment.
 */

export type BrandEnvironmentTextureFamily =
  | "solid"
  | "gradient"
  | "material"
  | "texture"
  | "image"
  | "brick"
  | "grunge"
  | "concrete"
  | "wood"
  | "metal"
  | "abstract";

export type BrandEnvironmentContract = Readonly<{
  version: 1;
  baseBackgroundChoice?: string;
  brandAnchorColors?: readonly string[];
  textureFamily?: BrandEnvironmentTextureFamily;
  lightingDirection?: "top_left" | "top" | "top_right" | "ambient";
  contrastPreference?: "subtle" | "balanced" | "dramatic";
  visualDensity?: "sparse" | "balanced" | "dense";
  decorativeVocabulary?: readonly string[];
  surfaceCompatibility?: readonly string[];
  finishCompatibility?: readonly string[];
  /** If imagery is required, durable asset id + recipe metadata — never random regenerate. */
  approvedAssetIds?: readonly string[];
  recipeId?: string;
}>;

export function emptyBrandEnvironment(): BrandEnvironmentContract {
  return { version: 1 };
}

/** Validate a future environment payload without running generation. */
export function isBrandEnvironmentContract(value: unknown): value is BrandEnvironmentContract {
  if (!value || typeof value !== "object") return false;
  return (value as BrandEnvironmentContract).version === 1;
}
