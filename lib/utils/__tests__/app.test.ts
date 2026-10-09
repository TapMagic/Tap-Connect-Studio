import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRequestPublicOrigin } from "../app";

describe("public request origin", () => {
  it("prefers the browser-visible origin over Railway's internal request URL", () => {
    const request = new Request("http://localhost:8080/api/experiences/demo/credentials", {
      method: "POST",
      headers: { origin: "https://studio.tapthemagic.com" },
    });

    assert.equal(getRequestPublicOrigin(request), "https://studio.tapthemagic.com");
  });

  it("uses standard forwarded proxy headers when Origin is absent", () => {
    const request = new Request("http://localhost:8080/api/experiences/demo/credentials", {
      method: "POST",
      headers: {
        "x-forwarded-host": "studio.tapthemagic.com",
        "x-forwarded-proto": "https",
      },
    });

    assert.equal(getRequestPublicOrigin(request), "https://studio.tapthemagic.com");
  });

  it("preserves a direct external request origin", () => {
    const request = new Request("https://studio.tapthemagic.com/api/experiences/demo/credentials", {
      method: "POST",
    });

    assert.equal(getRequestPublicOrigin(request), "https://studio.tapthemagic.com");
  });
});
