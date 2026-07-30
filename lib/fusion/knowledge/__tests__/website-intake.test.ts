import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractHomepageFindings,
  isPrivateAddress,
  normalizeHomepageUrl,
  WebsiteIntakeError,
} from "@/lib/fusion/knowledge/website-intake";

describe("guarded homepage intake", () => {
  it("rejects credentials, local addresses and nonstandard ports", () => {
    assert.throws(
      () => normalizeHomepageUrl("https://user:secret@example.com"),
      WebsiteIntakeError
    );
    assert.throws(
      () => normalizeHomepageUrl("https://example.com:8443"),
      WebsiteIntakeError
    );
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.1.2",
      "172.20.1.2",
      "192.168.1.2",
      "::1",
      "fd00::1",
      "fe80::1",
    ]) {
      assert.equal(isPrivateAddress(address), true, address);
    }
    assert.equal(isPrivateAddress("1.1.1.1"), false);
  });

  it("extracts only declared homepage metadata as reviewable findings", () => {
    const html = `
      <html>
        <head>
          <meta property="og:site_name" content="Northstar Workshop">
          <meta name="description" content="Owner-authored description.">
          <script type="application/ld+json">
            {
              "@type": "LocalBusiness",
              "name": "Northstar Workshop",
              "telephone": "+1 555 0100",
              "email": "owner@example.invalid",
              "address": {
                "streetAddress": "10 Example Way",
                "addressLocality": "Portland",
                "addressRegion": "ME"
              }
            }
          </script>
        </head>
      </html>
    `;
    const findings = extractHomepageFindings(
      html,
      new URL("https://northstar.example/")
    );
    assert.ok(findings.some((fact) => fact.factKey === "businessName"));
    assert.ok(findings.some((fact) => fact.factKey === "phone"));
    assert.ok(findings.some((fact) => fact.factKey === "address"));
    assert.ok(findings.every((fact) => fact.confidence <= 1));
    assert.doesNotMatch(JSON.stringify(findings), /price|discount|service/i);
  });
});
