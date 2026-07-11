import { isMediaUploadReady, isStockImagesReady, isAiReady, isEmailReady } from "@/lib/config/integrations";

export type PlaceholderResponse = {
  ok: false;
  placeholder: true;
  feature: string;
  message: string;
  setup: { envVars: string[]; signupUrl: string };
};

export function notConfiguredResponse(
  feature: string,
  message: string,
  envVars: string[],
  signupUrl: string
): PlaceholderResponse {
  return {
    ok: false,
    placeholder: true,
    feature,
    message,
    setup: { envVars, signupUrl },
  };
}

export async function uploadMediaPlaceholder() {
  if (!isMediaUploadReady()) {
    return notConfiguredResponse(
      "media_upload",
      "File uploads require UploadThing + Cloudflare R2 (both free tiers). Add keys to enable browse and paste.",
      ["UPLOADTHING_TOKEN", "UPLOADTHING_APP_ID", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"],
      "https://uploadthing.com"
    );
  }
  return null;
}

export async function stockSearchPlaceholder() {
  if (!isStockImagesReady()) {
    return notConfiguredResponse(
      "stock_images",
      "Stock image search requires Unsplash and/or Pexels API keys (free).",
      ["UNSPLASH_ACCESS_KEY", "PEXELS_API_KEY"],
      "https://unsplash.com/developers"
    );
  }
  return null;
}

export async function aiGeneratePlaceholder() {
  if (!isAiReady()) {
    return notConfiguredResponse(
      "ai_builder",
      "AI campaign assistance requires an OpenAI API key. Usage is tier-limited when enabled.",
      ["OPENAI_API_KEY"],
      "https://platform.openai.com"
    );
  }
  return null;
}

export async function sendEmailPlaceholder() {
  if (!isEmailReady()) {
    return notConfiguredResponse(
      "branded_email",
      "Branded emails require Resend (free tier: 100 emails/day).",
      ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      "https://resend.com"
    );
  }
  return null;
}
