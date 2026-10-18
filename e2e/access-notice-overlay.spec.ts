import { expect, test } from "@playwright/test";

const enabled = process.env.ACCESS_NOTICE_ACCEPTANCE === "1";

test("locked actions use the shared viewport access notice without reflow", async ({ page }) => {
  test.skip(!enabled, "Set ACCESS_NOTICE_ACCEPTANCE=1 for the deterministic local review runtime");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/review/studio", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Open / Edit" }).click();
  await page.getByTestId("experience-nav-page-music").click();
  await page.getByTestId("studio-preview").click();
  await page.setViewportSize({ width: 390, height: 844 });

  const trigger = page.getByRole("button", { name: "Vault (locked)" });
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  await trigger.click();

  const layer = page.getByTestId("experience-access-notice-layer");
  const notice = page.getByTestId("experience-access-notice");
  await expect(layer).toBeVisible();
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute("role", "dialog");
  await expect(notice).toHaveAttribute("aria-modal", "true");
  await expect(notice).toBeFocused();
  await expect(notice.getByText("Vault Access Required")).toBeVisible();
  await expect(notice.getByText("Join the artist community to unlock the Vault.")).toBeVisible();
  await expect(page.getByTestId("tap-experience-renderer")).toHaveAttribute("data-active-page-id", "page-music");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Got It" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close access notice" })).toBeFocused();

  const layerOrder = await page.evaluate(() => ({
    notice: Number.parseInt(getComputedStyle(document.querySelector<HTMLElement>('[data-experience-shell-layer="access-notice"]')!).zIndex, 10),
    navigation: Number.parseInt(getComputedStyle(document.querySelector<HTMLElement>('[data-testid="experience-bottom-navigation"]')!).zIndex, 10),
  }));
  expect(layerOrder.notice).toBeGreaterThan(layerOrder.navigation);
  expect(await page.evaluate(() => document.elementFromPoint(195, 810)?.closest('[data-experience-shell-layer="access-notice"]') !== null)).toBeTruthy();

  await page.keyboard.press("Escape");
  await expect(layer).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.documentElement.scrollHeight,
  }))).toEqual(before);

  await trigger.click();
  await page.getByRole("button", { name: "Got It" }).click();
  await expect(layer).toBeHidden();
  await expect(trigger).toBeFocused();
});
