/**
 * Guardrails: never migrate or bind fusion work to Railway production / shared V1 DBs.
 */

export type DatabaseSafetyResult =
  | { ok: true; isolated: true }
  | { ok: false; reason: string };

const BLOCKED_HOST_HINTS = [
  "railway.app",
  "rlwy.net",
  "amazonaws.com",
  "neon.tech",
  "supabase.co",
  "render.com",
];

/**
 * Isolated fusion DB must be explicitly named and local (or explicitly allowlisted).
 * Recommended: postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev
 */
export function assertSafeFusionDatabaseUrl(url: string): DatabaseSafetyResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "DATABASE_URL is not a valid URL" };
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return { ok: false, reason: "DATABASE_URL must be postgres/postgresql" };
  }

  const host = (parsed.hostname || "").toLowerCase();
  const dbName = (parsed.pathname || "").replace(/^\//, "").toLowerCase();
  const allowRemote =
    process.env.FUSION_ALLOW_REMOTE_DEV_DB === "true" &&
    process.env.FUSION_CONFIRM_ISOLATED_DEV_DB === "tapconnect_fusion_dev";

  const looksBlockedHost = BLOCKED_HOST_HINTS.some((h) => host.includes(h));
  if (looksBlockedHost && !allowRemote) {
    return {
      ok: false,
      reason:
        "DATABASE_URL points at a hosted provider (e.g. Railway). Fusion must use an isolated local/dev database named tapconnect_fusion_dev. See docs/fusion/LOCAL_DEV_DATABASE.md",
    };
  }

  const isLocal =
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    host === "host.docker.internal";

  if (!isLocal && !allowRemote) {
    return {
      ok: false,
      reason:
        "DATABASE_URL host is not local. Only 127.0.0.1/localhost (or explicitly confirmed isolated remote) is allowed for fusion migrations.",
    };
  }

  if (!dbName.includes("fusion") || !dbName.includes("dev")) {
    return {
      ok: false,
      reason:
        `Database name "${dbName || "(empty)"}" is not an isolated fusion dev DB. Required name pattern: tapconnect_fusion_dev`,
    };
  }

  if (dbName === "postgres" || dbName === "railway" || dbName === "tapconnect") {
    return {
      ok: false,
      reason: `Refusing shared/generic database name "${dbName}"`,
    };
  }

  return { ok: true, isolated: true };
}

export function isIsolatedFusionDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  return assertSafeFusionDatabaseUrl(url).ok;
}
