/**
 * Canonical same-origin routes for TapConnect's Host authentication flow.
 *
 * Keep these root-absolute so a protected nested URL can never resolve Clerk's
 * sign-in destination relative to that nested route (for example,
 * `/everencore/sign-in`).
 */
export const AUTH_SIGN_IN_PATH = "/sign-in";
export const AUTH_SIGN_UP_PATH = "/sign-up";
export const AUTH_CONTINUE_PATH = "/auth/continue";

/**
 * Public delivery and authentication-support surfaces. Studio/editor/admin
 * routes are intentionally absent and therefore remain protected by Proxy.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  "/",
  "/pricing(.*)",
  "/offer(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth/(.*)",
  "/__clerk/(.*)",
  "/onboarding(.*)",
  "/t/(.*)",
  "/mytap/(.*)",
  "/scan/(.*)",
  "/api/health(.*)",
  "/api/leads",
  "/api/tap/(.*)",
  "/api/qr(.*)",
  "/api/scan/claim(.*)",
  "/api/integrations/status(.*)",
  "/api/public/(.*)",
  "/api/tapsave/(.*)",
  "/api/mytap/(.*)",
  "/preview/(.*)",
  // Published fan Experiences are anonymous delivery surfaces, not Host UI.
  "/everencore/(.*)",
  // Opaque QR credentials are validated and redeemed server-side.
  "/x/(.*)",
];
