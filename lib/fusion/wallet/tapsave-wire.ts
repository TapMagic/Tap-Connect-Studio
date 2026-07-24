/**
 * TapSave → Wallet mock lifecycle — links issued passes to CustomerRelationship.
 * Mock adapter path only; live Apple/Google signing stays credential-blocked.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordConsent } from "@/lib/fusion/audience/consent";
import { findRelationshipByPublicToken } from "@/lib/fusion/audience/relationships";
import { isFeatureEnabled, type FeatureOverride } from "@/lib/fusion/features/resolve";
import { createGovernedEvent, enqueueOutboxSync } from "@/lib/fusion/publication/events";
import { createMoment, type TapSaveMoment } from "@/lib/fusion/tapsave/moments";
import { isInstallable, type WalletPassStatus } from "./lifecycle";
import {
  createPassDraft,
  issuePass,
  listPassesForRelationship,
  previewPass,
  type WalletPassRecord,
} from "./service";
import { listWalletCredentialBlockers, type WalletPlatform } from "./types";

export type TapSaveWalletGateResult =
  | { ok: true; walletEnabled: boolean; tapSaveEnabled: boolean; mockPath: boolean }
  | { ok: false; code: "tapsave_off" | "wallet_off" | "not_found" | "inactive"; message: string };

export type TapSaveWalletWireResult =
  | {
      ok: true;
      pass: WalletPassRecord;
      mock: boolean;
      previewUrl: string | null;
      installUrl: string | null;
      alreadyIssued: boolean;
      moment: TapSaveMoment | null;
    }
  | {
      ok: false;
      code:
        | "tapsave_off"
        | "wallet_off"
        | "not_found"
        | "inactive"
        | "error";
      message: string;
    };

export type MyTapWalletSummary = {
  pass: WalletPassRecord;
  mock: boolean;
  evidenceLabel: string;
  installUrl: string | null;
  previewUrl: string | null;
};

/** Prefer installable pass, then newest non-terminal. */
export function pickActiveWalletPass(passes: WalletPassRecord[]): WalletPassRecord | null {
  if (passes.length === 0) return null;
  const installable = passes.find((p) => isInstallable(p.status as WalletPassStatus));
  if (installable) return installable;
  const nonTerminal = passes.find(
    (p) => !["REVOKED", "REPLACED", "EXPIRED"].includes(p.status)
  );
  return nonTerminal ?? passes[0] ?? null;
}

export function myTapWalletInstallUrl(publicToken: string, serialNumber: string): string {
  return `/mytap/${publicToken}?wallet=${encodeURIComponent(serialNumber)}`;
}

export function shapeMyTapWalletSummary(
  pass: WalletPassRecord,
  publicToken: string
): MyTapWalletSummary {
  const blockers = listWalletCredentialBlockers();
  const platformBlockers =
    pass.platform === "apple" ? blockers.apple.length > 0 : blockers.google.length > 0;
  const mock = pass.mock || platformBlockers;
  return {
    pass,
    mock,
    evidenceLabel: mock ? "Modeled — mock adapter" : "Confirmed",
    installUrl:
      pass.installUrl ??
      (isInstallable(pass.status as WalletPassStatus)
        ? myTapWalletInstallUrl(publicToken, pass.serialNumber)
        : null),
    previewUrl: pass.previewUrl,
  };
}

export async function evaluateTapSaveWalletGate(input: {
  publicToken: string;
  overrides?: FeatureOverride[];
}): Promise<TapSaveWalletGateResult> {
  const relationship = await findRelationshipByPublicToken(input.publicToken);
  if (!relationship) {
    return { ok: false, code: "not_found", message: "Saved relationship not found." };
  }
  if (relationship.status !== "ACTIVE") {
    return { ok: false, code: "inactive", message: "This saved relationship is not active." };
  }
  if (!isFeatureEnabled("tapsave.core", { overrides: input.overrides })) {
    return { ok: false, code: "tapsave_off", message: "TapSave is not enabled." };
  }
  if (!relationship.tapSaveEnabled) {
    return { ok: false, code: "tapsave_off", message: "Keep Card is required before Wallet." };
  }
  const walletEnabled = isFeatureEnabled("wallet.apple_google", { overrides: input.overrides });
  if (!walletEnabled) {
    return { ok: false, code: "wallet_off", message: "Wallet passes are disabled." };
  }
  const blockers = listWalletCredentialBlockers();
  return {
    ok: true,
    walletEnabled,
    tapSaveEnabled: true,
    mockPath: blockers.apple.length > 0 || blockers.google.length > 0,
  };
}

async function resolveTapUrl(relationship: {
  id: string;
  businessId: string;
  publicToken: string;
  metadata: unknown;
  business: { name: string; slug?: string | null };
}): Promise<string> {
  const meta =
    relationship.metadata && typeof relationship.metadata === "object" && !Array.isArray(relationship.metadata)
      ? (relationship.metadata as Record<string, unknown>)
      : {};
  const deviceSlotId = typeof meta.lastDeviceSlotId === "string" ? meta.lastDeviceSlotId : null;
  if (deviceSlotId) {
    try {
      const slot = await prisma.deviceSlot.findUnique({
        where: { id: deviceSlotId },
        select: { deviceCode: true },
      });
      if (slot) return `/t/${slot.deviceCode}?public=1`;
    } catch {
      // optional
    }
  }
  const slug = relationship.business.slug ?? relationship.businessId;
  return `https://tapconnect.app/t/${slug}`;
}

