import { walletInstallLinkAllowed } from "./evidence";
import { type WalletPassStatus } from "./lifecycle";
import {
  listWalletCredentialBlockers,
  projectCardToWalletPass,
  type WalletAdapterResult,
  type WalletPlatform,
} from "./types";

export function walletPlatformReady(platform: WalletPlatform): boolean {
  const blockers = listWalletCredentialBlockers();
  return platform === "apple" ? blockers.apple.length === 0 : blockers.google.length === 0;
}

/** Mock adapter — returns preview URL until Apple/Google certs are certified */
export function createWalletInstallLink(input: {
  platform: WalletPlatform;
  businessName: string;
  cardTitle: string;
  tapUrl: string;
  logoUrl?: string;
  featureEnabled?: boolean;
}): WalletAdapterResult {
  if (input.featureEnabled === false) {
    return {
      ok: false,
      code: "feature_off",
      message: "wallet.apple_google feature is disabled",
    };
  }

  const ready = walletPlatformReady(input.platform);
  const projection = projectCardToWalletPass(input);

  if (!ready) {
    return {
      ok: true,
      installUrl: `/dashboard/settings?wallet_mock=${input.platform}&serial=${projection.serialNumber}`,
      mock: true,
    };
  }

  return {
    ok: true,
    installUrl: `/api/wallet/${input.platform}/install?serial=${projection.serialNumber}`,
    mock: false,
  };
}

export function summarizeWalletReadiness(featureEnabled: boolean) {
  const blockers = listWalletCredentialBlockers();
  return {
    featureEnabled,
    appleReady: blockers.apple.length === 0,
    googleReady: blockers.google.length === 0,
    blockers,
  };
}

/** Install link is gated on issued/updated status + feature flag */
export function resolveInstallLinkForPass(input: {
  status: WalletPassStatus;
  platform: WalletPlatform;
  serialNumber: string;
  businessName: string;
  cardTitle: string;
  tapUrl: string;
  featureEnabled: boolean;
  existingInstallUrl?: string | null;
}): WalletAdapterResult & { gated?: boolean } {
  if (!walletInstallLinkAllowed(input.status, input.featureEnabled)) {
    return {
      ok: false,
      code: "credentials_missing",
      message: `Install link unavailable in status ${input.status}`,
      gated: true,
    };
  }

  if (input.existingInstallUrl?.trim()) {
    const blockers = listWalletCredentialBlockers();
    const mock =
      input.platform === "apple" ? blockers.apple.length > 0 : blockers.google.length > 0;
    return { ok: true, installUrl: input.existingInstallUrl, mock, gated: false };
  }

  return createWalletInstallLink({
    platform: input.platform,
    businessName: input.businessName,
    cardTitle: input.cardTitle,
    tapUrl: input.tapUrl,
    featureEnabled: input.featureEnabled,
  });
}
