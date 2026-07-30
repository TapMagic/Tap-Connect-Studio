import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BusinessCapabilityError,
  requireBusinessCapability,
} from "@/lib/fusion/authz/business-capability";
import {
  persistWebsiteDiscovery,
} from "@/lib/fusion/knowledge/apply-website-candidates";
import {
  intakeHomepage,
  WebsiteIntakeError,
} from "@/lib/fusion/knowledge/website-intake";

export const runtime = "nodejs";

const schema = z.object({
  website: z.string().trim().min(1).max(500),
});

const fixtureHomepage = `
  <!doctype html>
  <html>
    <head>
      <meta property="og:site_name" content="Northstar Workshop">
      <meta name="description" content="A fictional local workshop used for isolated TapConnect testing.">
      <meta name="theme-color" content="#1a5f4a">
      <meta property="og:image" content="https://northstar.example/og.jpg">
      <link rel="icon" href="/favicon.ico">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">
      <link rel="stylesheet" href="/styles.css">
      <style>
        :root { --brand: #1a5f4a; --accent: #f0c75e; }
        body { font-family: "DM Sans", sans-serif; color: #0b0f19; background: #f7faf8; }
      </style>
      <script type="application/ld+json">
        {
          "@type": "LocalBusiness",
          "name": "Northstar Workshop",
          "telephone": "+1 555 010 2040",
          "email": "hello@northstar.example",
          "logo": "https://northstar.example/logo.png",
          "sameAs": ["https://instagram.com/northstar.example", "https://facebook.com/northstar.example"],
          "makesOffer": [{ "@type": "Offer", "name": "Prototype workshop" }],
          "address": {
            "addressLocality": "Portland",
            "addressRegion": "ME"
          }
        }
      </script>
    </head>
    <body>
      <img src="/brand-logo.svg" alt="Northstar Workshop logo">
      <a href="https://instagram.com/northstar.example">Instagram</a>
    </body>
  </html>
`;

const fixtureCss = `
  :root { --brand-primary: #1a5f4a; --brand-accent: #f0c75e; }
  h1 { font-family: "Playfair Display", serif; color: #1a5f4a; }
`;

const globalRateState = globalThis as typeof globalThis & {
  __onboardingWebsiteRate?: Map<string, number[]>;
};

function consumeRateLimit(businessId: string): boolean {
  const store =
    globalRateState.__onboardingWebsiteRate ??
    (globalRateState.__onboardingWebsiteRate = new Map<string, number[]>());
  const cutoff = Date.now() - 60_000;
  const recent = (store.get(businessId) || []).filter((time) => time > cutoff);
  if (recent.length >= 5) return false;
  recent.push(Date.now());
  store.set(businessId, recent);
  return true;
}

export async function POST(request: Request) {
  let businessId: string | null = null;
  let requestedWebsite = "";
  try {
    const { business, user } = await requireBusinessCapability("knowledge.propose");
    businessId = business.id;
    if (!consumeRateLimit(business.id)) {
      return NextResponse.json(
        {
          error: "Website review is temporarily limited.",
          recovery: "Wait a minute or continue with manual entry.",
        },
        { status: 429 }
      );
    }
    const body = schema.parse(await request.json());
    requestedWebsite = body.website;
    const fixtureMode =
      process.env.NODE_ENV !== "production" &&
      process.env.CREATIVE_PROVIDER_MODE?.trim().toLowerCase() === "fixture";
    const result = await intakeHomepage(
      body.website,
      fixtureMode
        ? {
            fetchHtml: async (url) => ({ finalUrl: url, html: fixtureHomepage }),
            fetchCssText: async () => fixtureCss,
          }
        : {}
    );

    const saved = await persistWebsiteDiscovery({
      businessId: business.id,
      actorId: user.id,
      result,
    });

    return NextResponse.json({
      source: saved.source,
      facts: saved.facts,
      candidates: result.candidates,
      brandProposals: saved.brandProposals,
      idempotent: saved.idempotent,
      status: "Suggested",
      notice:
        "Review and approve each website finding and Brand suggestion before TapConnect uses it.",
    });
  } catch (error) {
    if (businessId && requestedWebsite && error instanceof WebsiteIntakeError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          recovery: "Continue with manual entry or correct the website and try again.",
        },
        { status: 422 }
      );
    }
    if (error instanceof BusinessCapabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter a valid website or domain.", detail: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Website intake error:", error);
    return NextResponse.json(
      {
        error: "The homepage could not be reviewed.",
        recovery: "Continue with manual entry and try the website again later.",
      },
      { status: 500 }
    );
  }
}
