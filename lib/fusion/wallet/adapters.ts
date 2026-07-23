/**
 * Wallet pass projection — Card remains source of truth. No exposed secrets.
 * Mock adapter issues without provider certs (mock: true).
 */

export type WalletProvider = "apple" | "google";

export type WalletPassProjection = {
  cardId: string;
  businessId: string;
  provider: WalletProvider;
  serial: string;
  version: number;
  branding: {
    logoUrl?: string;
    foregroundColor?: string;
    backgroundColor?: string;
    labelColor?: string;
  };
  fields: Array<{ key: string; label: string; value: string }>;
  barcode?: { format: "qr" | "pdf417" | "aztec"; payload: string };
  deepLinkUrl: string;
  /** Signing refs only — never embed private keys */
  signingRef?: string;
  status: "draft" | "issued" | "updated" | "revoked" | "expired";
};

export type WalletAdapter = {
  provider: WalletProvider;
  ready(): boolean;
  missingEnv(): string[];
  /** Always succeeds on mock path — credentials only required for non-mock production */
  preview(pass: WalletPassProjection): Promise<{ ok: true; previewUrl: string; mock: boolean }>;
  issue(pass: WalletPassProjection): Promise<{ ok: true; externalId: string; mock: boolean }>;
};

export function createMockWalletAdapter(provider: WalletProvider): WalletAdapter {
  const required =
    provider === "apple"
      ? ["APPLE_TEAM_ID", "APPLE_PASS_TYPE_ID", "APPLE_PASS_CERT"]
      : ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON"];

  return {
    provider,
    ready() {
      return required.every((k) => Boolean(process.env[k]?.trim()));
    },
    missingEnv() {
      return required.filter((k) => !process.env[k]?.trim());
    },
    async preview(pass) {
      const mock = !this.ready();
      return {
        ok: true,
        previewUrl: `/dashboard/audience/wallet?preview=${provider}&serial=${pass.serial}`,
        mock,
      };
    },
    async issue(pass) {
      const mock = !this.ready();
      return {
        ok: true,
        externalId: mock
          ? `mock_${provider}_${pass.serial}_v${pass.version}`
          : `${provider}_${pass.serial}_v${pass.version}`,
        mock,
      };
    },
  };
}
