/**
 * Shared Playwright proof helpers for Tap Connect Fusion e2e specs.
 */

import { expect, type APIRequestContext, type Page, type ConsoleMessage } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
export const OUT = path.join(process.cwd(), "tmp", "fusion-proofs");

/** Morning instant outside seed evening schedule windows — assignment wins on seed device. */
export const PROOF_PUBLIC_AT = "2026-07-23T10:00:00-04:00";

function loadSeedIdsFromDisk(): Partial<{
  businessId: string;
  campaignId: string;
  eveningCampaignId: string;
  groupId: string;
  contactId: string;
  deviceCode: string;
}> {
  try {
    const p = path.join(process.cwd(), "tmp", "fusion-seed-ids.json");
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

const diskSeed = loadSeedIdsFromDisk();

export const SEED = {
  businessId:
    process.env.SEED_BUSINESS_ID ??
    diskSeed.businessId ??
    "cms1caza70000gh9kt7ev6nm0",
  campaignId:
    process.env.SEED_CAMPAIGN_ID ??
    diskSeed.campaignId ??
    "cms1cazaz0002gh9k33zrzlow",
  eveningCampaignId:
    process.env.SEED_EVENING_CAMPAIGN_ID ??
    diskSeed.eveningCampaignId ??
    "",
  groupId: process.env.SEED_GROUP_ID ?? diskSeed.groupId ?? "",
  enrollmentId: process.env.SEED_ENROLLMENT_ID ?? "cmrx5yojf0009bv9kivpac97i",
  contactId:
    process.env.SEED_CONTACT_ID ?? diskSeed.contactId ?? "cms1cazb20003gh9kaf22yry8",
  deviceCode: process.env.SEED_DEVICE_CODE ?? diskSeed.deviceCode ?? "seeddemo01",
  journeyName: process.env.SEED_JOURNEY_NAME ?? "[SEED] Demo Journey",
  campaignTitle: process.env.SEED_CAMPAIGN_TITLE ?? "[SEED] Welcome Offer",
} as const;

/** Wait until campaign editor client handlers are attached (SSR Select is visible before onClick). */
export async function waitForCampaignEditorReady(page: Page) {
  await expect(page.getByTestId("campaign-editor")).toHaveAttribute(
    "data-editor-ready",
    "true",
    { timeout: 30_000 }
  );
}

/** Select a content block after editor-ready, with retry until aria-pressed. */
export async function selectCampaignBlock(page: Page, blockTestId: string) {
  await waitForCampaignEditorReady(page);
  const el = page.getByTestId(blockTestId);
  await el.waitFor({ state: "visible", timeout: 30_000 });
  await expect(async () => {
    await el.click({ trial: false });
    await expect(el).toHaveAttribute("aria-pressed", "true");
  }).toPass({ timeout: 15_000 });
}

/**
 * Dedicated device for public parity — avoids seed schedule / prior-test contamination.
 * Falls back to seed device + schedule-safe `at` when create is unavailable.
 */
export async function resolveProofPublicDevice(
  request: APIRequestContext,
  nickname: string
): Promise<{ deviceSlotId: string; deviceCode: string; dedicated: boolean }> {
  const created = await request.post(`${BASE}/api/devices`, {
    data: { nickname },
  });
  if (created.ok()) {
    const json = (await created.json()) as {
      device: { id: string; deviceCode: string };
    };
    return {
      deviceSlotId: json.device.id,
      deviceCode: json.device.deviceCode,
      dedicated: true,
    };
  }
  return {
    deviceSlotId: "",
    deviceCode: SEED.deviceCode,
    dedicated: false,
  };
}

export type ProofRecord = {
  id: string;
  route: string;
  workflow: string;
  passed: boolean;
  browserE2ePassed: boolean;
  persistencePassed: boolean;
  /** Set true only when headed a11y checks actually ran and passed */
  a11yPassed?: boolean;
  /** Set true only when mobile+desktop viewport layout checks passed */
  responsivePassed?: boolean;
  consoleErrors: string[];
  pageErrors: string[];
  notes: string[];
  lastVerifiedAt: string;
  blockers: string[];
};

export function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

export function attachConsole(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  return { consoleErrors, pageErrors };
}

export function writeProof(rec: ProofRecord) {
  ensureOut();
  const file = path.join(OUT, `${rec.id}.json`);
  fs.writeFileSync(file, JSON.stringify(rec, null, 2));
  return file;
}

export function writeProofIndex() {
  ensureOut();
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".json") && f !== "index.json");
  const records = files.map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")));
  const index = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    count: records.length,
    fullyOwnerReadyEligible: records.filter(
      (r: ProofRecord) =>
        r.browserE2ePassed && r.persistencePassed && (!r.blockers || r.blockers.length === 0)
    ).length,
    records,
  };
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));
  return index;
}

