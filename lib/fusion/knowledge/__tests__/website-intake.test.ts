import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractHomepageFindings,
  isPrivateAddress,
  normalizeHomepageUrl,
  WebsiteIntakeError,
} from "@/lib/fusion/knowledge/website-intake";
import {
  socialAndServiceFacts,
  extractHomepageDiscovery,
} from "@/lib/fusion/knowledge/website-discovery";
import { websiteReviewFingerprint } from "@/lib/fusion/knowledge/website-intake";

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
    assert.doesNotMatch(JSON.stringify(findings), /price|discount|\$\d/i);
  });

  it("extracts Suggested brand discovery candidates without inventing prices", () => {
    const html = `
      <html>
        <head>
          <meta property="og:site_name" content="Northstar Workshop">
          <meta name="theme-color" content="#1a5f4a">
          <meta property="og:image" content="https://northstar.example/og.jpg">
          <link rel="icon" href="/favicon.ico">
          <style>:root { --brand: #1a5f4a; } body { font-family: "DM Sans", sans-serif; }</style>
          <script type="application/ld+json">
            {
              "@type": "LocalBusiness",
              "name": "Northstar Workshop",
              "logo": "https://northstar.example/logo.png",
              "sameAs": ["https://instagram.com/northstar.example"],
              "makesOffer": [{ "@type": "Offer", "name": "Prototype workshop" }]
            }
          </script>
        </head>
        <body><img src="/logo.svg" alt="Northstar logo"><a href="https://facebook.com/northstar.example">FB</a></body>
      </html>
    `;
    const bundle = extractHomepageDiscovery(html, new URL("https://northstar.example/"));
    assert.ok(bundle.candidates.some((c) => c.kind === "logo"));
    assert.ok(bundle.candidates.some((c) => c.kind === "color"));
    assert.ok(bundle.candidates.some((c) => c.kind === "social_link"));
    assert.ok(bundle.candidates.some((c) => c.kind === "service" && c.value === "Prototype workshop"));
    assert.doesNotMatch(JSON.stringify(bundle.candidates), /\$\d|free shipping|best in town/i);
  });

  it("keeps social links and services as structured values", () => {
    const structured = socialAndServiceFacts([
      {
        kind: "social_link",
        value: JSON.stringify({
          network: "instagram",
          url: "https://instagram.com/northstar",
        }),
        confidence: 0.9,
        evidence: "declared",
      },
      {
        kind: "service",
        value: "Prototype workshop",
        confidence: 0.8,
        evidence: "declared",
      },
    ]);
    assert.deepEqual(structured.socialLinks, [
      {
        network: "instagram",
        url: "https://instagram.com/northstar",
      },
    ]);
    assert.deepEqual(structured.services, ["Prototype workshop"]);
  });

  it("uses final URL and content hash for stable retry identity", () => {
    const base = {
      requestedUrl: "https://northstar.example/",
      finalUrl: "https://northstar.example/",
      contentHash: "abc",
      findings: [],
      candidates: [],
      fetchedAt: "2026-07-30T00:00:00.000Z",
    };
    assert.equal(websiteReviewFingerprint(base), websiteReviewFingerprint(base));
    assert.notEqual(
      websiteReviewFingerprint(base),
      websiteReviewFingerprint({ ...base, contentHash: "changed" })
    );
  });
});
