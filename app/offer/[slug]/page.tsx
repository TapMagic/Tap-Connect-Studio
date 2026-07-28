import { notFound } from "next/navigation";
import { PublishedOfferCard } from "@/components/marketing/published-offer-card";
import { getPublishedOffer } from "@/lib/marketing/offer-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ canceled?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const offer = getPublishedOffer(slug);
  if (!offer) return { title: "Offer not found" };
  return {
    title: `${offer.displayName} — TapConnect offer`,
    description: offer.description,
    robots: { index: true, follow: true },
  };
}

export default async function OfferPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const offer = getPublishedOffer(slug);
  if (!offer) notFound();
  return <PublishedOfferCard offer={offer} canceled={sp.canceled === "1"} />;
}
