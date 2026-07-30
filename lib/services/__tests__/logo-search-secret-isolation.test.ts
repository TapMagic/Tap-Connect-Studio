import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  logoDevUpstreamUrl,
  searchLogosAndIcons,
} from "@/lib/services/logo-search";

const originalFetch = globalThis.fetch;
const originalToken = process.env.LOGO_DEV_TOKEN;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.LOGO_DEV_TOKEN;
  else process.env.LOGO_DEV_TOKEN = originalToken;
});

describe("Logo.dev secret isolation", () => {
  it("returns an authenticated TapConnect proxy URL, never the provider token", async () => {
    process.env.LOGO_DEV_TOKEN = "server-only-test-token";
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ query: { pages: {} } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const results = await searchLogosAndIcons("Acme");
    const logo = results.find((item) => item.source === "logo_dev");
    assert.ok(logo);
    assert.match(logo.url, /^\/api\/logos\/image\?/);
    assert.doesNotMatch(logo.url, /server-only-test-token/);
    assert.doesNotMatch(JSON.stringify(results), /server-only-test-token/);

    const upstream = logoDevUpstreamUrl({ name: "Acme" });
    assert.match(upstream || "", /server-only-test-token/);
  });
});

