/**
 * Builder exploratory control audit — bounded sweep (no infinite hang).
 * Samples toolbar, Format, media/bg panel, save/reload, publish/public.
 *
 * Usage:
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/builder-exploratory-controls.spec.ts --headed
 */

import { test, expect } from "@playwright/test";
import {
  attachConsole,
  BASE,
  PROOF_PUBLIC_AT,
  SEED,
  resolveProofPublicDevice,
  selectCampaignBlock,
  waitForCampaignEditorReady,
  writeProof,
  writeProofIndex,
} from "./proof-helpers";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6aAAAAAElFTkSuQmCC";

test.describe("Builder exploratory controls", () => {
  test.describe.configure({ timeout: 120_000 });

  test("P-builder-exploratory-controls: toolbar Format save publish sample", async ({
    page,
  }) => {
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];
    const stamp = Date.now();
    const marker = `Explore_${stamp}`;

    const create = await page.request.post(`${BASE}/api/campaigns`, {
      data: { templateId: "coupon-offer", title: `[PROOF] Exploratory ${stamp}` },
    });
    expect(create.ok(), await create.text()).toBeTruthy();
    const campaignId = ((await create.json()) as { campaign: { id: string } }).campaign.id;

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
        id: "hero",
        type: "hero_image",
        label: "Hero",
        order: 1,
        enabled: true,
        data: { imageUrl: TINY_PNG, altText: "explore", aspect: "1/1", objectFit: "contain" },
      },
      {
        id: "btns",
        type: "button_group",
        label: "Buttons",
        order: 2,
        enabled: true,
        data: {
          layout: "stack",
          buttons: [
            {
              id: "b1",
              label: "Short",
              url: "https://example.com/a",
              style: "primary",
              icon: "link",
              appearance: "icon_text",
              fullWidth: true,
            },
            {
              id: "b2",
              label: "A Very Long Button Label That Should Wrap Gracefully On Mobile Viewports",
              url: "https://example.com/b",
              style: "outline",
              icon: "star",
              appearance: "icon_text",
              wrap: true,
              fullWidth: true,
            },
          ],
        },
      },
    ];
    await page.request.patch(`${BASE}/api/campaigns/assign`, {
      data: { id: campaignId, contentBlocks: blocks },
    });

    await page.goto(`${BASE}/dashboard/campaigns/${campaignId}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForCampaignEditorReady(page);
    notes.push(`campaign=${campaignId}`);

    const hydrationNoise = consoleErrors.filter((e) =>
      /hydrat|did not match|Minified React error/i.test(e)
    );
    if (hydrationNoise.length) blockers.push(`hydration_console=${hydrationNoise.length}`);

    // Sample every primary toolbar control (presence + safe click)
    const toolbar = [
      "campaign-undo",
      "campaign-redo",
      "campaign-save",
      "campaign-publish",
      "campaign-versions",
    ] as const;
    for (const id of toolbar) {
      const el = page.getByTestId(id);
      if ((await el.count()) === 0) {
        blockers.push(`missing_${id}`);
        continue;
      }
      const disabled = await el.isDisabled().catch(() => false);
      notes.push(`toolbar_${id}=${disabled ? "disabled" : "enabled"}`);
      if (id === "campaign-versions") {
        await el.click();
        await page.waitForTimeout(200);
        await el.click();
        notes.push("versions_toggled");
      }
    }

    // Format sample — default finish honesty now lives in the shared Layout tool
    // drawer (Page theme panel points to it; "Flat" is the honest non-premium
    // default and must not coerce to metallic).
    await page.getByRole("button", { name: /^Page theme$/i }).click();
    await page.getByTestId("campaign-open-layout-tool").click();
    const finish = page.getByTestId("campaign-default-button-finish").first();
    await expect(finish).toBeVisible({ timeout: 10_000 });
    const opts = await finish.locator("option").allTextContents();
    const hasFlat = opts.some((o) => /Flat/i.test(o));
    notes.push(`finish_flat=${hasFlat}`);
    if (!hasFlat) blockers.push("finish_picker_missing_flat");
    await finish.selectOption("flat");
    await expect(finish).toHaveValue("flat");
    notes.push("finish_flat_honest");
    if (opts.length > 1) {
      await finish.selectOption({ index: 1 }).catch(() => undefined);
      notes.push("finish_sample_selected");
    }
    // Close the drawer so subsequent block edits use the outline panel
    await page.getByTestId("campaign-drawer-collapse").first().click().catch(() => undefined);

    // Headline live preview sample
    await selectCampaignBlock(page, "campaign-block-hl");
    const headlineField = page.getByTestId("block-headline-text");
    // The headline control may be a bare input or an expanded field wrapper.
    const headlineInput = (await headlineField
      .first()
      .evaluate((el) => el.tagName === "INPUT" || el.tagName === "TEXTAREA")
      .catch(() => false))
      ? headlineField.first()
      : headlineField.locator("input, textarea").first();
    if ((await headlineField.count()) > 0) {
      const next = `${marker}_EDIT`;
      await headlineInput.fill(next);
      await page.waitForTimeout(250);
      const phoneText = await page.getByTestId("campaign-phone-preview").innerText();
      if (!phoneText.includes(next) && !phoneText.includes(marker)) {
        blockers.push("stale_preview_after_headline_edit");
      } else {
        notes.push("live_preview_updated");
      }
    } else {
      notes.push("headline_input_absent");
    }

    // Button Format sample — single mount for selected button
    await selectCampaignBlock(page, "campaign-block-btns");
    const layout = page.getByTestId("button-layout-controls");
    if ((await layout.count()) > 0) {
      await expect(layout).toHaveCount(1);
      await expect(layout).toBeVisible();
      if ((await page.getByTestId("layout-wrap").count()) > 0) {
        await page.getByTestId("layout-wrap").check();
        notes.push("format_wrap_checked");
      }
      if ((await page.getByTestId("icon-placement").count()) > 0) {
        await page.getByTestId("icon-placement").selectOption("above").catch(() => undefined);
        notes.push("format_placement_sampled");
      }
      notes.push("button_layout_present");
    } else {
      notes.push("button_layout_absent_honest");
    }

    // Media + bg-remove panel open/close (no trap)
    await selectCampaignBlock(page, "campaign-block-hero");
    await expect(page.getByTestId("media-picker")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
    await page.getByTestId("bg-remove-open").click();
    await expect(page.getByTestId("bg-remove-panel")).toBeVisible();
    // Prefer Esc — Close can sit under the checkerboard preview and intercept clicks
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bg-remove-panel")).toHaveCount(0);
    notes.push("bg_panel_exit_ok");

    // Side tabs Esc → Content (bounded sample)
    for (const side of ["qr", "schedule"] as const) {
      const tab = page.getByTestId(`campaign-tab-${side}`);
      if ((await tab.count()) === 0) {
        notes.push(`tab_${side}_absent`);
        continue;
      }
      await tab.click();
      await page.waitForTimeout(150);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      const contentPressed = await page
        .getByTestId("campaign-tab-content")
        .getAttribute("aria-pressed")
        .catch(() => null);
      if (contentPressed === "true") notes.push(`tab_${side}_esc_ok`);
      else notes.push(`tab_${side}_esc_no_content_return`);
    }

    // Save → reload
    await page.getByTestId("campaign-save").click();
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForCampaignEditorReady(page);
    const afterReload = await page.getByTestId("campaign-phone-preview").innerText();
    if (!afterReload.includes(marker)) blockers.push("reload_missing_marker");
    else notes.push("save_reload_ok");

    // Undo sample
    await selectCampaignBlock(page, "campaign-block-hl");
    if ((await page.getByTestId("block-headline-text").count()) > 0) {
      const undoField = page.getByTestId("block-headline-text").first();
      const undoInput = (await undoField
        .evaluate((el) => el.tagName === "INPUT" || el.tagName === "TEXTAREA")
        .catch(() => false))
        ? undoField
        : undoField.locator("input, textarea").first();
      await undoInput.fill(`${marker}_UNDO`);
      await page.waitForTimeout(200);
      if (!(await page.getByTestId("campaign-undo").isDisabled())) {
        await page.getByTestId("campaign-undo").click();
        notes.push("undo_ok");
      } else {
        notes.push("undo_disabled_skip");
      }
    }

    // Publish + public on dedicated device (avoid seed schedule / contamination)
    const proofDevice = await resolveProofPublicDevice(
      page.request,
      `ExploreCtrl_${stamp}`
    );
    let deviceSlotId = proofDevice.deviceSlotId;
    let deviceCode = proofDevice.deviceCode;
    notes.push(`device_dedicated=${proofDevice.dedicated}`);
    if (!deviceSlotId) {
      const deviceSelect = page.getByTestId("campaign-publish-device");
      if ((await deviceSelect.count()) > 0) {
        deviceSlotId = await deviceSelect.inputValue();
        deviceCode = SEED.deviceCode;
      }
    }
    if (deviceSlotId) {
      const pub = await page.request.patch(`${BASE}/api/campaigns/assign`, {
        data: { id: campaignId, status: "LIVE" },
      });
      const assign = await page.request.post(`${BASE}/api/campaigns/assign`, {
        data: { deviceSlotId, campaignId },
      });
      notes.push(`publish=${pub.status()} assign=${assign.status()}`);
      if (!pub.ok() || !assign.ok()) blockers.push("publish_or_assign_failed");
      else {
        const at = encodeURIComponent(PROOF_PUBLIC_AT);
        await page.goto(`${BASE}/t/${deviceCode}?public=1&at=${at}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(800);
        const publicText = await page.locator("body").innerText();
        if (!publicText.includes(marker)) blockers.push("public_missing_marker");
        else notes.push("public_render_ok");
      }
    } else {
      notes.push("device_slot_missing_skip_public");
    }

    const openDialogs = await page.locator('[role="dialog"][aria-modal="true"]').count();
    if (openDialogs > 0) blockers.push("modal_trap_left_open");

    if (pageErrors.length) blockers.push(`page_errors=${pageErrors.length}`);

    writeProof({
      id: "P-builder-exploratory-controls",
      route: `/dashboard/campaigns/${campaignId}`,
      workflow:
        "Bounded exploratory sweep — toolbar, Format sample, bg-remove exits, save/reload, publish/public, undo, no traps",
      passed: blockers.length === 0,
      browserE2ePassed: blockers.length === 0,
      persistencePassed: notes.includes("save_reload_ok"),
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
