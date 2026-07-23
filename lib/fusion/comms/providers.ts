/**
 * Messaging provider registry — readiness without storing secrets.
 */

export type MessagingProviderId =
  | "messenger"
  | "instagram_dm"
  | "whatsapp"
  | "telegram"
  | "manychat";

export type MessagingProviderDefinition = {
  id: MessagingProviderId;
  name: string;
  metaFamily: boolean;
  requiredEnvVars: string[];
  webhookRequired: boolean;
  certificationNotes: string;
};

export const MESSAGING_PROVIDERS: MessagingProviderDefinition[] = [
  {
    id: "messenger",
    name: "Facebook Messenger",
    metaFamily: true,
    requiredEnvVars: ["META_APP_ID", "META_APP_SECRET", "META_PAGE_ACCESS_TOKEN"],
    webhookRequired: true,
    certificationNotes: "Meta app review + Page subscription",
  },
  {
    id: "instagram_dm",
    name: "Instagram Direct",
    metaFamily: true,
    requiredEnvVars: ["META_APP_ID", "META_APP_SECRET", "META_IG_BUSINESS_ACCOUNT_ID"],
    webhookRequired: true,
    certificationNotes: "Instagram messaging permissions via Meta",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    metaFamily: true,
    requiredEnvVars: ["META_APP_ID", "META_APP_SECRET", "WHATSAPP_PHONE_NUMBER_ID"],
    webhookRequired: true,
    certificationNotes: "WhatsApp Cloud API + template approval",
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    metaFamily: false,
    requiredEnvVars: ["TELEGRAM_BOT_TOKEN"],
    webhookRequired: true,
    certificationNotes: "BotFather token + webhook URL",
  },
  {
    id: "manychat",
    name: "ManyChat (managed adapter)",
    metaFamily: false,
    requiredEnvVars: ["MANYCHAT_API_KEY"],
    webhookRequired: false,
    certificationNotes: "Managed adapter — TapConnect forwards via ManyChat API",
  },
];

function envReady(keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

export function messagingProviderReady(id: MessagingProviderId): boolean {
  const def = MESSAGING_PROVIDERS.find((p) => p.id === id);
  if (!def) return false;
  return envReady(def.requiredEnvVars);
}

export function listMessagingReadiness() {
  return MESSAGING_PROVIDERS.map((p) => ({
    ...p,
    ready: messagingProviderReady(p.id),
    missingEnvVars: p.requiredEnvVars.filter((k) => !process.env[k]?.trim()),
  }));
}

export function metaFamilyReady(): boolean {
  return messagingProviderReady("messenger") || messagingProviderReady("whatsapp");
}
