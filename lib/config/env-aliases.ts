/**
 * Temporary V1 → Fusion environment aliases for cutover compatibility.
 * Resolves fusion canonical names from legacy alternate NAMES when present.
 * Never logs values. Never invents secrets.
 *
 * See docs/fusion/RAILWAY_PRODUCTION_INHERITANCE_MAP.md
 */

/** Fusion canonical name → ordered legacy / alternate names to try. */
export const ENV_ALIASES: Record<string, string[]> = {
  NEXT_PUBLIC_APP_URL: ["APP_URL", "PUBLIC_APP_URL", "SITE_URL", "VERCEL_URL"],
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ["CLERK_PUBLISHABLE_KEY"],
  CLERK_SECRET_KEY: ["CLERK_SECRET", "CLERK_API_KEY"],
  OPENAI_API_KEY: ["OPENAI_KEY"],
  RESEND_API_KEY: ["RESEND_TOKEN", "RESEND_API_TOKEN"],
  RESEND_FROM_EMAIL: ["EMAIL_FROM", "FROM_EMAIL"],
  STRIPE_SECRET_KEY: ["STRIPE_SECRET", "STRIPE_API_KEY"],
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ["STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_STRIPE_KEY"],
  STRIPE_WEBHOOK_SECRET: ["STRIPE_WEBHOOK_SIGNING_SECRET"],
  UPLOADTHING_TOKEN: ["UPLOADTHING_SECRET", "UPLOADTHING_API_KEY"],
  R2_PUBLIC_URL: ["R2_CDN_URL", "CLOUDFLARE_R2_PUBLIC_URL"],
  R2_ACCOUNT_ID: ["CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID"],
  R2_ACCESS_KEY_ID: ["CLOUDFLARE_R2_ACCESS_KEY_ID"],
  R2_SECRET_ACCESS_KEY: ["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
  R2_BUCKET_NAME: ["CLOUDFLARE_R2_BUCKET", "R2_BUCKET"],
  // X / Twitter
  X_API_KEY: ["TWITTER_API_KEY", "X_CLIENT_ID", "TWITTER_CLIENT_ID"],
  X_API_SECRET: ["TWITTER_API_SECRET", "X_CLIENT_SECRET", "TWITTER_CLIENT_SECRET"],
  X_ACCESS_TOKEN: ["TWITTER_ACCESS_TOKEN"],
  X_ACCESS_TOKEN_SECRET: ["TWITTER_ACCESS_TOKEN_SECRET"],
  // Meta messaging
  META_APP_ID: ["FACEBOOK_APP_ID", "FB_APP_ID"],
  META_APP_SECRET: ["FACEBOOK_APP_SECRET", "FB_APP_SECRET"],
  META_PAGE_ACCESS_TOKEN: ["FACEBOOK_PAGE_ACCESS_TOKEN", "FB_PAGE_TOKEN"],
  META_WEBHOOK_VERIFY_TOKEN: ["FACEBOOK_WEBHOOK_VERIFY_TOKEN", "FB_VERIFY_TOKEN"],
  WHATSAPP_ACCESS_TOKEN: ["META_WA_ACCESS_TOKEN", "WA_ACCESS_TOKEN"],
  WHATSAPP_PHONE_NUMBER_ID: ["META_WA_PHONE_NUMBER_ID", "WA_PHONE_NUMBER_ID"],
  // Google unified
  GOOGLE_CLIENT_ID: ["GOOGLE_OAUTH_CLIENT_ID", "YOUTUBE_CLIENT_ID"],
  GOOGLE_CLIENT_SECRET: ["GOOGLE_OAUTH_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET"],
  // Slack
  SLACK_BOT_TOKEN: ["SLACK_TOKEN", "SLACK_API_TOKEN"],
};

/**
 * Read an env var by fusion canonical name, falling back through aliases.
 * Returns undefined when absent — never throws, never logs the value.
 */
export function resolveEnv(canonicalName: string): string | undefined {
  const primary = process.env[canonicalName]?.trim();
  if (primary) return primary;
  for (const alt of ENV_ALIASES[canonicalName] ?? []) {
    const v = process.env[alt]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function envPresent(canonicalName: string): boolean {
  return Boolean(resolveEnv(canonicalName));
}

/** Names-only report for Admin readiness (no values). */
export function listAliasCoverage(canonicalNames: string[]): Array<{
  canonical: string;
  presentVia: "canonical" | "alias" | "missing";
  aliasUsed?: string;
}> {
  return canonicalNames.map((canonical) => {
    if (process.env[canonical]?.trim()) {
      return { canonical, presentVia: "canonical" as const };
    }
    for (const alt of ENV_ALIASES[canonical] ?? []) {
      if (process.env[alt]?.trim()) {
        return { canonical, presentVia: "alias" as const, aliasUsed: alt };
      }
    }
    return { canonical, presentVia: "missing" as const };
  });
}
