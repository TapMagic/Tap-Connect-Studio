import { DEFAULT_TOP_SHELF_PALETTE, type TopShelfPalette } from "./TopShelfPrimitives";

/** Canonical charcoal Anchor (package default face). */
export const TOP_SHELF_ANCHOR_CHARCOAL = "#171717";
/** Proof cobalt Anchor for color translation. */
export const TOP_SHELF_ANCHOR_COBALT = "#1747bd";

function mix(hex: string, toward: string, t: number): string {
  const a = hex.replace("#", "");
  const b = toward.replace("#", "");
  if (a.length !== 6 || b.length !== 6) return hex;
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const r = Math.round(ch(a, 0) * (1 - t) + ch(b, 0) * t);
  const g = Math.round(ch(a, 2) * (1 - t) + ch(b, 2) * t);
  const bl = Math.round(ch(a, 4) * (1 - t) + ch(b, 4) * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function rgbaFromHex(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return `rgba(59,130,246,${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Derive Top Shelf palette from Host Anchor Color — structure preserved. */
export function topShelfPaletteFromAnchor(anchor: string | null | undefined): TopShelfPalette {
  const a = (anchor || TOP_SHELF_ANCHOR_CHARCOAL).trim().toLowerCase();
  if (a === TOP_SHELF_ANCHOR_CHARCOAL.toLowerCase() || a === "#404040" || a === "#000000") {
    return { ...DEFAULT_TOP_SHELF_PALETTE };
  }
  if (a === TOP_SHELF_ANCHOR_COBALT.toLowerCase() || a === "#0d2e86" || a === "#1542b5") {
    return {
      glowStart: "rgba(74,163,255,.35)",
      glowEnd: "rgba(37,99,235,.32)",
      faceTop: "#2f6de8",
      faceMid: "#1747bd",
      faceBottom: "#07183f",
      border: "rgba(255,255,255,.28)",
      text: "#ffffff",
      mutedText: "#a3b4d4",
      icon: "#ffffff",
    };
  }
  // Generic Anchor translation — same layer recipe, recolored face/halo.
  const faceMid = a.startsWith("#") && a.length === 7 ? a : TOP_SHELF_ANCHOR_CHARCOAL;
  return {
    glowStart: rgbaFromHex(faceMid, 0.3),
    glowEnd: rgbaFromHex(mix(faceMid, "#a855f7", 0.35), 0.28),
    faceTop: mix(faceMid, "#ffffff", 0.22),
    faceMid,
    faceBottom: mix(faceMid, "#000000", 0.55),
    border: "rgba(255,255,255,.25)",
    text: "#ffffff",
    mutedText: "#a3a3a3",
    icon: "#ffffff",
  };
}
