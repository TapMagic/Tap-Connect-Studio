/**
 * Wallet pass projection — canonical Card → Apple/Google pass manifest.
 * No raw payment or pass signing secrets in client payloads.
 */

export type WalletPlatform = "apple" | "google";

export type WalletPassProjection = {
  platform: WalletPlatform;
  serialNumber: string;
  organizationName: string;
  description: string;
  logoUrl?: string;
  heroImageUrl?: string;
  primaryFields: WalletField[];
  secondaryFields: WalletField[];
  backFields: WalletField[];
  barcodeMessage: string;
  barcodeFormat: "PKBarcodeFormatQR" | "PKBarcodeFormatPDF417";
  relevantDate?: string;
  webServiceURL?: string;
  authenticationTokenRef?: string;
};

export type WalletField = {
  key: string;
  label: string;
  value: string;
};

export type WalletAdapterResult =
  | { ok: true; installUrl: string; mock: boolean }
  | { ok: false; code: "credentials_missing" | "feature_off"; message: string };

export type WalletCredentialBlockers = {
  apple: string[];
  google: string[];
};

export const WALLET_REQUIRED_ENV: Record<WalletPlatform, string[]> = {
  apple: ["APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_PASS_CERT"],
  google: ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON"],
};

export function listWalletCredentialBlockers(): WalletCredentialBlockers {
  return {
    apple: WALLET_REQUIRED_ENV.apple.filter((k) => !process.env[k]?.trim()),
    google: WALLET_REQUIRED_ENV.google.filter((k) => !process.env[k]?.trim()),
  };
}

export function projectCardToWalletPass(input: {
  platform: WalletPlatform;
  businessName: string;
  cardTitle: string;
  tapUrl: string;
  logoUrl?: string;
}): WalletPassProjection {
  const serial = `tc_${input.platform}_${Date.now()}`;
  return {
    platform: input.platform,
    serialNumber: serial,
    organizationName: input.businessName,
    description: input.cardTitle,
    logoUrl: input.logoUrl,
    primaryFields: [{ key: "title", label: "Card", value: input.cardTitle }],
    secondaryFields: [{ key: "business", label: "From", value: input.businessName }],
    backFields: [{ key: "tap", label: "Tap URL", value: input.tapUrl }],
    barcodeMessage: input.tapUrl,
    barcodeFormat: "PKBarcodeFormatQR",
  };
}
