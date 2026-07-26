import type { MyTapProjection } from "./contracts";
import { getLatestConsentForContact } from "./consent";
import { findRelationshipByPublicToken } from "./relationships";

/**
 * Privacy-safe MyTap projection — exposes business branding and channel prefs only.
 * Never returns contact email, phone, or name.
 */
export async function getMyTapProjection(publicToken: string): Promise<MyTapProjection | null> {
  const relationship = await findRelationshipByPublicToken(publicToken);
  if (!relationship) return null;

  const [emailConsent, walletConsent, marketingConsent] = await Promise.all([
    getLatestConsentForContact(relationship.contactId, "EMAIL"),
    getLatestConsentForContact(relationship.contactId, "WALLET"),
    getLatestConsentForContact(relationship.contactId, "MARKETING"),
  ]);

  const status =
    relationship.status === "ACTIVE"
      ? "active"
      : relationship.status === "PAUSED"
        ? "paused"
        : "unavailable";

  return {
    relationshipToken: relationship.publicToken,
    businessName: relationship.business.name,
    businessLogoUrl: relationship.business.logoUrl,
    status,
    tapSaveEnabled: relationship.tapSaveEnabled,
    savedAt: relationship.createdAt.toISOString(),
    channels: {
      email: emailConsent?.status === "GRANTED",
      wallet: walletConsent?.status === "GRANTED",
      marketing: marketingConsent?.status === "GRANTED",
    },
    message:
      status === "active"
        ? "This Card is saved. Open it anytime, manage Wallet, or update how you hear from this business."
        : "This saved Card is not currently available.",
  };
}
