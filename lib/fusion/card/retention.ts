/**
 * Customer retention — conversion-first recommendation, Wallet honesty, Home Screen guide.
 * No provider jargon in customer-facing labels.
 */

import type { WalletPassStatus } from "@/lib/fusion/wallet/lifecycle";

export type RetentionMethodId =
  | "apple_wallet"
  | "homescreen"
  | "save_contact"
  | "email_card"
  | "copy_link"
  | "show_qr";

export type WalletCustomerState =
  | "available"
  | "preview_only"
  | "installed"
  | "update_available"
  | "expired"
  | "revoked"
  | "requires_setup"
  | "unsupported_device";

export type RetentionWalletMode = "live" | "preview" | "unavailable";

export type RetentionDeviceHint = "ios" | "android" | "desktop" | "unknown";

export const RETENTION_EVENTS = {
  ctaViewed: "retention_cta_viewed",
  chooserOpened: "retention_chooser_opened",
  intentRecorded: "retention_intent_recorded",
  methodSelected: "retention_method_selected",
  walletPreviewRequested: "wallet_preview_requested",
  walletLiveInstallRequested: "wallet_live_install_requested",
  homescreenGuideShown: "homescreen_guide_shown",
  homescreenCompleted: "homescreen_completed",
  homescreenDeferred: "homescreen_deferred",
  retentionSuccess: "retention_success",
  retentionFailure: "retention_failure",
  cardReopened: "card_reopened_from_retained",
  manageOpened: "manage_card_opened",
} as const;

export type RetentionMethod = {
  id: RetentionMethodId;
  label: string;
  description: string;
  badge?: string;
  needsIdentity: boolean;
  /** Demo / credentials — never imply live OS install */
  demoOnly?: boolean;
};

export type RetentionPlan = {
  primary: RetentionMethod;
  secondary: RetentionMethod[];
  more: RetentionMethod[];
  rationale: string;
};

export function detectRetentionDevice(userAgent: string): RetentionDeviceHint {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/macintosh|windows|linux/.test(ua) && !/mobile/.test(ua)) return "desktop";
  return "unknown";
}

function methodDefs(input: {
  device: RetentionDeviceHint;
  walletMode: RetentionWalletMode;
  walletFeatureOn: boolean;
}): Record<RetentionMethodId, RetentionMethod | null> {
  const liveWallet = input.walletFeatureOn && input.walletMode === "live";
  const previewWallet = input.walletFeatureOn && input.walletMode === "preview";

  return {
    apple_wallet: liveWallet
      ? {
          id: "apple_wallet",
          label: "Add to Apple Wallet",
          description: "One-tap reopen from your lock screen.",
          needsIdentity: true,
        }
      : previewWallet
        ? {
            id: "apple_wallet",
            label: "Preview Apple Wallet pass",
            description: "Demo only — not a live Apple install.",
            badge: "Demo",
            needsIdentity: true,
            demoOnly: true,
          }
        : null,
    homescreen: {
      id: "homescreen",
      label: "Add to Home Screen",
      description: "A shortcut back to this living Card.",
      needsIdentity: false,
    },
    save_contact: {
      id: "save_contact",
      label: "Save Contact",
      description: "Keep a Contact with your Living Card link.",
      needsIdentity: false,
    },
    email_card: {
      id: "email_card",
      label: "Email me this Card",
      description: "Get a private link so you can reopen later.",
      needsIdentity: true,
    },
    copy_link: {
      id: "copy_link",
      label: "Copy link",
      description: "Share or paste your permanent Card link.",
      needsIdentity: false,
    },
    show_qr: {
      id: "show_qr",
      label: "Show QR for phone",
      description: "Scan with your phone to Keep on mobile.",
      needsIdentity: false,
    },
  };
}

/**
 * One recommended primary + concise secondary + More options.
 * Demo Wallet is never the primary when live Wallet is unavailable.
 */
export function planRetentionMethods(input: {
  device: RetentionDeviceHint;
  walletMode: RetentionWalletMode;
  walletFeatureOn: boolean;
  alreadyRetained?: boolean;
  hasWalletPass?: boolean;
}): RetentionPlan {
  const defs = methodDefs(input);
  const liveIos = input.device === "ios" && input.walletMode === "live" && input.walletFeatureOn;

  let primary: RetentionMethod;
  let secondaryIds: RetentionMethodId[];
  let moreIds: RetentionMethodId[];
  let rationale: string;

  if (liveIos && !input.hasWalletPass) {
    primary = defs.apple_wallet!;
    secondaryIds = ["homescreen", "save_contact"];
    moreIds = ["email_card", "copy_link", "show_qr"];
    rationale = "Apple Wallet is ready on this iPhone.";
  } else if (input.device === "ios" || input.device === "android") {
    primary = defs.homescreen!;
    secondaryIds = ["save_contact"];
    moreIds = ["email_card", "copy_link", "show_qr"];
    if (defs.apple_wallet?.demoOnly) {
      moreIds = ["apple_wallet", ...moreIds];
    } else if (defs.apple_wallet && input.device !== "ios") {
      moreIds = ["apple_wallet", ...moreIds];
    }
    rationale =
      input.device === "ios"
        ? "Home Screen is the fastest keep on this iPhone."
        : "Home Screen keeps this Card one tap away.";
  } else {
    // desktop / unknown
    primary = defs.email_card!;
    secondaryIds = ["show_qr", "save_contact", "copy_link"];
    moreIds = ["homescreen"];
    if (defs.apple_wallet?.demoOnly) moreIds.push("apple_wallet");
    else if (defs.apple_wallet) moreIds.push("apple_wallet");
    rationale = "Email or QR gets this Card onto your phone.";
  }

  if (input.alreadyRetained && input.hasWalletPass) {
    primary = defs.homescreen!;
    secondaryIds = ["save_contact", "copy_link"];
    moreIds = ["email_card", "show_qr"];
    if (defs.apple_wallet) moreIds.unshift("apple_wallet");
    rationale = "Your Card is already saved — pick another keep method.";
  }

  const pick = (id: RetentionMethodId) => defs[id];
  const secondary = secondaryIds.map(pick).filter(Boolean) as RetentionMethod[];
  const more = moreIds.map(pick).filter(Boolean) as RetentionMethod[];

  return { primary, secondary, more, rationale };
}

