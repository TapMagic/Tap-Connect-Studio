/**
 * Production-grade open-source font catalog for Creative Studio.
 * Sources: Google Fonts (OFL / Apache 2.0). Lazy-loaded via CSS2 API.
 * Do not include unlicensed proprietary fonts.
 */

export type FontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "slab-serif"
  | "humanist"
  | "geometric"
  | "handwriting"
  | "monospace"
  | "condensed"
  | "editorial"
  | "rounded"
  | "headline";

export type FontFamilyDefinition = {
  id: string;
  family: string;
  category: FontCategory;
  /** Google Fonts family query name */
  googleFamily: string;
  weights: number[];
  italics: boolean;
  license: "OFL" | "Apache-2.0";
  source: "google-fonts";
  tags?: string[];
  pairingHint?: string;
};

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  "sans-serif": "Sans Serif",
  serif: "Serif",
  display: "Display",
  "slab-serif": "Slab Serif",
  humanist: "Humanist",
  geometric: "Geometric",
  handwriting: "Handwriting / Script",
  monospace: "Monospace",
  condensed: "Condensed",
  editorial: "Editorial",
  rounded: "Friendly / Rounded",
  headline: "High-impact Headline",
};

/** Substantial first catalog — extensible to hundreds of families. */
export const FONT_CATALOG: FontFamilyDefinition[] = [
  { id: "inter", family: "Inter", category: "sans-serif", googleFamily: "Inter", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts", tags: ["ui", "brand"], pairingHint: "Source Serif 4" },
  { id: "dm-sans", family: "DM Sans", category: "sans-serif", googleFamily: "DM Sans", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "manrope", family: "Manrope", category: "sans-serif", googleFamily: "Manrope", weights: [400, 500, 600, 700, 800], italics: false, license: "OFL", source: "google-fonts" },
  { id: "plus-jakarta", family: "Plus Jakarta Sans", category: "sans-serif", googleFamily: "Plus Jakarta Sans", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "outfit", family: "Outfit", category: "geometric", googleFamily: "Outfit", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "space-grotesk", family: "Space Grotesk", category: "geometric", googleFamily: "Space Grotesk", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "figtree", family: "Figtree", category: "sans-serif", googleFamily: "Figtree", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "sora", family: "Sora", category: "sans-serif", googleFamily: "Sora", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "urbanist", family: "Urbanist", category: "geometric", googleFamily: "Urbanist", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "rubik", family: "Rubik", category: "rounded", googleFamily: "Rubik", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "nunito", family: "Nunito", category: "rounded", googleFamily: "Nunito", weights: [400, 600, 700, 800], italics: true, license: "OFL", source: "google-fonts" },
  { id: "nunito-sans", family: "Nunito Sans", category: "rounded", googleFamily: "Nunito Sans", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "quicksand", family: "Quicksand", category: "rounded", googleFamily: "Quicksand", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "poppins", family: "Poppins", category: "geometric", googleFamily: "Poppins", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "montserrat", family: "Montserrat", category: "geometric", googleFamily: "Montserrat", weights: [400, 500, 600, 700, 800], italics: true, license: "OFL", source: "google-fonts" },
  { id: "raleway", family: "Raleway", category: "humanist", googleFamily: "Raleway", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "work-sans", family: "Work Sans", category: "humanist", googleFamily: "Work Sans", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "lato", family: "Lato", category: "humanist", googleFamily: "Lato", weights: [400, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "open-sans", family: "Open Sans", category: "humanist", googleFamily: "Open Sans", weights: [400, 500, 600, 700], italics: true, license: "Apache-2.0", source: "google-fonts" },
  { id: "roboto", family: "Roboto", category: "sans-serif", googleFamily: "Roboto", weights: [400, 500, 700], italics: true, license: "Apache-2.0", source: "google-fonts" },
  { id: "source-sans-3", family: "Source Sans 3", category: "humanist", googleFamily: "Source Sans 3", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts", pairingHint: "Source Serif 4" },
  { id: "ibm-plex-sans", family: "IBM Plex Sans", category: "humanist", googleFamily: "IBM Plex Sans", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "noto-sans", family: "Noto Sans", category: "sans-serif", googleFamily: "Noto Sans", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "karla", family: "Karla", category: "sans-serif", googleFamily: "Karla", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "mulish", family: "Mulish", category: "sans-serif", googleFamily: "Mulish", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "barlow", family: "Barlow", category: "condensed", googleFamily: "Barlow", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "barlow-condensed", family: "Barlow Condensed", category: "condensed", googleFamily: "Barlow Condensed", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "oswald", family: "Oswald", category: "condensed", googleFamily: "Oswald", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts", tags: ["headline"] },
  { id: "bebas-neue", family: "Bebas Neue", category: "headline", googleFamily: "Bebas Neue", weights: [400], italics: false, license: "OFL", source: "google-fonts", tags: ["headline"] },
  { id: "anton", family: "Anton", category: "headline", googleFamily: "Anton", weights: [400], italics: false, license: "OFL", source: "google-fonts" },
  { id: "archivo-black", family: "Archivo Black", category: "headline", googleFamily: "Archivo Black", weights: [400], italics: false, license: "OFL", source: "google-fonts" },
  { id: "alfa-slab", family: "Alfa Slab One", category: "slab-serif", googleFamily: "Alfa Slab One", weights: [400], italics: false, license: "OFL", source: "google-fonts" },
  { id: "roboto-slab", family: "Roboto Slab", category: "slab-serif", googleFamily: "Roboto Slab", weights: [400, 500, 700], italics: false, license: "Apache-2.0", source: "google-fonts" },
  { id: "zilla-slab", family: "Zilla Slab", category: "slab-serif", googleFamily: "Zilla Slab", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "source-serif-4", family: "Source Serif 4", category: "serif", googleFamily: "Source Serif 4", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts", pairingHint: "Source Sans 3" },
  { id: "libre-baskerville", family: "Libre Baskerville", category: "serif", googleFamily: "Libre Baskerville", weights: [400, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "playfair", family: "Playfair Display", category: "editorial", googleFamily: "Playfair Display", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "cormorant", family: "Cormorant Garamond", category: "editorial", googleFamily: "Cormorant Garamond", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "eb-garamond", family: "EB Garamond", category: "editorial", googleFamily: "EB Garamond", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "lora", family: "Lora", category: "serif", googleFamily: "Lora", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "merriweather", family: "Merriweather", category: "serif", googleFamily: "Merriweather", weights: [400, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "crimson-pro", family: "Crimson Pro", category: "editorial", googleFamily: "Crimson Pro", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "libre-franklin", family: "Libre Franklin", category: "sans-serif", googleFamily: "Libre Franklin", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "fraunces", family: "Fraunces", category: "display", googleFamily: "Fraunces", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "syne", family: "Syne", category: "display", googleFamily: "Syne", weights: [400, 600, 700, 800], italics: false, license: "OFL", source: "google-fonts" },
  { id: "clash-display-proxy", family: "Bricolage Grotesque", category: "display", googleFamily: "Bricolage Grotesque", weights: [400, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "instrument-serif", family: "Instrument Serif", category: "editorial", googleFamily: "Instrument Serif", weights: [400], italics: true, license: "OFL", source: "google-fonts" },
  { id: "instrument-sans", family: "Instrument Sans", category: "sans-serif", googleFamily: "Instrument Sans", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "dm-serif", family: "DM Serif Display", category: "display", googleFamily: "DM Serif Display", weights: [400], italics: true, license: "OFL", source: "google-fonts" },
  { id: "josefin", family: "Josefin Sans", category: "geometric", googleFamily: "Josefin Sans", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "cabin", family: "Cabin", category: "humanist", googleFamily: "Cabin", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "exo-2", family: "Exo 2", category: "display", googleFamily: "Exo 2", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "orbitron", family: "Orbitron", category: "display", googleFamily: "Orbitron", weights: [400, 500, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "jetbrains-mono", family: "JetBrains Mono", category: "monospace", googleFamily: "JetBrains Mono", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "source-code", family: "Source Code Pro", category: "monospace", googleFamily: "Source Code Pro", weights: [400, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "fira-code", family: "Fira Code", category: "monospace", googleFamily: "Fira Code", weights: [400, 500, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "ibm-plex-mono", family: "IBM Plex Mono", category: "monospace", googleFamily: "IBM Plex Mono", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "space-mono", family: "Space Mono", category: "monospace", googleFamily: "Space Mono", weights: [400, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "caveat", family: "Caveat", category: "handwriting", googleFamily: "Caveat", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "dancing-script", family: "Dancing Script", category: "handwriting", googleFamily: "Dancing Script", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "pacifico", family: "Pacifico", category: "handwriting", googleFamily: "Pacifico", weights: [400], italics: false, license: "OFL", source: "google-fonts" },
  { id: "great-vibes", family: "Great Vibes", category: "handwriting", googleFamily: "Great Vibes", weights: [400], italics: false, license: "OFL", source: "google-fonts" },
  { id: "satisfy", family: "Satisfy", category: "handwriting", googleFamily: "Satisfy", weights: [400], italics: false, license: "OFL", source: "google-fonts" },
  { id: "kalam", family: "Kalam", category: "handwriting", googleFamily: "Kalam", weights: [300, 400, 700], italics: false, license: "OFL", source: "google-fonts" },
  { id: "permanent-marker", family: "Permanent Marker", category: "display", googleFamily: "Permanent Marker", weights: [400], italics: false, license: "Apache-2.0", source: "google-fonts" },
  { id: "archivo", family: "Archivo", category: "sans-serif", googleFamily: "Archivo", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "lexend", family: "Lexend", category: "sans-serif", googleFamily: "Lexend", weights: [400, 500, 600, 700], italics: false, license: "OFL", source: "google-fonts", tags: ["accessible"] },
  { id: "public-sans", family: "Public Sans", category: "sans-serif", googleFamily: "Public Sans", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "schibsted", family: "Schibsted Grotesk", category: "sans-serif", googleFamily: "Schibsted Grotesk", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "newsreader", family: "Newsreader", category: "editorial", googleFamily: "Newsreader", weights: [400, 500, 600, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "literata", family: "Literata", category: "editorial", googleFamily: "Literata", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "bitter", family: "Bitter", category: "slab-serif", googleFamily: "Bitter", weights: [400, 500, 700], italics: true, license: "OFL", source: "google-fonts" },
  { id: "arvo", family: "Arvo", category: "slab-serif", googleFamily: "Arvo", weights: [400, 700], italics: true, license: "OFL", source: "google-fonts" },
];

export function getFontById(id: string): FontFamilyDefinition | undefined {
  return FONT_CATALOG.find((f) => f.id === id || f.family === id);
}

export function searchFonts(
  query: string,
  opts?: { category?: FontCategory | "all"; brandIds?: string[] }
): FontFamilyDefinition[] {
  const q = query.trim().toLowerCase();
  return FONT_CATALOG.filter((f) => {
    if (opts?.category && opts.category !== "all" && f.category !== opts.category) {
      return false;
    }
    if (!q) return true;
    return (
      f.family.toLowerCase().includes(q) ||
      f.category.includes(q) ||
      (f.tags || []).some((t) => t.includes(q))
    );
  });
}

export function fontCssStack(font: FontFamilyDefinition): string {
  const fallback =
    font.category === "serif" ||
    font.category === "editorial" ||
    font.category === "slab-serif"
      ? "ui-serif, Georgia, serif"
      : font.category === "monospace"
        ? "ui-monospace, monospace"
        : font.category === "handwriting"
          ? "cursive"
          : "ui-sans-serif, system-ui, sans-serif";
  return `"${font.family}", ${fallback}`;
}

export function weightAvailable(
  font: FontFamilyDefinition,
  weight: number
): boolean {
  return font.weights.includes(weight);
}

export function italicAvailable(font: FontFamilyDefinition): boolean {
  return font.italics;
}

export const FONT_CATALOG_SIZE = FONT_CATALOG.length;
