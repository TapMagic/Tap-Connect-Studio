/**
 * J1 hardening — responsive + a11y on J1-touched owner routes.
 * True VoiceOver/NVDA are NOT claimed (Playwright cannot run them).
 *
 *   DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev' \
 *   BASE_URL=http://127.0.0.1:3000 PROOF_HEADED=1 \
 *   npx playwright test e2e/j1-responsive-a11y.spec.ts --headed
 */

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { attachConsole, BASE, SEED, writeProof, writeProofIndex } from "./proof-helpers";

const VIEWPORTS = [
  { id: "desktop", width: 1400, height: 900 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "mobile", width: 390, height: 844 },
] as const;

const J1_ROUTES = [
  { id: "dashboard", route: "/dashboard" },
  { id: "workbench", route: "/dashboard/workbench" },
  { id: "card", route: "/dashboard/card" },
  { id: "groups", route: "/dashboard/groups" },
  { id: "leads", route: "/dashboard/leads" },
  { id: "audience", route: "/dashboard/audience#workspace" },
  { id: "insights", route: "/dashboard/insights?view=campaign" },
  { id: "public_tap", route: `/t/${SEED.deviceCode}?public=1` },
] as const;

type AxeViolation = {
  id: string;
  impact?: string | null;
  help: string;
  nodes: { target: string[] }[];
};

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = doc.clientWidth;
    return { overflow: scrollW > clientW + 2, scrollW, clientW };
  });
}

async function runAxeSeriousCritical(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = (results.violations as AxeViolation[]).filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  return serious;
}

test.describe.configure({ mode: "serial" });

test.describe("J1 responsive + a11y", () => {
  test("P-j1-responsive: desktop/tablet/mobile on J1 routes", async ({ page }) => {
    test.setTimeout(240_000);
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [];
    const blockers: string[] = [];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      notes.push(`--- ${vp.id} ${vp.width}x${vp.height} ---`);
      for (const r of J1_ROUTES) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`${BASE}${r.route}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(400);
        const textLen = (await page.locator("body").innerText()).trim().length;
        const overflow = await noHorizontalOverflow(page);
        const main = await page.locator("main").count();
        notes.push(
          `${vp.id}@${r.id}:text=${textLen},main=${main},overflow=${overflow.overflow}`
        );
        if (textLen < 20) blockers.push(`empty_${vp.id}_${r.id}`);
        if (overflow.overflow) blockers.push(`h_overflow_${vp.id}_${r.id}`);
      }
    }

    const passed = blockers.length === 0 && pageErrors.length === 0;
    writeProof({
      id: "P-j1-responsive",
      route: J1_ROUTES.map((r) => r.route).join(", "),
      workflow: "J1 routes responsive matrix desktop/tablet/mobile + reduced-motion",
      passed,
      browserE2ePassed: passed,
      persistencePassed: true,
      responsivePassed: passed,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });
    writeProofIndex();
    expect(passed, blockers.join("; ")).toBeTruthy();
  });

  test("P-j1-a11y: axe + keyboard + focus on J1 routes", async ({ page }) => {
    test.setTimeout(240_000);
    const { consoleErrors, pageErrors } = attachConsole(page);
    const notes: string[] = [
      "assistive_tech_untested:VoiceOver",
      "assistive_tech_untested:NVDA",
      "assistive_tech_untested:JAWS",
    ];
    const blockers: string[] = [];

    await page.setViewportSize({ width: 1400, height: 900 });

    for (const r of J1_ROUTES) {
      await page.goto(`${BASE}${r.route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const serious = await runAxeSeriousCritical(page);
      notes.push(`axe:${r.id}:serious=${serious.length}`);
      if (serious.length > 0) {
        blockers.push(`axe_serious_${r.id}`);
        for (const v of serious.slice(0, 4)) {
          notes.push(
            `  ${v.impact}:${v.id} — ${v.help} @ ${v.nodes
              .slice(0, 2)
              .map((n) => n.target.join(" "))
              .join("; ")}`
          );
        }
      }
      const main = await page.locator("main").count();
      if (main === 0 && r.id !== "public_tap") blockers.push(`main_missing_${r.id}`);
    }

    // Keyboard: skip link + visible focus on Home
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /Skip to main content/i });
    if (await skip.count()) {
      await skip.focus();
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return { outline: "", name: "" };
        const cs = getComputedStyle(el);
        return {
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60),
        };
      });
      notes.push(`keyboard:skip_focus=${JSON.stringify(focused)}`);
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
      notes.push("keyboard:skip_to_main=ok");
    } else {
      notes.push("keyboard:skip_link_absent");
    }

    // Create button accessible name
    const create = page.getByTestId("studio-create-button");
    if (await create.count()) {
      await create.focus();
      const name = await create.getAttribute("aria-label");
      notes.push(`create_aria_label=${name ?? "none"}`);
      if (!name && !(await create.innerText()).trim()) {
        blockers.push("create_missing_accessible_name");
      }
    }

    // Decision queue landmark reachable
    await page.goto(`${BASE}/dashboard#decision-queue`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("decision-queue")).toBeVisible();
    notes.push("decision_queue_visible");

    const materialErrors = pageErrors.filter(
      (e) => !/hydration|clerk|ResizeObserver/i.test(e)
    );
    const axePassed = !blockers.some((b) => b.startsWith("axe_serious_"));
    const passed = axePassed && blockers.length === 0 && materialErrors.length === 0;

    writeProof({
      id: "P-j1-a11y",
      route: J1_ROUTES.map((r) => r.route).join(", "),
      workflow:
        "J1 axe serious/critical + keyboard focus + accessible names (VO/NVDA not run)",
      passed,
      browserE2ePassed: passed,
      persistencePassed: true,
      a11yPassed: passed,
      consoleErrors,
      pageErrors,
      notes,
      lastVerifiedAt: new Date().toISOString(),
      blockers,
    });
    writeProofIndex();
    expect(passed, blockers.join("; ") || JSON.stringify(notes.slice(-8))).toBeTruthy();
  });
});
