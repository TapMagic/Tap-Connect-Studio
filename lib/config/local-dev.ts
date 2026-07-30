export function isLocalDevAuthEnabled(): boolean {
  if (process.env.TAPCONNECT_DEV_AUTH !== "1") return false;
  try {
    const hostname = new URL(process.env.DATABASE_URL ?? "").hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}
