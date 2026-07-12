/** Platform Admins — recognized by login email (same Clerk path as everyone else). */
export const PLATFORM_ADMIN_EMAILS = [
  "richsoehner@gmail.com",
  "dannygenerate@gmail.com",
] as const;

export const ADMIN_WORKSPACE_SLUG = "tapconnect-platform-admin";
export const ADMIN_UNLIMITED = 999_999;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  const fromEnv = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);

  return new Set<string>([
    ...PLATFORM_ADMIN_EMAILS.map((e) => normalizeEmail(e)),
    ...fromEnv,
  ]).has(normalized);
}
