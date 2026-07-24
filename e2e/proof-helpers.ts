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

export const SEED = {
  businessId: process.env.SEED_BUSINESS_ID ?? "cmrx5wjml0000519ktwgyj0pe",
  campaignId: process.env.SEED_CAMPAIGN_ID ?? "cmrx5wjn80001519kzayn9296",
  enrollmentId: process.env.SEED_ENROLLMENT_ID ?? "cmrx5yojf0009bv9kivpac97i",
  contactId: process.env.SEED_CONTACT_ID ?? "cmrx5wjn90002519khgib6nsd",
  deviceCode: process.env.SEED_DEVICE_CODE ?? "seeddemo01",
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
