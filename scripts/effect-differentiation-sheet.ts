/**
 * Phase F — controlled effect comparison sheet (CSS signatures + HTML evidence).
 * Run: node --import tsx scripts/effect-differentiation-sheet.ts
 */

import fs from "node:fs";
import path from "node:path";
import { effectLayersCss, type EffectRenderTarget } from "../lib/fusion/creative-studio/effect-render";
import { applyEffectRecipe, EFFECT_RECIPES } from "../lib/fusion/creative-studio/material-engine";

const outDir = path.join(process.cwd(), "tmp/editor-integrity-evidence/effects");
fs.mkdirSync(outDir, { recursive: true });

const PRESETS = [
  "none",
  "soft_shadow",
  "soft_glow",
  "neon_edge",
  "double_neon",
  "aura",
  "electric",
  "raised",
  "recessed",
  "embossed",
  "debossed",
  "beveled",
] as const;

const targets: EffectRenderTarget[] = ["glyph", "icon_artwork", "surface"];

const rows: Array<{
  preset: string;
  target: string;
  signature: string;
  css: ReturnType<typeof effectLayersCss>;
}> = [];

for (const target of targets) {
  for (const preset of PRESETS) {
    const adapterTarget = target === "glyph" || target === "icon_artwork" ? target : "surface";
    const applied =
      preset === "none"
        ? {}
        : applyEffectRecipe(adapterTarget, preset, { color: "#22d3ee", fill: "#22d3ee" });
    const css = effectLayersCss(target, {
      effectPreset: preset,
      glow: Number(applied.glow ?? applied.boxGlow ?? 0),
      shadow: Number(applied.shadow ?? applied.boxShadow ?? 0),
      glowColor: typeof applied.glowColor === "string" ? applied.glowColor : "#22d3ee",
      secondaryGlow: Number(applied.secondaryGlow ?? 0),
      coreBrightness: Number(applied.coreBrightness ?? 1),
      edgeWidth: Number(applied.edgeWidth ?? 1.25),
      auraIntensity: Number(applied.auraIntensity ?? 0.45),
      innerShadow: typeof applied.innerShadow === "string" ? applied.innerShadow : null,
      color: "#22d3ee",
    });
    const signature = `${preset}|${css.textShadow || ""}|${css.filter || ""}|${css.boxShadow || ""}`;
    rows.push({ preset, target, signature, css });
  }
}

const byTarget = new Map<string, Set<string>>();
for (const row of rows) {
  const set = byTarget.get(row.target) || new Set();
  if (row.preset !== "none") set.add(row.signature);
  byTarget.set(row.target, set);
}

const collisions: string[] = [];
for (const target of targets) {
  const sigs = rows.filter((r) => r.target === target && r.preset !== "none").map((r) => r.signature);
  const unique = new Set(sigs);
  if (unique.size !== sigs.length) collisions.push(`${target}: ${sigs.length - unique.size} collisions`);
}

const htmlLabeled = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Effect differentiation — labeled</title>
<style>
  body{margin:0;background:#070b14;color:#fff;font:14px/1.4 ui-sans-serif,system-ui;}
  h1{padding:16px 20px;margin:0;font-size:18px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;padding:16px 20px}
  .card{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:20px;background:#0b1019;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#b8ff2c}
  .glyph{font-size:28px;font-weight:800}
  .icon{width:48px;height:48px;border-radius:10px;background:#22d3ee}
  .surface{width:100%;height:56px;border-radius:12px;background:linear-gradient(135deg,#1e293b,#0f172a)}
</style></head><body>
<h1>Named effects — labeled</h1>
${targets
  .map(
    (target) => `
<section><h1>${target}</h1><div class="grid">
${PRESETS.map((preset) => {
  const row = rows.find((r) => r.target === target && r.preset === preset)!;
  const style =
    target === "glyph"
      ? `text-shadow:${row.css.textShadow || "none"};color:#22d3ee`
      : target === "icon_artwork"
        ? `filter:${row.css.filter || "none"};background:#22d3ee`
        : `box-shadow:${row.css.boxShadow || "none"}`;
  const cls = target === "glyph" ? "glyph" : target === "icon_artwork" ? "icon" : "surface";
  const content = target === "glyph" ? "Aa" : "";
  return `<div class="card"><div class="label">${preset}</div><div class="${cls}" style="${style}">${content}</div></div>`;
}).join("")}
</div></section>`
  )
  .join("")}
</body></html>`;

const htmlUnlabeled = htmlLabeled
  .replace("labeled", "unlabeled")
  .replace(/<div class="label">[^<]*<\/div>/g, "");

fs.writeFileSync(path.join(outDir, "effect-sheet-labeled.html"), htmlLabeled);
fs.writeFileSync(path.join(outDir, "effect-sheet-unlabeled.html"), htmlUnlabeled);
fs.writeFileSync(
  path.join(outDir, "effect-signatures.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      recipeCount: EFFECT_RECIPES.length,
      collisions,
      rows: rows.map(({ preset, target, signature, css }) => ({ preset, target, signature, css })),
    },
    null,
    2
  )
);

if (collisions.length) {
  console.error("Effect signature collisions:", collisions);
  process.exitCode = 1;
} else {
  console.log(`Wrote effect differentiation sheet to ${outDir} (${rows.length} cells, no collisions)`);
}