/** Flat list — tests and callers that need every method. */
export function orderRetentionMethods(input: {
  device: RetentionDeviceHint;
  walletMode: RetentionWalletMode;
  walletFeatureOn: boolean;
}): RetentionMethod[] {
  const plan = planRetentionMethods(input);
  return [plan.primary, ...plan.secondary, ...plan.more];
}

export function homescreenInstructions(device: RetentionDeviceHint): {
  title: string;
  steps: string[];
  note: string;
} {
  if (device === "ios") {
    return {
      title: "Add to Home Screen",
      steps: ["Tap Share", "Scroll and tap Add to Home Screen", "Tap Add"],
      note: "We can’t finish this for you — your phone confirms the shortcut.",
    };
  }
  if (device === "android") {
    return {
      title: "Add to Home Screen",
      steps: ["Open the browser menu", "Tap Install app or Add to Home screen", "Confirm"],
      note: "We’ll wait until you finish on your phone.",
    };
  }
  return {
    title: "Add to Home Screen",
    steps: ["Open this Card on your phone", "Use the browser menu to add a Home Screen shortcut"],
    note: "Home Screen shortcuts work best on a phone browser.",
  };
}

export type RetentionSetupSnapshot = {
  businessId: string;
  cardUrl: string;
  campaignId?: string;
  deviceSlotId?: string;
  method?: RetentionMethodId;
  homescreenPending?: boolean;
  preparedAt: string;
};

export function retentionSetupStorageKey(businessId: string): string {
  return `tc_retention_setup_${businessId}`;
}

export function walletCustomerState(input: {
  providerStatus?: WalletPassStatus | null;
  mock: boolean;
  liveReady: boolean;
  device: RetentionDeviceHint;
  hasPass: boolean;
}): WalletCustomerState {
  if (!input.liveReady && !input.hasPass) {
    if (input.device !== "ios" && input.device !== "unknown") return "unsupported_device";
    return input.mock ? "preview_only" : "requires_setup";
  }
  if (!input.hasPass) {
    if (input.device === "android") return "unsupported_device";
    return input.liveReady ? "available" : "requires_setup";
  }

  switch (input.providerStatus) {
    case "ISSUED":
      return input.mock ? "preview_only" : "installed";
    case "UPDATED":
      return input.mock ? "preview_only" : "update_available";
    case "EXPIRED":
      return "expired";
    case "REVOKED":
    case "REPLACED":
      return "revoked";
    case "PREVIEWED":
    case "DRAFT":
      return "preview_only";
    default:
      return input.mock ? "preview_only" : "available";
  }
}

export const WALLET_CUSTOMER_STATE_LABEL: Record<WalletCustomerState, string> = {
  available: "Available",
  preview_only: "Preview only",
  installed: "Installed",
  update_available: "Update available",
  expired: "Expired",
  revoked: "Revoked",
  requires_setup: "Requires setup",
  unsupported_device: "Unsupported device",
};

export function walletCustomerStateDescription(state: WalletCustomerState): string {
  switch (state) {
    case "available":
      return "You can add this Card to Apple Wallet.";
    case "preview_only":
      return "This is a demo preview — not a live Apple Wallet pass.";
    case "installed":
      return "This Card is in your Wallet.";
    case "update_available":
      return "An updated Wallet pass is ready.";
    case "expired":
      return "This Wallet pass has expired.";
    case "revoked":
      return "This Wallet pass is no longer active.";
    case "requires_setup":
      return "Apple Wallet isn’t set up for this business yet.";
    case "unsupported_device":
      return "Apple Wallet isn’t available on this device. Try another save method.";
  }
}

export function walletActionLabel(input: {
  state: WalletCustomerState;
  mock: boolean;
  hasPass: boolean;
}): string {
  if (!input.hasPass) {
    if (input.state === "preview_only" || input.mock) return "Preview Wallet pass";
    if (input.state === "available") return "Add to Apple Wallet";
    if (input.state === "requires_setup") return "Preview Wallet pass";
    return "Wallet options";
  }
  if (input.mock || input.state === "preview_only") return "Manage preview";
  if (input.state === "update_available") return "Update pass";
  return "Manage pass";
}

/** Benefit-led updates disclosure — single purpose, plain language. */
export const RETENTION_UPDATES_COPY = {
  label: "Keep this Card and send me useful updates",
  detail: "Offers, rewards, appointments, and important Card changes. Unsubscribe anytime.",
} as const;
