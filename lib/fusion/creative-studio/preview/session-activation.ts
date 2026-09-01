export type LiveDeviceSessionActivationInput = {
  status: "idle" | "creating" | "ready" | "error";
  token: string | null;
  previewUrl: string | null;
  expiresAt: string | null;
  revision: number;
  sessionRevision: number;
  now?: number;
};

/**
 * A ready signed URL is reusable, but its snapshot is not authoritative after
 * the Studio revision changes (including Undo returning to an earlier draft).
 * Refresh the same governed session before it is presented again so a scanned
 * phone cannot silently retain different visual input.
 */
export function resolveLiveDeviceSessionActivation(input: LiveDeviceSessionActivationInput): "create" | "update" | "reuse" {
  const expiry = input.expiresAt ? Date.parse(input.expiresAt) : Number.POSITIVE_INFINITY;
  const valid = input.status === "ready" && Boolean(input.token && input.previewUrl) && expiry > (input.now ?? Date.now());
  if (!valid) return "create";
  return input.revision !== input.sessionRevision ? "update" : "reuse";
}
