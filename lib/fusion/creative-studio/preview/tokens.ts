/**
 * Secure temporary draft-preview sessions for Live Device QR.
 * Tokens are unguessable HMAC-signed; raw secrets never stored in URLs beyond the token.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type PreviewFollowMode = "follow" | "freeze";

export type PreviewSessionPayload = {
  sid: string;
  businessId: string;
  brandKitId: string;
  cardName: string;
  revision: number;
  exp: number;
  /** ISO created */
  createdAt: string;
  /** follow = phone sees latest saved draft; freeze = locked snapshot */
  mode: PreviewFollowMode;
};

export type PreviewSessionRecord = PreviewSessionPayload & {
  tokenHash: string;
  revoked: boolean;
  /** Serialized TapConnectCardConfig + profile snapshot */
  snapshotJson: string;
  profileJson: string;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  updatedAt: string;
  lastSaveTime?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __tcPreviewSessions?: Map<string, PreviewSessionRecord>;
};

function store(): Map<string, PreviewSessionRecord> {
  if (!globalStore.__tcPreviewSessions) {
    globalStore.__tcPreviewSessions = new Map();
  }
  return globalStore.__tcPreviewSessions;
}

function secret(): string {
  return (
    process.env.PREVIEW_TOKEN_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "local-dev-preview-secret-change-me"
  );
}

export function previewTtlMinutes(): number {
  const n = Number(process.env.PREVIEW_TOKEN_TTL_MINUTES || "60");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 24 * 60) : 60;
}

function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function createPreviewToken(payload: PreviewSessionPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyPreviewToken(
  token: string
): { ok: true; payload: PreviewSessionPayload } | { ok: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "preview_token_malformed" };
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "preview_token_invalid" };
    }
  } catch {
    return { ok: false, reason: "preview_token_invalid" };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as PreviewSessionPayload;
    if (!payload?.sid || !payload.businessId || !payload.exp) {
      return { ok: false, reason: "preview_token_malformed" };
    }
    if (Date.now() > payload.exp) {
      return { ok: false, reason: "preview_expired" };
    }
    return {
      ok: true,
      payload: {
        ...payload,
        mode: payload.mode === "freeze" ? "freeze" : "follow",
      },
    };
  } catch {
    return { ok: false, reason: "preview_token_malformed" };
  }
}

export function createPreviewSession(input: {
  businessId: string;
  brandKitId: string;
  cardName: string;
  businessName: string;
  snapshotJson: string;
  profileJson: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  revision?: number;
  mode?: PreviewFollowMode;
}): { token: string; record: PreviewSessionRecord; path: string } {
  const sid = randomBytes(24).toString("base64url");
  const now = new Date();
  const exp = now.getTime() + previewTtlMinutes() * 60_000;
  const payload: PreviewSessionPayload = {
    sid,
    businessId: input.businessId,
    brandKitId: input.brandKitId,
    cardName: input.cardName,
    revision: input.revision ?? 1,
    exp,
    createdAt: now.toISOString(),
    mode: input.mode ?? "follow",
  };
  const token = createPreviewToken(payload);
  const record: PreviewSessionRecord = {
    ...payload,
    tokenHash: hashToken(token),
    revoked: false,
    snapshotJson: input.snapshotJson,
    profileJson: input.profileJson,
    businessName: input.businessName,
    logoUrl: input.logoUrl ?? null,
    reviewUrl: input.reviewUrl ?? null,
    updatedAt: now.toISOString(),
    lastSaveTime: now.toISOString(),
  };
  store().set(sid, record);
  return { token, record, path: `/preview/live/${token}` };
}

export function getPreviewSession(
  token: string
):
  | { ok: true; record: PreviewSessionRecord; payload: PreviewSessionPayload }
  | { ok: false; reason: string } {
  const verified = verifyPreviewToken(token);
  if (!verified.ok) return verified;
  const record = store().get(verified.payload.sid);
  if (!record) return { ok: false, reason: "preview_unavailable" };
  if (record.revoked) return { ok: false, reason: "preview_revoked" };
  if (record.businessId !== verified.payload.businessId) {
    return { ok: false, reason: "preview_tenant_mismatch" };
  }
  const tokenHash = hashToken(token);
  try {
    const a = Buffer.from(tokenHash);
    const b = Buffer.from(record.tokenHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "preview_token_invalid" };
    }
  } catch {
    return { ok: false, reason: "preview_token_invalid" };
  }
  return { ok: true, record, payload: verified.payload };
}

export function updatePreviewSession(
  token: string,
  patch: {
    snapshotJson?: string;
    profileJson?: string;
    revision?: number;
    cardName?: string;
    mode?: PreviewFollowMode;
  }
): { ok: true; revision: number; mode: PreviewFollowMode } | { ok: false; reason: string } {
  const got = getPreviewSession(token);
  if (!got.ok) return got;
  if (got.record.mode === "freeze" && patch.snapshotJson && patch.mode !== "follow") {
    // Freeze keeps the selected snapshot; mode/metadata may still update.
    const nextFrozen: PreviewSessionRecord = {
      ...got.record,
      mode: patch.mode ?? got.record.mode,
      cardName: patch.cardName ?? got.record.cardName,
      updatedAt: new Date().toISOString(),
    };
    store().set(got.payload.sid, nextFrozen);
    return { ok: true, revision: nextFrozen.revision, mode: nextFrozen.mode };
  }
  const next: PreviewSessionRecord = {
    ...got.record,
    snapshotJson: patch.snapshotJson ?? got.record.snapshotJson,
    profileJson: patch.profileJson ?? got.record.profileJson,
    revision: patch.revision ?? got.record.revision,
    cardName: patch.cardName ?? got.record.cardName,
    mode: patch.mode ?? got.record.mode,
    updatedAt: new Date().toISOString(),
    lastSaveTime: patch.snapshotJson ? new Date().toISOString() : got.record.lastSaveTime,
  };
  store().set(got.payload.sid, next);
  return { ok: true, revision: next.revision, mode: next.mode };
}

export function revokePreviewSession(
  token: string
): { ok: true } | { ok: false; reason: string } {
  const verified = verifyPreviewToken(token);
  if (!verified.ok && verified.reason !== "preview_expired") return verified;
  const sid = verified.ok
    ? verified.payload.sid
    : (() => {
        try {
          const payloadB64 = token.split(".")[0];
          const payload = JSON.parse(
            Buffer.from(payloadB64, "base64url").toString("utf8")
          ) as PreviewSessionPayload;
          return payload.sid;
        } catch {
          return null;
        }
      })();
  if (!sid) return { ok: false, reason: "preview_unavailable" };
  const record = store().get(sid);
  if (!record) return { ok: false, reason: "preview_unavailable" };
  store().set(sid, { ...record, revoked: true });
  return { ok: true };
}

/** Test helper — clear in-memory sessions. */
export function __clearPreviewSessionsForTests(): void {
  store().clear();
}
