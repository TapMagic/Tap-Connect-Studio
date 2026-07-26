/**
 * Card retention UX — conversion path, Manage Card, Home Screen honesty.
 * Requires PROOF_HEADED=1 and local server + isolated DB.
 */
import { expect, test, devices } from "@playwright/test";

const headed = process.env.PROOF_HEADED === "1";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";

test.describe("card retention UX", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed retention proofs");

  test("recommended primary + More options on public Card", async ({ page }) => {
    await page.goto(`${BASE}/t/seeddemo01?public=1`, { waitUntil: "networkidle" });
    const keep = page.getByTestId("keep-this-card");
    await expect(keep).toBeVisible({ timeout: 60_000 });
    await keep.scrollIntoViewIfNeeded();
    await keep.click();
    const chooser = page.getByTestId("retention-chooser");
    await expect(chooser).toBeVisible({ timeout: 15_000 });

    const primaryId = await chooser.getAttribute("data-primary-method");
    expect(primaryId).toBeTruthy();
    const primary = page.getByTestId(`retention-method-${primaryId}`);
    await expect(primary).toBeVisible();
    await expect(primary).toHaveAttribute("data-variant", "primary");
    await expect(primary.getByText(/Recommended/i)).toBeVisible();

    // Demo Wallet must not be equally primary when live Wallet is unavailable
    if (primaryId === "homescreen") {
      await expect(page.getByTestId("retention-method-apple_wallet")).toHaveCount(0);
      await page.getByTestId("retention-more-options").click();
      const wallet = page.getByTestId("retention-method-apple_wallet");
      if (await wallet.count()) {
        await expect(wallet).toHaveAttribute("data-variant", "more");
        await expect(wallet).toContainText(/Preview|Demo/i);
        await expect(wallet).not.toContainText(/Issued/i);
      }
    }
  });

  test("Home Screen guide does not claim success until confirmed", async ({ page }) => {
    await page.goto(`${BASE}/t/seeddemo01?public=1`, { waitUntil: "networkidle" });
    await page.getByTestId("keep-this-card").click();
    await expect(page.getByTestId("retention-chooser")).toBeVisible({ timeout: 15_000 });
    const primary = await page.getByTestId("retention-chooser").getAttribute("data-primary-method");
    if (primary === "homescreen") {
      await page.getByTestId("retention-method-homescreen").click();
    } else {
      await page.getByTestId("retention-more-options").click();
      await page.getByTestId("retention-method-homescreen").click();
    }
    await expect(page.getByTestId("homescreen-guide")).toBeVisible();
    await expect(page.getByTestId("retention-success")).toHaveCount(0);
    await page.getByTestId("homescreen-later").click();
    await expect(page.getByTestId("retention-success")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("retention-success")).toContainText(/pending|saved your place|Card kept/i);
    await expect(page.getByTestId("retention-success")).not.toContainText(/added to Home Screen/i);
  });

  test("useful updates consent is unchecked by default", async ({ page }) => {
    await page.goto(`${BASE}/t/seeddemo01?public=1`, { waitUntil: "networkidle" });
    await page.getByTestId("keep-this-card").click();
    await expect(page.getByTestId("retention-chooser")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("retention-more-options").click();
    await page.getByTestId("retention-method-email_card").click();
    await expect(page.getByTestId("retention-useful-updates")).toBeVisible();
    await expect(page.getByTestId("retention-useful-updates")).not.toBeChecked();
    await expect(page.getByText(/Unsubscribe anytime/i)).toBeVisible();
  });

  test("MyTap Manage this Card + single Open Card", async ({ page }) => {
    const email = `retention-${Date.now()}@example.com`;
    const keep = await page.request.post(`${BASE}/api/tapsave/keep`, {
      data: {
        businessId: process.env.SEED_BUSINESS_ID ?? "cms1caza70000gh9kt7ev6nm0",
        email,
        consentGiven: false,
        name: "Retention Tester",
        deviceSlotId: process.env.SEED_DEVICE_SLOT_ID ?? "cms1cazby000bgh9kkuwlcnya",
      },
    });
    const json = await keep.json();
    expect(json.ok).toBeTruthy();
    const path =
      json.myTapUrl || json.myTapPath || (json.publicToken ? `/mytap/${json.publicToken}` : null);
    expect(path).toBeTruthy();

    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("mytap-home")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("mytap-open-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Reopen Card" })).toHaveCount(0);
    await expect(page.getByTestId("manage-this-card")).toBeVisible();
    await page.getByTestId("manage-this-card").click();
    await expect(page.getByTestId("manage-card-sheet")).toBeVisible();
    await expect(page.getByTestId("manage-homescreen")).toBeVisible();
    await expect(page.getByTestId("manage-wallet")).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Mock pass issued/i);
    expect(body).toMatch(/Your saved Card|Open Card|Manage this Card/i);
  });
});

test.describe("retention device recommendation", () => {
  test.skip(!headed, "Set PROOF_HEADED=1 for headed retention proofs");

  test("iPhone UA recommends Home Screen when Wallet is preview", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/t/seeddemo01?public=1`, { waitUntil: "networkidle" });
    await page.getByTestId("keep-this-card").click();
    const chooser = page.getByTestId("retention-chooser");
    await expect(chooser).toBeVisible({ timeout: 15_000 });
    await expect(chooser).toHaveAttribute("data-primary-method", "homescreen");
    await context.close();
  });

  test("desktop UA recommends Email me this Card", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/t/seeddemo01?public=1`, { waitUntil: "networkidle" });
    await page.getByTestId("keep-this-card").click();
    const chooser = page.getByTestId("retention-chooser");
    await expect(chooser).toBeVisible({ timeout: 15_000 });
    await expect(chooser).toHaveAttribute("data-primary-method", "email_card");
    await expect(page.getByTestId("retention-method-show_qr")).toBeVisible();
    await context.close();
  });
});