/** Authoritative TapEvent snapshot for causation proofs (isolated fusion DB). */
export type TapEventSnapshot = {
  count: number;
  latestId: string | null;
  latestCreatedAt: string | null;
};

export async function snapshotTapEvents(opts: {
  businessId: string;
  deviceCode?: string;
}): Promise<TapEventSnapshot> {
  const { Pool } = await import("pg");
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL required for TapEvent snapshot");
  }
  const pool = new Pool({ connectionString: url });
  try {
    if (opts.deviceCode) {
      const countRes = await pool.query<{ c: number }>(
        `SELECT COUNT(*)::int AS c
         FROM "TapEvent" te
         INNER JOIN "DeviceSlot" ds ON ds.id = te."deviceSlotId"
         WHERE te."businessId" = $1 AND ds."deviceCode" = $2`,
        [opts.businessId, opts.deviceCode]
      );
      const latestRes = await pool.query<{ id: string; createdAt: Date }>(
        `SELECT te.id, te."createdAt"
         FROM "TapEvent" te
         INNER JOIN "DeviceSlot" ds ON ds.id = te."deviceSlotId"
         WHERE te."businessId" = $1 AND ds."deviceCode" = $2
         ORDER BY te."createdAt" DESC
         LIMIT 1`,
        [opts.businessId, opts.deviceCode]
      );
      const latest = latestRes.rows[0];
      return {
        count: countRes.rows[0]?.c ?? 0,
        latestId: latest?.id ?? null,
        latestCreatedAt: latest?.createdAt
          ? new Date(latest.createdAt).toISOString()
          : null,
      };
    }

    const countRes = await pool.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM "TapEvent" WHERE "businessId" = $1`,
      [opts.businessId]
    );
    const latestRes = await pool.query<{ id: string; createdAt: Date }>(
      `SELECT id, "createdAt" FROM "TapEvent"
       WHERE "businessId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [opts.businessId]
    );
    const latest = latestRes.rows[0];
    return {
      count: countRes.rows[0]?.c ?? 0,
      latestId: latest?.id ?? null,
      latestCreatedAt: latest?.createdAt
        ? new Date(latest.createdAt).toISOString()
        : null,
    };
  } finally {
    await pool.end();
  }
}

/** Poll until TapEvent count/id advances past a pre-tap snapshot. */
export async function waitForNewTapEvent(opts: {
  businessId: string;
  deviceCode?: string;
  before: TapEventSnapshot;
  timeoutMs?: number;
}): Promise<TapEventSnapshot> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const started = Date.now();
  let last = opts.before;
  while (Date.now() - started < timeoutMs) {
    last = await snapshotTapEvents({
      businessId: opts.businessId,
      deviceCode: opts.deviceCode,
    });
    if (last.count > opts.before.count) {
      if (!opts.before.latestId || last.latestId !== opts.before.latestId) {
        return last;
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `TapEvent did not advance: before=${JSON.stringify(opts.before)} after=${JSON.stringify(last)}`
  );
}
