/**
 * TikTok readiness + OAuth env gates.
 * Live: VERIFIED — CREDENTIALS REQUIRED.
 */

import {
  TIKTOK_OPTIONAL_ENV,
  TIKTOK_REQUIRED_ENV,
  type TikTokReadiness,
} from "./types";

export function evaluateTikTokReadiness(): TikTokReadiness {
  const missing = TIKTOK_REQUIRED_ENV.filter((k) => !process.env[k]?.trim());
  const liveConfigured = missing.length === 0;
  const hasToken = Boolean(process.env.TIKTOK_ACCESS_TOKEN?.trim());
  return {
    displayStatus: "verified_credentials_required",
    liveConfigured,
    missingEnvVars: missing,
    oauthReady: liveConfigured,
    /** Direct Post stays gated until live OAuth + token verified */
    directPostGated: !liveConfigured || !hasToken,
    note: liveConfigured
      ? "OAuth app env present — Direct Post still gated until access token + browser proof"
      : "Mock posting works without credentials. Live TikTok = VERIFIED — CREDENTIALS REQUIRED.",
  };
}

export function tikTokEnvSnapshot() {
  const readiness = evaluateTikTokReadiness();
  return {
    ...readiness,
    optionalPresent: TIKTOK_OPTIONAL_ENV.filter((k) => Boolean(process.env[k]?.trim())),
    statusLabel: "VERIFIED — CREDENTIALS REQUIRED",
  };
}
