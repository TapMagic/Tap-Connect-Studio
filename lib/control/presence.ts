export type PresenceState =
  | "Online"
  | "Recently active"
  | "Signed in but idle"
  | "Offline";

export function resolvePresenceState(input: {
  now?: Date;
  lastHeartbeatAt?: Date | string | null;
  lastMeaningfulActivityAt?: Date | string | null;
  authenticatedSessionActive: boolean;
}): PresenceState {
  const now = (input.now ?? new Date()).getTime();
  const heartbeat = input.lastHeartbeatAt
    ? new Date(input.lastHeartbeatAt).getTime()
    : 0;
  const activity = input.lastMeaningfulActivityAt
    ? new Date(input.lastMeaningfulActivityAt).getTime()
    : 0;
  if (heartbeat && now - heartbeat <= 90_000) return "Online";
  if (Math.max(heartbeat, activity) && now - Math.max(heartbeat, activity) <= 15 * 60_000) {
    return "Recently active";
  }
  if (input.authenticatedSessionActive) return "Signed in but idle";
  return "Offline";
}

export const HEARTBEAT_TTL_MS = 2 * 60_000;
export const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

