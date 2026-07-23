/**
 * TapSave Moments — relationship retention events (contract + labels).
 */

export type TapSaveMomentKind =
  | "first_save"
  | "return_visit"
  | "offer_unlock"
  | "wallet_install"
  | "preference_update"
  | "loyalty_milestone";

export type TapSaveMoment = {
  id: string;
  businessId: string;
  relationshipId?: string;
  visitorRef: string;
  kind: TapSaveMomentKind;
  occurredAt: string;
  campaignId?: string;
  deviceSlotId?: string;
  metadata?: Record<string, unknown>;
};

export type TapSavePreference = {
  emailOptIn: boolean;
  smsOptIn: boolean;
  walletOptIn: boolean;
  frequency: "immediate" | "weekly" | "monthly" | "off";
};

export const TAPSAVE_MOMENT_LABELS: Record<TapSaveMomentKind, string> = {
  first_save: "First save",
  return_visit: "Return visit",
  offer_unlock: "Offer unlocked",
  wallet_install: "Wallet install",
  preference_update: "Preferences updated",
  loyalty_milestone: "Loyalty milestone",
};

export function createMoment(
  input: Omit<TapSaveMoment, "id" | "occurredAt"> & { id?: string }
): TapSaveMoment {
  return {
    id: input.id ?? `tsm_${Date.now()}`,
    occurredAt: new Date().toISOString(),
    ...input,
  };
}

export function defaultTapSavePreferences(): TapSavePreference {
  return {
    emailOptIn: true,
    smsOptIn: false,
    walletOptIn: false,
    frequency: "weekly",
  };
}

export function parseTapSavePreferences(raw: unknown): TapSavePreference {
  const defaults = defaultTapSavePreferences();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const obj = raw as Record<string, unknown>;
  const frequency =
    obj.frequency === "immediate" ||
    obj.frequency === "weekly" ||
    obj.frequency === "monthly" ||
    obj.frequency === "off"
      ? obj.frequency
      : defaults.frequency;
  return {
    emailOptIn: typeof obj.emailOptIn === "boolean" ? obj.emailOptIn : defaults.emailOptIn,
    smsOptIn: typeof obj.smsOptIn === "boolean" ? obj.smsOptIn : defaults.smsOptIn,
    walletOptIn: typeof obj.walletOptIn === "boolean" ? obj.walletOptIn : defaults.walletOptIn,
    frequency,
  };
}
