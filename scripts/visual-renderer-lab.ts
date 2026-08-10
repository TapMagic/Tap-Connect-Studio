/**
 * Non-production renderer lab specimens (engineering evidence).
 * Writes HTML under tmp/visual-renderer-repair-evidence/lab/
 */

import fs from "node:fs";
import path from "node:path";
import {
  composeDepthShadow,
  deriveFinishSurface,
  poundedCopperRimBackground,
  rimEdgeBoxShadow,
  themedBottomStopBackground,
} from "../lib/fusion/creative-studio/visual-parts";

const out = path.join("tmp", "visual-renderer-repair-evidence", "lab");
fs.mkdirSync(out, { recursive: true });

const depthSteps = [0, 0.25, 0.5, 0.75, 1];
const depthCards = depthSteps
  .map(
    (i) => `<div class="card" style="box-shadow:${composeDepthShadow(3, i)}">
  <strong>Depth ${i}</strong>
  <code>${composeDepthShadow(3, i)}</code>
</div>`
  )
  .join("\n");

const finishCards = (["lacquer", "acrylic"] as const)
  .flatMap((finish) =>
    (["rect", "pill", "circle", "angular"] as const).map((geo) => {
      const d = deriveFinishSurface(finish, "#16a34a", { lightResponse: 0.7, depth: 0.6 }, geo);
      const radius =
        geo === "circle" ? "50%" : geo === "pill" ? "999px" : geo === "angular" ? "4px" : "14px";
      const clip =
        geo === "angular"
          ? "polygon(8% 0, 92% 0, 100% 18%, 100% 82%, 92% 100%, 8% 100%, 0 82%, 0 18%)"
          : "none";
      return `<div class="swatch" style="background:${d.gradient};border-radius:${radius};clip-path:${clip}">
  <span class="hi" style="background:${d.highlight}"></span>
  <strong>${finish} / ${geo}</strong>
</div>`;
    })
  )
  .join("\n");

const copper = poundedCopperRimBackground();
const copperConsumers = `
<div class="row">
  <div class="rim" style="background:${copper};box-shadow:${rimEdgeBoxShadow("copper")}" data-consumer="action-rim">Action rim</div>
  <div class="rim circle" style="background:${copper};box-shadow:${rimEdgeBoxShadow("copper")}" data-consumer="icon-station">Icon Station</div>
  <div class="stop" style="background:${themedBottomStopBackground("rim_pounded_copper")};box-shadow:${rimEdgeBoxShadow("copper")}" data-consumer="bottom-stop">Bottom Stop</div>
  <div class="div" style="background:${copper}" data-consumer="divider-edge">Divider edge</div>
</div>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Visual Renderer Repair Lab</title>
<style>
  body{margin:0;padding:24px;background:#0a0c10;color:#f8fafc;font:14px/1.4 ui-sans-serif,system-ui}
  h1,h2{color:#b8ff2c}
  .grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
  .card{background:#111827;border-radius:14px;padding:16px;min-height:88px}
  .card code{display:block;font-size:9px;opacity:.65;margin-top:8px;word-break:break-all}
  .swatches{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .swatch{position:relative;min-height:96px;overflow:hidden;display:grid;place-items:end start;padding:8px}
  .swatch .hi{position:absolute;inset:0;pointer-events:none}
  .row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .rim{width:120px;height:44px;border-radius:12px;padding:4px;color:#111}
  .rim.circle{width:56px;height:56px;border-radius:50%}
  .stop{width:220px;height:14px;border-radius:999px}
  .div{width:180px;height:8px;border-radius:999px}
  .note{opacity:.7;max-width:70ch}
</style>
</head>
<body>
  <h1>Visual Renderer Repair Lab</h1>
  <p class="note">Engineering specimens — not art direction. Generated from shared Depth / Finish / Copper authorities.</p>
  <h2>A. Depth ladder</h2>
  <div class="grid">${depthCards}</div>
  <h2>D/E. Finish + geometry response</h2>
  <div class="swatches">${finishCards}</div>
  <h2>F. Shared Copper authority</h2>
  ${copperConsumers}
  <p class="note">Source: scripts/visual-renderer-lab.ts · Product Studio e2e fills interaction/electric/hero ladders under the same folder.</p>
</body>
</html>`;

fs.writeFileSync(path.join(out, "index.html"), html);
console.log(`Wrote ${path.join(out, "index.html")}`);
