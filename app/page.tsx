import type { Metadata } from "next";
import { CardCenteredLanding } from "@/components/marketing/card-centered-landing";
import { LANDING_HERO } from "@/lib/marketing/landing-card-centered";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TapConnect — The Card. Studio around it.",
  description:
    "TapConnect is the Card — a living customer relationship hub. TapConnect Studio is the operating system that creates, connects, keeps, operates, and proves that relationship. Capability availability varies by plan.",
  openGraph: {
    title: "TapConnect — The Card. Studio around it.",
    description: LANDING_HERO.subhead,
    url: "/",
    images: [{ url: TAP_CONNECT_LOGO, width: 1200, height: 1200, alt: "TapConnect logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TapConnect — The Card. Studio around it.",
    description: LANDING_HERO.subhead,
    images: [TAP_CONNECT_LOGO],
  },
  alternates: { canonical: "/" },
};

const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "TapConnect",
      description: "TapConnect is the Card. TapConnect Studio works around it.",
      url: "https://tapconnectstudio.com",
      logo: TAP_CONNECT_LOGO,
    },
    {
      "@type": "SoftwareApplication",
      name: "TapConnect Studio",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: LANDING_HERO.subhead,
    },
  ],
};

/**
 * Card-centered public landing — SEO-readable without animation.
 * Studio Assembly enhances; static headings and copy remain indexable.
 */
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSON_LD) }}
      />
      {/* Crawlable summary lives in visible sections below — avoid duplicate H1. */}
      <CardCenteredLanding />
    </>
  );
}
