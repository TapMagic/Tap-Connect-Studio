import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractHomepageDiscovery,
  listSameOriginStylesheetUrls,
  mapFontToBrandStyle,
} from "../website-discovery";

describe("website discovery expansion", () => {
  it("lists only same-origin stylesheets", () => {
    const html = `
      <link rel="stylesheet" href="/a.css">
      <link rel="stylesheet" href="https://cdn.example/x.css">
      <link rel="stylesheet" href="https://northstar.example/b.css">
    `;
    const urls = listSameOriginStylesheetUrls(
      html,
      new URL("https://northstar.example/")
    );
    assert.deepEqual(urls.sort(), [
      "https://northstar.example/a.css",
      "https://northstar.example/b.css",
    ].sort());
  });

  it("maps declared fonts to local Brand font styles", () => {
    assert.equal(mapFontToBrandStyle("Playfair Display"), "CLASSIC");
    assert.equal(mapFontToBrandStyle("DM Sans"), "MINIMAL");
    assert.equal(mapFontToBrandStyle("Unknown Fancy"), "MODERN");
  });

  it("keeps accessibility concerns as Suggested cues", () => {
    const html = `<html><body><img src="/a.jpg"><img src="/b.jpg" alt="ok"></body></html>`;
    const bundle = extractHomepageDiscovery(html, new URL("https://northstar.example/"));
    assert.ok(
      bundle.candidates.some(
        (c) => c.kind === "accessibility" && /without alt/i.test(c.value)
      )
    );
  });

  it("rejects non-http candidate schemes and normalizes relative JSON-LD logos", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="data:image/png;base64,AAAA">
        <link rel="icon" href="javascript:alert(1)">
        <script type="application/ld+json">
          {"@type":"Organization","name":"Northstar","logo":"/brand/logo.png"}
        </script>
      </head></html>
    `;
    const bundle = extractHomepageDiscovery(
      html,
      new URL("https://northstar.example/path/")
    );
    assert.ok(
      bundle.candidates.some(
        (candidate) =>
          candidate.kind === "logo" &&
          candidate.value === "https://northstar.example/brand/logo.png"
      )
    );
    assert.equal(
      bundle.candidates.some((candidate) => /^(data|javascript|file):/i.test(candidate.value)),
      false
    );
  });
});
