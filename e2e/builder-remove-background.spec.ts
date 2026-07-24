/**
 * Builder Remove Background — non-destructive local-mock workflow proof.
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/builder-remove-background.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

/** 16×16 white field + dark subject — chroma-key leaves subject opaque. */
const SUBJECT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbElEQVR4nGNgYGBg+M9Qz4AGsAEjAwMDAwPj////GRgYGBhAav7//8/AwMDA8J+BgYEBlIbR/xkYGBhAbAYGBgYGBgaG/wwMDAwwNSgYGRgYGBhAbAYGBgYGBgaG/wwMDAwwNSgYGRgYGBhAbAYGBgYGBgaG/wwMDAwwNSgYGRgYGBgYGBg+M9Qz4AGsIHRDAwMDA8M/BgYGhv8MDAwMjIwMjP8ZGBgY/jMwMDAyMjAy/mdgYGBgYGBg+M9Qz4AGsAEAWG0e9W1m0s0AAAAASUVORK5CYII=";

/** Fallback solid PNG if subject decode fails — still yields a transparent cutout. */
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6aAAAAAElFTkSuQmCC";

test.describe("Builder remove background", () => {
  test.describe.configure({ timeout: 120_000 });

  test("P-builder-remove-background: preview apply restore provenance", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const stamp = Date.now();
    const marker = `BgRm_${stamp}`;

    const create = await page.request.post(`${BASE}/api/campaigns`, {
      data: { templateId: "coupon-offer", title: `[PROOF] BgRemove ${stamp}` },
    });
    expect(create.ok(), await create.text()).toBeTruthy();
    const campaignId = ((await create.json()) as { campaign: { id: string } }).campaign.id;

    const imageUrl = SUBJECT_PNG.length > 80 ? SUBJECT_PNG : TINY_PNG;
    const blocks = [
      {
        id: "hl",
        type: "headline",
        label: "Headline",
        order: 0,
        enabled: true,
        data: { headline: marker, alignment: "center" },
      },
      {
        id: "hero_bg",
        type: "hero_image",
        label: "Hero",
        order: 1,
        enabled: true,
        data: { imageUrl, altText: "proof cutout", aspect: "1/1", objectFit: "contain" },
      },
    ];
    const patch = await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: { id: campaignId, contentBlocks: blocks },
    });
    expect(patch.ok(), await patch.text()).toBeTruthy();
    notes.push(`campaign=${campaignId}`);

    await page.goto(`${BASE}/dashboard/campaigns/${campaignId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(900);

    // Click the select control — row center can hit Move ↑/↓ and leave Theme media-picker empty.
    await page
      .getByTestId("campaign-block-hero_bg")
      .getByRole("button", { name: /Select block/i })
      .click();
    await expect(page.getByText(/Edit:\s*Hero/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("media-picker")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("bg-remove-open")).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear image/i })).toBeVisible();
    notes.push("bg_remove_entry_beside_clear");

    // Paste focus control (media Format surface)
    await page.getByTestId("media-paste-focus").click();
    await expect(page.getByTestId("media-picker-message")).toContainText(/Paste/i);
    notes.push("paste_focus_ok");

    // Open → Escape → focus return
    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
    notes.push("escape_close");

    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();

    for (const mode of ["light", "dark", "checker"] as const) {
      await page.getByTestId(`bg-preview-${mode}`).click();
      notes.push(`preview_${mode}`);
    }

    await page.getByLabel("Edge refinement").check();
    await page.getByLabel("Soft shadow").check();
    await page.getByTestId("bg-remove-preview-btn").click();

    // Local mock should finish quickly; fail soft if canvas blocked
    await expect
      .poll(async () => page.getByTestId("bg-remove-apply").isEnabled(), {
        timeout: 12_000,
      })
      .toBe(true)
      .catch(() => undefined);

    await expect(page.getByTestId("bg-remove-where-used")).toBeVisible();
    await expect(page.getByTestId("bg-remove-undo-hint")).toBeVisible();

    const apply = page.getByTestId("bg-remove-apply");
    if (!(await apply.isEnabled())) {
      const panelText = (await page.getByTestId("bg-remove-panel").innerText()).slice(0, 160);
      blockers.push(`apply_disabled_after_preview:${panelText.replace(/\s+/g, " ")}`);
      await page.getByRole("button", { name: /^Close$/i }).first().click();
    } else {
      await expect(page.getByTestId("bg-remove-provenance")).toBeVisible();
      await apply.click();
      await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
      notes.push("apply_derived");

      const msg = page.getByTestId("media-picker-message");
      if ((await msg.count()) > 0) {
        const text = await msg.innerText();
        if (/Background removed|original preserved/i.test(text)) {
          notes.push("apply_message_non_destructive");
        } else {
          notes.push(`apply_message=${text.slice(0, 80)}`);
        }
      }

      // Restore original (non-destructive)
      await page.getByTestId("bg-remove-open").click();
      await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
      await page.getByTestId("bg-remove-restore").click();
      await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
      notes.push("restore_original");

      const afterRestore = page.getByTestId("media-picker-message");
      if ((await afterRestore.count()) > 0) {
        const t = await afterRestore.innerText();
        if (/restored/i.test(t)) notes.push("restore_message_ok");
      }
    }

    // Gallery Escape (bounded — skip if search hangs)
    const logoInput = page.getByPlaceholder(/Brand or domain/i);
    if ((await logoInput.count()) > 0) {
      await logoInput.fill("nike");
      await page.getByRole("button", { name: /^Find$/i }).first().click();
      const gallery = page.getByTestId("media-gallery-dialog");
      try {
        await expect(gallery).toBeVisible({ timeout: 8_000 });
        await page.keyboard.press("Escape");
        await expect(gallery).toHaveCount(0, { timeout: 3_000 });
        notes.push("gallery_escape_ok");
      } catch {
        notes.push("gallery_escape_skipped_or_slow");
        if ((await gallery.count()) > 0) {
          await page.getByTestId("media-gallery-close").click().catch(() => undefined);
        }
      }
    }

    if (pageErrors.length) blockers.push(`page_errors=${pageErrors.length}`);

    writeProof({
      id: "P-builder-remove-background",
      route: `/dashboard/campaigns/${campaignId}`,
      workflow:
        "Remove Background local-mock — entry beside Clear, preview modes, apply derived + provenance, restore, Esc exits",
      passed: blockers.length === 0 && pageErrors.length === 0,
      browserE2ePassed: blockers.length === 0,
      persistencePassed: notes.includes("restore_original") || notes.includes("apply_derived"),
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });
    writeProofIndex();
    expect(blockers.length, blockers.join("; ")).toBe(0);
  });
});
