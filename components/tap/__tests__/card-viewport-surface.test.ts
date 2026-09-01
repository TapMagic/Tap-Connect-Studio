import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CardViewportSurface,
  STUDIO_PHONE_VIEWPORT_WIDTH_PX,
} from "@/components/tap/card-viewport-surface";

test("Card viewport authority exposes one canonical 390px Studio phone contract", () => {
  assert.equal(STUDIO_PHONE_VIEWPORT_WIDTH_PX, 390);
  const html = renderToStaticMarkup(
    CardViewportSurface({
      environment: "studio",
      testId: "proof-surface",
      children: "Card",
    }),
  );
  assert.match(html, /data-card-viewport-authority="phone-v1"/);
  assert.match(html, /data-canonical-studio-width="390"/);
  assert.match(html, /data-viewport-environment="studio"/);
  assert.match(html, /max-w-\[390px\]/);
});

test("runtime consumes the full phone width while retaining a desktop review cap", () => {
  const html = renderToStaticMarkup(
    CardViewportSurface({ environment: "runtime", children: "Card" }),
  );
  assert.match(html, /w-full/);
  assert.match(html, /max-w-\[512px\]/);
  assert.match(html, /data-viewport-environment="runtime"/);
});
