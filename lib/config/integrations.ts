/**
 * Feature flags — enabled only when env vars are set.
 * Keeps the app at $0 until accounts are configured.
 */

export type IntegrationId =
  | "clerk"
  | "uploadthing"
  | "r2"
  | "unsplash"
  | "pexels"
  | "logo_dev"
  | "brave_search"
  | "openai"
  | "resend"
  | "stripe"
  | "getresponse";

export interface IntegrationStatus {
  id: IntegrationId;
  name: string;
  configured: boolean;
  description: string;
  envVars: string[];
  signupUrl: string;
  costNote: string;
}

function has(...keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

export const integrations: IntegrationStatus[] = [
  {
    id: "clerk",
    name: "Clerk Auth",
    configured: has("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"),
    description: "User login, roles, and secure dashboard access.",
    envVars: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
    signupUrl: "https://dashboard.clerk.com",
    costNote: "Free tier available",
  },
  {
    id: "uploadthing",
    name: "UploadThing",
    configured: has("UPLOADTHING_TOKEN"),
    description: "Browse, paste, and drag-drop file uploads in the builder.",
    envVars: ["UPLOADTHING_TOKEN"],
    signupUrl: "https://uploadthing.com",
    costNote: "Free hobby tier — TOKEN is enough; APP_ID optional",
  },
  {
    id: "r2",
    name: "Cloudflare R2",
    configured: has("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"),
    description: "Low-cost storage for images, logos, and PDFs.",
    envVars: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"],
    signupUrl: "https://dash.cloudflare.com",
    costNote: "Free ~10GB/month — no egress fees",
  },
  {
    id: "unsplash",
    name: "Unsplash Stock Images",
    configured: has("UNSPLASH_ACCESS_KEY"),
    description: "Free stock photos in the media picker.",
    envVars: ["UNSPLASH_ACCESS_KEY"],
    signupUrl: "https://unsplash.com/developers",
    costNote: "Free API within rate limits",
  },
  {
    id: "pexels",
    name: "Pexels Stock Images",
    configured: has("PEXELS_API_KEY"),
    description: "Free stock photos and some video stills.",
    envVars: ["PEXELS_API_KEY"],
    signupUrl: "https://www.pexels.com/api",
    costNote: "Free API within rate limits",
  },
  {
    id: "logo_dev",
    name: "Logo.dev (optional)",
    configured: has("LOGO_DEV_TOKEN"),
    description: "Higher-quality brand logos in web logo search (Wikimedia + favicons work without this).",
    envVars: ["LOGO_DEV_TOKEN"],
    signupUrl: "https://logo.dev",
    costNote: "Free tier available",
  },
  {
    id: "brave_search",
    name: "Brave Image Search (optional)",
    configured: has("BRAVE_SEARCH_API_KEY"),
    description: "Extra web logo/icon results in the media picker.",
    envVars: ["BRAVE_SEARCH_API_KEY"],
    signupUrl: "https://brave.com/search/api",
    costNote: "Free tier available",
  },
  {
    id: "openai",
    name: "OpenAI (AI Builder)",
    configured: has("OPENAI_API_KEY"),
    description: "AI campaign copy, template suggestions, and rewrites.",
    envVars: ["OPENAI_API_KEY"],
    signupUrl: "https://platform.openai.com",
    costNote: "Pay per use — tier-gated in app",
  },
  {
    id: "resend",
    name: "Resend Email",
    configured: has("RESEND_API_KEY"),
    description: "Branded auto-reply and lead thank-you emails.",
    envVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    signupUrl: "https://resend.com",
    costNote: "Free tier — 100 emails/day",
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    configured: has("STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    description: "Subscriptions and plan limits.",
    envVars: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
    signupUrl: "https://dashboard.stripe.com",
    costNote: "No monthly fee — per transaction only",
  },
  {
    id: "getresponse",
    name: "GetResponse",
    configured: has("GETRESPONSE_API_KEY"),
    description: "Email marketing campaigns (future CRM add-on).",
    envVars: ["GETRESPONSE_API_KEY"],
    signupUrl: "https://www.getresponse.com",
    costNote: "Paid — future add-on only",
  },
];

export function getIntegration(id: IntegrationId): IntegrationStatus {
  return integrations.find((i) => i.id === id)!;
}

export function isMediaUploadReady(): boolean {
  // R2 alone is enough for server-side uploads; UploadThing is optional UX helper.
  return getIntegration("r2").configured && Boolean(process.env.R2_PUBLIC_URL?.trim());
}

export function isStockImagesReady(): boolean {
  return getIntegration("unsplash").configured || getIntegration("pexels").configured;
}

/** Web logo search works out of the box (Wikimedia + favicons); optional keys improve results. */
export function isLogoWebSearchEnhanced(): boolean {
  return getIntegration("logo_dev").configured || getIntegration("brave_search").configured;
}

export function isAiReady(): boolean {
  return getIntegration("openai").configured;
}

export function isEmailReady(): boolean {
  return getIntegration("resend").configured;
}

export function getConfiguredCount(): number {
  return integrations.filter((i) => i.configured).length;
}

export function getPendingIntegrations(): IntegrationStatus[] {
  return integrations.filter((i) => !i.configured);
}

/** Features that work without paid integrations */
export const nativeFeatures = {
  qrCodes: true,
  urlMedia: true,
  logoWebSearch: true,
  youtubeEmbed: true,
  campaignEdit: true,
  schedulingUi: true, // UI placeholder until rules engine wired
  templatePreview: true,
} as const;
