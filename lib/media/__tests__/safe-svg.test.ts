import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeSvg, sanitizeMediaSvg } from "@/lib/media/safe-svg";

describe("safe SVG media ingestion", () => {
  it("accepts a professional logo SVG and preserves fill/transparency signals", () => {
    const logo = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
        <rect width="120" height="40" fill="none"/>
        <path d="M10 30 L30 10 L50 30 Z" fill="#b8ff2c"/>
        <text x="60" y="26" fill="#ffffff" font-size="14">ACME</text>
      </svg>`,
      "utf8"
    );
    assert.equal(looksLikeSvg(logo), true);
    const clean = sanitizeMediaSvg(logo);
    assert.ok(clean);
    const text = clean!.toString("utf8");
    assert.match(text, /fill="#b8ff2c"/);
    assert.match(text, /viewBox/);
    assert.doesNotMatch(text, /<script/i);
  });

  it("strips scripting from hostile SVG so it cannot execute", () => {
    const hostile = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
        <script>document.cookie</script>
        <circle cx="10" cy="10" r="5" fill="red"/>
        <a href="javascript:alert(2)"><text>x</text></a>
      </svg>`,
      "utf8"
    );
    const clean = sanitizeMediaSvg(hostile);
    assert.ok(clean);
    const text = clean!.toString("utf8");
    assert.doesNotMatch(text, /<script/i);
    assert.doesNotMatch(text, /\sonload=/i);
    assert.doesNotMatch(text, /javascript:/i);
    assert.match(text, /<circle/);
  });

  it("rejects or fully cleans SVG that relied on foreignObject scripting", () => {
    const stillHostile = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>`,
      "utf8"
    );
    const clean = sanitizeMediaSvg(stillHostile);
    if (clean) {
      assert.doesNotMatch(clean.toString("utf8"), /script|foreignObject/i);
    } else {
      assert.equal(clean, null);
    }
  });
});
