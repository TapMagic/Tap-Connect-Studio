/**
 * Owned commercial journey — TapConnect owns story; Stripe owns payment moment.
 * Local/mock only — file-backed sessions survive Next.js route module reloads.
 */

import fs from "node:fs";
import path from "node:path";
import {
  getPublishedOffer,
  type OfferBillingFrequency,
  type PublishedOffer,
} from "@/lib/marketing/offer-catalog";

export type OfferCheckoutMode = "local_mock";

export type OfferCheckoutSession = {
  sessionId: string;
  offerId: string;
  offerSlug: string;
  offerVersion: string;
  billingFrequency: OfferBillingFrequency;
  referralCode: string | null;
  mode: OfferCheckoutMode;
  createdAt: string;
  stripePriceKey: string;
};

type Stored = OfferCheckoutSession & { status: "open" | "completed" | "canceled" };

const STORE_DIR = path.join(process.cwd(), "tmp", "offer-checkout-sessions");

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

function sessionPath(sessionId: string) {
  const safe = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(STORE_DIR, `${safe}.json`);
}

function writeSession(row: Stored) {
  ensureStore();
  fs.writeFileSync(sessionPath(row.sessionId), JSON.stringify(row), "utf8");
}

function readSession(sessionId: string): Stored | null {
  try {
    const raw = fs.readFileSync(sessionPath(sessionId), "utf8");
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

export function createOfferCheckoutSession(input: {
  offerSlug: string;
  billingFrequency?: OfferBillingFrequency;
  referralCode?: string | null;
}): {
  session: OfferCheckoutSession;
  checkoutUrl: string;
  mock: true;
  honesty: string;
} {
  const offer = getPublishedOffer(input.offerSlug);
  if (!offer) {
    throw new Error("unknown_offer");
  }
  const billingFrequency = input.billingFrequency ?? "monthly";
  if (!offer.billingFrequencies.includes(billingFrequency)) {
    throw new Error("invalid_billing_frequency");
  }
  const sessionId = `mock_offer_${offer.id}_${Date.now()}`;
  const session: OfferCheckoutSession = {
    sessionId,
    offerId: offer.id,
    offerSlug: offer.slug,
    offerVersion: offer.version,
    billingFrequency,
    referralCode: input.referralCode ?? null,
    mode: "local_mock",
    createdAt: new Date().toISOString(),
    stripePriceKey: offer.stripePriceKey,
  };
  writeSession({ ...session, status: "open" });
  const params = new URLSearchParams({
    session: sessionId,
    offer: offer.slug,
  });
  return {
    session,
    checkoutUrl: `/offer/checkout/simulate?${params.toString()}`,
    mock: true,
    honesty:
      "Local checkout simulation — no real payment method is charged. Stripe hosts payment only when production-configured later.",
  };
}

export function getOfferCheckoutSession(sessionId: string) {
  return readSession(sessionId);
}

export function completeOfferCheckoutSession(sessionId: string): {
  ok: true;
  session: OfferCheckoutSession;
  offer: PublishedOffer;
} | { ok: false; reason: string } {
  const row = readSession(sessionId);
  if (!row) return { ok: false, reason: "session_not_found" };
  if (row.status === "canceled") return { ok: false, reason: "session_canceled" };
  row.status = "completed";
  writeSession(row);
  const offer = getPublishedOffer(row.offerSlug);
  if (!offer) return { ok: false, reason: "offer_missing" };
  return { ok: true, session: row, offer };
}

export function cancelOfferCheckoutSession(sessionId: string): boolean {
  const row = readSession(sessionId);
  if (!row) return false;
  row.status = "canceled";
  writeSession(row);
  return true;
}

export const OFFER_STRIPE_PRICE_MAP: Record<string, string | null> = {
  "offer.tapconnect.monthly": null,
  "offer.studio.monthly": null,
  "offer.studio_growth.monthly": null,
  "offer.studio_scale.monthly": null,
};

export function resolveStripePriceId(stripePriceKey: string): string | null {
  return OFFER_STRIPE_PRICE_MAP[stripePriceKey] ?? null;
}