async function recordWalletInstallMoment(input: {
  businessId: string;
  relationshipId: string;
  publicToken: string;
  passId: string;
  serialNumber: string;
  mock: boolean;
}): Promise<TapSaveMoment | null> {
  const moment = createMoment({
    businessId: input.businessId,
    relationshipId: input.relationshipId,
    visitorRef: input.publicToken,
    kind: "wallet_install",
    metadata: {
      passId: input.passId,
      serialNumber: input.serialNumber,
      mock: input.mock,
    },
  });
  try {
    const row = await prisma.tapSaveMoment.create({
      data: {
        id: moment.id,
        businessId: input.businessId,
        relationshipId: input.relationshipId,
        visitorRef: input.publicToken,
        kind: "wallet_install",
        metadata: moment.metadata as Prisma.InputJsonValue,
        occurredAt: new Date(moment.occurredAt),
      },
    });
    return {
      ...moment,
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
    };
  } catch {
    return moment;
  }
}

export async function getWalletPassForMyTap(
  publicToken: string
): Promise<MyTapWalletSummary | null> {
  const relationship = await findRelationshipByPublicToken(publicToken);
  if (!relationship) return null;

  const passes = await listPassesForRelationship({
    businessId: relationship.businessId,
    relationshipId: relationship.id,
    limit: 10,
  });
  const pass = pickActiveWalletPass(passes);
  if (!pass) return null;
  return shapeMyTapWalletSummary(pass, publicToken);
}

export async function issueMockWalletFromTapSave(input: {
  publicToken: string;
  platform?: WalletPlatform;
  overrides?: FeatureOverride[];
}): Promise<TapSaveWalletWireResult> {
  const gate = await evaluateTapSaveWalletGate(input);
  if (!gate.ok) return gate;

  const relationship = await findRelationshipByPublicToken(input.publicToken);
  if (!relationship) {
    return { ok: false, code: "not_found", message: "Saved relationship not found." };
  }

  const platform = input.platform ?? "apple";
  const featureEnabled = gate.walletEnabled;
  const tapUrl = await resolveTapUrl({
    id: relationship.id,
    businessId: relationship.businessId,
    publicToken: relationship.publicToken,
    metadata: relationship.metadata,
    business: relationship.business,
  });

  try {
    const existing = await listPassesForRelationship({
      businessId: relationship.businessId,
      relationshipId: relationship.id,
      limit: 10,
    });
    const active = pickActiveWalletPass(existing);
    if (active && isInstallable(active.status as WalletPassStatus)) {
      return {
        ok: true,
        pass: active,
        mock: active.mock,
        previewUrl: active.previewUrl,
        installUrl: active.installUrl ?? myTapWalletInstallUrl(input.publicToken, active.serialNumber),
        alreadyIssued: true,
        moment: null,
      };
    }

    let passId = active?.id;
    if (!passId) {
      const draft = await createPassDraft({
        businessId: relationship.businessId,
        platform,
        businessName: relationship.business.name,
        cardTitle: `${relationship.business.name} Card`,
        tapUrl,
        logoUrl: relationship.business.logoUrl ?? undefined,
        contactId: relationship.contactId,
        relationshipId: relationship.id,
        featureEnabled,
      });
      if (!draft.ok) {
        return { ok: false, code: "error", message: draft.error };
      }
      passId = draft.pass.id;
    }

    const preview = await previewPass({
      passId,
      businessId: relationship.businessId,
      featureEnabled,
    });
    if (!preview.ok) {
      return { ok: false, code: "error", message: preview.error };
    }

    const issued = await issuePass({
      passId,
      businessId: relationship.businessId,
      featureEnabled,
    });
    if (!issued.ok) {
      return { ok: false, code: "error", message: issued.error };
    }

    const installUrl = myTapWalletInstallUrl(input.publicToken, issued.pass.serialNumber);
    const updated = await prisma.walletPass.update({
      where: { id: issued.pass.id },
      data: { installUrl },
    });
    const pass: WalletPassRecord = {
      ...issued.pass,
      installUrl: updated.installUrl,
    };

    await recordConsent({
      businessId: relationship.businessId,
      contactId: relationship.contactId,
      channel: "WALLET",
      status: "GRANTED",
      legalBasis: "consent",
      sourceType: "tapsave_wallet_mock",
      sourceId: relationship.id,
    });

    const moment = await recordWalletInstallMoment({
      businessId: relationship.businessId,
      relationshipId: relationship.id,
      publicToken: input.publicToken,
      passId: pass.id,
      serialNumber: pass.serialNumber,
      mock: issued.mock,
    });

    enqueueOutboxSync(
      "wallet.issued",
      createGovernedEvent({
        name: "wallet.pass.issued_from_tapsave",
        businessId: relationship.businessId,
        aggregateType: "wallet_pass",
        aggregateId: pass.id,
        correlationId: crypto.randomUUID(),
        payload: {
          relationshipId: relationship.id,
          publicToken: input.publicToken,
          serialNumber: pass.serialNumber,
          mock: issued.mock,
          platform,
        },
      })
    );

    return {
      ok: true,
      pass,
      mock: issued.mock,
      previewUrl: preview.previewUrl,
      installUrl,
      alreadyIssued: false,
      moment,
    };
  } catch (err) {
    return {
      ok: false,
      code: "error",
      message: err instanceof Error ? err.message : "Wallet mock issue failed",
    };
  }
}
