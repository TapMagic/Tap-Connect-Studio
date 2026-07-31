import type { Metadata } from "next";
import { CardCenteredLanding } from "@/components/marketing/card-centered-landing";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";

export const metadata: Metadata = {
  title: "TapConnect — Your business, ready to tap",
  description:
    "TapConnect learns about your business, prepares your Brand, and creates your first living Card—so every tap can become a useful customer relationship.",
  openGraph: {
    title: "TapConnect — Your business, ready to tap",
    description:
      "Tell us about your business. Review the Brand foundation, then Preview your first living Card.",
    url: "/",
    images: [
      {
        url: "/marketing/product/public-card.webp",
        width: 1200,
        height: 750,
        alt: "TapConnect living Card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TapConnect — Your business, ready to tap",
    description:
      "Tell us about your business. Review the Brand foundation, then Preview your first living Card.",
    images: ["/marketing/product/public-card.webp"],
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
      description:
        "The operating system and capabilities surrounding the TapConnect living Card. Availability varies by plan.",
    },
  ],
};

/**
 * Public acquisition experience — the full story remains readable without motion.
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
