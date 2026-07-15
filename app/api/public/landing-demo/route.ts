import { NextResponse } from "next/server";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { defaultTapConnectCard, parseTapConnectCard } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public: published Tap Connect Card for the marketing landing live demo. */
export async function GET() {
  try {
    const demo = await prisma.campaign.findFirst({
      where: { isLandingDemo: true, status: { in: ["LIVE", "READY", "SCHEDULED"] } },
      include: {
        business: {
          include: { brandKit: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!demo?.business) {
      return NextResponse.json({ published: false });
    }

    const business = demo.business;
    const brandKit = business.brandKit;
    const profile = parseBrandContactProfile(brandKit?.socialLinks);
    const merged = {
      ...profile,
      phone: profile.phone || business.phone || undefined,
      email: profile.email || business.email || undefined,
      website: profile.website || business.website || undefined,
    };

    const tapCard = parseTapConnectCard(brandKit?.tapCard, {
      businessName: business.name,
      profile: merged,
      logoUrl: business.logoUrl,
      accentColor: brandKit?.accentColor || "#d4af37",
      reviewUrl: business.googleReviewUrl,
    });

    return NextResponse.json({
      published: true,
      businessName: business.name,
      logoUrl: business.logoUrl,
      reviewUrl: business.googleReviewUrl,
      profile: merged,
      tapCard,
      theme: {
        primaryColor: brandKit?.primaryColor ?? "#a3e635",
        secondaryColor: brandKit?.secondaryColor ?? "#22d3ee",
        backgroundColor: brandKit?.backgroundColor ?? "#0b0f19",
        textColor: brandKit?.textColor ?? "#f8fafc",
        accentColor: brandKit?.accentColor ?? "#d4af37",
      },
      campaignTitle: demo.title,
      contentBlocks: demo.contentBlocks,
    });
  } catch (error) {
    console.error("landing-demo get", error);
    // Fallback static demo shape when DB unavailable
    const tapCard = defaultTapConnectCard({
      businessName: "Demo Studio",
      profile: {
        displayName: "Alex Rivera",
        jobTitle: "Owner · Demo Studio",
        organization: "Demo Studio",
        phone: "+1 (555) 123-4567",
        email: "alex@demo.studio",
        website: "https://tapthemagic.com",
        address: "Orlando, FL",
        socials: {
          instagram: "https://instagram.com/",
          facebook: "https://facebook.com/",
        },
      },
      accentColor: "#d4af37",
    });
    return NextResponse.json({ published: false, tapCard, fallback: true });
  }
}
