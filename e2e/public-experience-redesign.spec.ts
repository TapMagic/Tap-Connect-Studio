import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { BASE } from "./proof-helpers";

const OUT = path.join(process.cwd(), "tmp", "public-experience-redesign");

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

async function capture(
  page: import("@playwright/test").Page,
  name: string,
  fullPage = true
) {
  ensureOut();
  await page.screenshot({ path: path.join(OUT, name), fullPage });
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    )
  ).toBe(true);
}

test.describe("TapConnect public experience redesign", () => {
  test("communicates the living Card and Card-first acquisition promise", async ({ page }) => {
    await page.goto(`${BASE}/`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your business, ready to tap."
    );
    await expect(page.getByTestId("living-card-visual")).toBeVisible();
    await expect(page.getByTestId("onboarding-journey")).toContainText(
      "Tell us about your business"
    );
    await expect(page.getByTestId("onboarding-journey")).toContainText("We found your Brand");
    await expect(page.getByTestId("onboarding-journey")).toContainText(
      "Here is your first Card"
    );
    await expect(page.getByTestId("tapsave-section")).toContainText(
      "relationship does not have to end"
    );
    await expect(page.getByTestId("autopilot-section")).toContainText(
      "does not invent approved facts"
    );
    await expect(page.getByTestId("creative-platform-section")).toContainText(
      "Create once. Stay on Brand. Reuse the work."
    );
    await expect(page.getByTestId("trust-section")).toContainText(
      "Preview is not public"
    );
    await expect(page.getByTestId("faq-section")).toBeVisible();

    const primary = page.getByTestId("landing-primary-cta");
    await expect(primary).toHaveText(/Create my first Card/);
    await expect(primary).toHaveAttribute(
      "data-route-contract",
      /signed-out-account-creation|signed-in-continuation|development-continuation/
    );
    await expect(primary).toHaveAttribute("href", /\/sign-up|\/auth\/continue/);
  });

  test("pricing is rendered from the enforced plan catalog", async ({ page }) => {
    await page.goto(`${BASE}/#pricing`);
    for (const [tier, price, devices, campaigns] of [
      ["basic", "$19", "1", "3"],
      ["studio", "$49", "10", "10"],
      ["pro", "$99", "50", "50"],
      ["growth", "$199", "150", "150"],
    ] as const) {
      const card = page.getByTestId(`public-plan-${tier}`);
      await expect(card).toContainText(price);
      await expect(card).toContainText(devices);
      await expect(card).toContainText(campaigns);
    }

    await page.goto(`${BASE}/pricing`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "living Card first"
    );
    await expect(page.getByTestId("pricing-plan-basic")).toContainText("$19");
    await expect(page.getByTestId("pricing-plan-growth")).toContainText("$199");
  });

  for (const viewport of [
    { width: 390, height: 844, name: "390-mobile" },
    { width: 834, height: 1112, name: "tablet" },
    { width: 1280, height: 800, name: "1280-desktop" },
    { width: 1440, height: 900, name: "1440-desktop" },
    { width: 1920, height: 1080, name: "wide-desktop" },
  ]) {
    test(`${viewport.name} is composed without clipping or logo/navigation overlap`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE}/`);
      await expect(page.getByTestId("public-header")).toBeVisible();
      await expect(page.getByTestId("living-card-visual")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const brand = page.locator(".public-brand-zone");
      const brandBox = await brand.boundingBox();
      expect(brandBox).not.toBeNull();

      if (viewport.width >= 1024) {
        const nav = page.locator(".public-desktop-nav");
        const navBox = await nav.boundingBox();
        expect(navBox).not.toBeNull();
        expect((brandBox?.x ?? 0) + (brandBox?.width ?? 0)).toBeLessThanOrEqual(
          (navBox?.x ?? 0) + 1
        );
      } else {
        const menuButton = page.getByRole("button", { name: "Open navigation" });
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
        await expect(page.getByTestId("mobile-nav-primary-cta")).toBeVisible();
      }

      await capture(page, `${viewport.name}.png`);
    });
  }

  test("keyboard order and visible focus reach navigation and acquisition", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/`);

    await page.keyboard.press("Tab");
    await expect(page.getByText("Skip to content")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();

    await page.getByRole("link", { name: "TapConnect home" }).focus();
    await expect(page.getByRole("link", { name: "TapConnect home" })).toBeFocused();
    await page.keyboard.press("Tab");
    const headerHowLink = page
      .getByTestId("public-header")
      .getByRole("link", { name: "How it works" });
    await expect(headerHowLink).toBeFocused();

    const focusOutline = await headerHowLink.evaluate(
      (element) => getComputedStyle(element).outlineStyle
    );
    expect(focusOutline).not.toBe("none");
  });

  test("reduced motion keeps the complete visual story without active choreography", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${BASE}/`);

    await expect(page.getByTestId("living-card-visual")).toBeVisible();
    await expect(page.getByTestId("onboarding-journey")).toBeVisible();
    const animationNames = await page.evaluate(() =>
      [
        ".public-tap-origin__ring",
        ".public-signal-line::after",
        ".public-living-card",
      ].map((selector) => {
        if (selector.includes("::")) {
          const [base, pseudo] = selector.split("::");
          const element = document.querySelector(base);
          return element ? getComputedStyle(element, `::${pseudo}`).animationName : "missing";
        }
        const element = document.querySelector(selector);
        return element ? getComputedStyle(element).animationName : "missing";
      })
    );
    expect(animationNames).toEqual(["none", "none", "none"]);
    await capture(page, "reduced-motion.png");
  });

  test("axe reports zero WCAG A/AA violations at desktop, tablet, and mobile", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1440, height: 900, name: "desktop" },
      { width: 834, height: 1112, name: "tablet" },
      { width: 390, height: 844, name: "mobile" },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${BASE}/`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        results.violations,
        `${viewport.name}: ${results.violations.map((violation) => violation.id).join(", ")}`
      ).toEqual([]);
    }
  });

  test("representative performance audit avoids heavy media and layout shift", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as typeof window & { __publicCls?: number }).__publicCls = 0;
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) {
            (window as typeof window & { __publicCls?: number }).__publicCls =
              ((window as typeof window & { __publicCls?: number }).__publicCls ?? 0) +
              shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`);
    await page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    const audit = await page.evaluate(() => {
      const resources = performance
        .getEntriesByType("resource")
        .map((entry) => {
          const resource = entry as PerformanceResourceTiming;
          return {
            name: resource.name,
            initiatorType: resource.initiatorType,
            transferSize: resource.transferSize,
            encodedBodySize: resource.encodedBodySize,
          };
        });
      return {
        cls: (window as typeof window & { __publicCls?: number }).__publicCls ?? 0,
        resourceCount: resources.length,
        scriptBytes: resources
          .filter((resource) => resource.initiatorType === "script")
          .reduce((sum, resource) => sum + resource.transferSize, 0),
        largestResourceBytes: Math.max(
          0,
          ...resources.map((resource) => resource.encodedBodySize)
        ),
        heavyMedia: resources
          .map((resource) => resource.name)
          .filter((name) => /\.(?:mp4|webm|mov)(?:\?|$)/i.test(name)),
      };
    });

    ensureOut();
    fs.writeFileSync(
      path.join(OUT, "performance-audit.json"),
      `${JSON.stringify(audit, null, 2)}\n`
    );
    expect(audit.heavyMedia).toEqual([]);
    expect(audit.cls).toBeLessThanOrEqual(0.1);
    expect(audit.largestResourceBytes).toBeLessThan(1_500_000);
  });

  test("public routes and navigation anchors remain reachable", async ({ page, request }) => {
    for (const route of ["/", "/pricing", "/sign-in", "/sign-up"]) {
      const response = await request.get(`${BASE}${route}`, { maxRedirects: 0 });
      expect([200, 302, 307, 308]).toContain(response.status());
    }

    await page.goto(`${BASE}/`);
    await page.getByTestId("public-header").getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await page.goBack();
    await expect(page).toHaveURL(`${BASE}/`);
  });
});

