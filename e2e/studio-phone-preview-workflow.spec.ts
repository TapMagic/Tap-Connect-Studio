import { expect, test } from "@playwright/test";

const enabled = process.env.PHONE_PREVIEW_ACCEPTANCE === "1";
const LOVE_AND_THEFT_ID = "cmv0dqoi60000zh9k5a7jwhwi";
const MONKEY_CAGE_BUSINESS_ID = "cms8i8omf007zit9k2ca39g2s";

type ExperiencePayload = {
  document: {
    draft: Record<string, unknown>;
    draftRevision: number;
    publicationActive: boolean;
    currentPublicationSnapshotId: string | null;
  };
};

function sessionAuthority(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname;
}

test("opens Love & Theft saved Draft on a phone through one temporary preview authority", async ({ browser, page }, testInfo) => {
  test.skip(!enabled, "Set PHONE_PREVIEW_ACCEPTANCE=1 for the isolated Love & Theft phone-preview proof");
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);

  await page.context().addCookies([{
    name: "tapconnect_workspace_id",
    value: MONKEY_CAGE_BUSINESS_ID,
    url: "http://127.0.0.1:3050",
  }]);

  const readExperience = async () => {
    const response = await page.request.get(`/api/experiences/${LOVE_AND_THEFT_ID}`);
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<ExperiencePayload>;
  };
  const baseline = await readExperience();
  const baselineCredentialsResponse = await page.request.get(`/api/experiences/${LOVE_AND_THEFT_ID}/credentials`);
  expect(baselineCredentialsResponse.ok()).toBeTruthy();
  const baselineCredentials = await baselineCredentialsResponse.text();

  let phoneContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;
  try {
    await page.goto(`/dashboard/card/edit?experience=${LOVE_AND_THEFT_ID}&returnTo=%2Fdashboard%2Fexperiences%2Flibrary`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible();
    await expect(page.getByTestId("preview-live-device")).toHaveAccessibleName("Phone Preview");

    await page.getByTestId("studio-pages-open").click();
    await page.getByTestId("studio-page-row-page-music").click();
    await page.getByRole("button", { name: "Close Pages" }).click();

    await page.getByTestId("preview-live-device").click();
    const panel = page.getByTestId("live-device-qr-panel");
    await expect(panel).toHaveAttribute("data-preview-status", "ready", { timeout: 30_000 });
    await expect(page.getByTestId("phone-preview-explainer")).toContainText("current saved Draft");
    await expect(page.getByTestId("phone-preview-explainer")).toContainText("not the public or permanent Experience QR");
    await expect(page.getByTestId("preview-qr-card-name")).toContainText("Love & Theft Sales Demo · Saved Draft");
    await expect(page.getByTestId("phone-preview-entry-current")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("preview-current-page")).toContainText("Opens Music");

    const currentPageUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(new URL(currentPageUrl).searchParams.get("page")).toBe("page-music");
    expect(new URL(currentPageUrl).hostname).not.toMatch(/^(localhost|127\.0\.0\.1)$/);
    const automatedPhoneUrl = new URL(currentPageUrl);
    automatedPhoneUrl.hostname = "127.0.0.1";

    await page.getByTestId("phone-preview-entry-home").click();
    const homeUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(new URL(homeUrl).searchParams.has("page")).toBe(false);
    expect(sessionAuthority(homeUrl)).toBe(sessionAuthority(currentPageUrl));
    await page.getByTestId("phone-preview-entry-current").click();
    await expect(page.getByTestId("preview-url-text")).toHaveAttribute("href", currentPageUrl);

    phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    expect(await phoneContext.cookies()).toEqual([]);
    const phone = await phoneContext.newPage();
    await phone.goto(automatedPhoneUrl.toString(), { waitUntil: "domcontentloaded" });
    const renderer = phone.getByTestId("tap-experience-renderer");
    await expect(renderer).toHaveAttribute("data-active-page-id", "page-music");
    await expect(renderer).toHaveAttribute("data-experience-routing", "history");
    const homeNavigation = phone.getByRole("button", { name: /^Home$/ });
    await expect.poll(() => homeNavigation.evaluate((element) => Object.keys(element).some((key) => key.startsWith("__reactProps$")))).toBe(true);
    await homeNavigation.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(renderer).toHaveAttribute("data-active-page-id", "page-home");
    await phone.goBack({ waitUntil: "domcontentloaded" });
    await expect(renderer).toHaveAttribute("data-active-page-id", "page-music");

    await page.getByRole("button", { name: "Close Live Device Preview" }).click();
    await page.getByTestId("studio-pages-open").click();
    await page.getByTestId("studio-page-row-page-home").click();
    const marker = `Phone ${String(Date.now()).slice(-8)}`;
    await page.getByTestId("studio-page-nav-label").fill(marker);
    await page.getByTestId("studio-page-nav-label").blur();
    await page.getByRole("button", { name: "Close Pages" }).click();
    const save = page.getByTestId("studio-save");
    await expect(save).toBeEnabled();
    const savedResponse = page.waitForResponse((response) =>
      response.request().method() === "PUT"
      && response.url().includes(`/api/card/documents/${LOVE_AND_THEFT_ID}`)
    );
    await save.click();
    expect((await savedResponse).ok()).toBeTruthy();
    await expect(save).toBeDisabled();

    await phone.reload({ waitUntil: "domcontentloaded" });
    await expect(renderer).toContainText(marker);
    expect(sessionAuthority(phone.url())).toBe(sessionAuthority(currentPageUrl));

    await page.getByTestId("preview-live-device").click();
    await expect(panel).toHaveAttribute("data-preview-status", "ready");
    const refreshedUrl = (await page.getByTestId("preview-url-text").getAttribute("href")) || "";
    expect(sessionAuthority(refreshedUrl)).toBe(sessionAuthority(currentPageUrl));
    await page.getByTestId("preview-update-phone").click();
    await expect(panel).toHaveAttribute("data-preview-status", "ready");
    expect(sessionAuthority((await page.getByTestId("preview-url-text").getAttribute("href")) || "")).toBe(sessionAuthority(currentPageUrl));

    await page.getByTestId("preview-revoke").click();
    await expect(panel).toHaveAttribute("data-preview-status", "idle");
    await phone.goto(automatedPhoneUrl.toString(), { waitUntil: "domcontentloaded" });
    await expect(phone.getByRole("heading", { name: "This preview was revoked" })).toBeVisible();
  } finally {
    testInfo.setTimeout(testInfo.timeout + 60_000);
    const current = await readExperience();
    if (current.document.draftRevision !== baseline.document.draftRevision) {
      const restore = await page.request.put(`/api/card/documents/${LOVE_AND_THEFT_ID}`, {
        data: { draft: baseline.document.draft, expectedRevision: current.document.draftRevision },
      });
      expect(restore.ok()).toBeTruthy();
    }
    const restored = await readExperience();
    expect(restored.document.draft).toEqual(baseline.document.draft);
    expect(restored.document.publicationActive).toBe(baseline.document.publicationActive);
    expect(restored.document.currentPublicationSnapshotId).toBe(baseline.document.currentPublicationSnapshotId);
    const credentialsAfter = await page.request.get(`/api/experiences/${LOVE_AND_THEFT_ID}/credentials`);
    expect(credentialsAfter.ok()).toBeTruthy();
    expect(await credentialsAfter.text()).toBe(baselineCredentials);
    await phoneContext?.close();
  }
});
