import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PLANS } from "@/lib/plans";

const ROOT = process.cwd();

function source(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

const landing = source("components/marketing/public-experience-landing.tsx");
const pricing = source("app/pricing/page.tsx");
const inventory = source("docs/product/TAPCONNECT_FEATURE_INVENTORY.md");
const presentation = source("docs/product/TAPCONNECT_PRODUCT_PRESENTATION.md");

test("public pricing surfaces consume the enforced plan catalog", () => {
  assert.match(landing, /import \{ PLANS \} from "@\/lib\/plans"/);
  assert.match(pricing, /import \{ PLANS \} from "@\/lib\/plans"/);
  assert.deepEqual(
    PLANS.map(({ name, priceMonthly, activeDeviceLimit, activeCampaignLimit }) => ({
      name,
      priceMonthly,
      activeDeviceLimit,
      activeCampaignLimit,
    })),
    [
      { name: "Basic", priceMonthly: 19, activeDeviceLimit: 1, activeCampaignLimit: 3 },
      { name: "Studio", priceMonthly: 49, activeDeviceLimit: 10, activeCampaignLimit: 10 },
      { name: "Pro", priceMonthly: 99, activeDeviceLimit: 50, activeCampaignLimit: 50 },
      { name: "Growth", priceMonthly: 199, activeDeviceLimit: 150, activeCampaignLimit: 150 },
    ]
  );
});

test("primary acquisition routes use account creation and continuation contracts", () => {
  assert.match(landing, /href="\/sign-up"/);
  assert.match(landing, /data-route-contract="signed-out-account-creation"/);
  assert.match(landing, /href="\/auth\/continue"/);
  assert.match(landing, /data-route-contract="signed-in-continuation"/);
  assert.doesNotMatch(
    landing.match(/function AcquisitionLink[\s\S]*?function LivingCardVisual/)?.[0] ?? "",
    /\/offer\//
  );
});

test("landing, inventory, and presentation preserve the Card and Studio distinction", () => {
  for (const corpus of [landing, inventory, presentation]) {
    assert.match(corpus, /TapConnect is the (?:living )?Card/i);
    assert.match(corpus, /Studio[^.\n]*(?:surround|around)/i);
    assert.match(corpus, /var(?:y|ies) by plan/i);
  }
});

test("public claims explicitly preserve approval, Preview, and sending boundaries", () => {
  const corpus = `${landing}\n${inventory}\n${presentation}`;
  assert.match(corpus, /discovered facts remain (?:suggestions|proposals)/i);
  assert.match(corpus, /Preview does not publish/i);
  assert.match(corpus, /does not (?:send|contact customers)|does not send/i);
  assert.match(corpus, /native (?:appointments|booking)[^\n]*(?:deferred|not)/i);
});

test("unsupported superiority and fabricated proof language remain absent", () => {
  const corpus = `${landing}\n${presentation}`;
  for (const pattern of [
    /\bthe first platform\b/i,
    /\bthe only platform\b/i,
    /\bthe best platform\b/i,
    /\bguaranteed results?\b/i,
    /\btrusted by \d/i,
    /\b\d+% (?:conversion|growth|increase)\b/i,
  ]) {
    assert.doesNotMatch(corpus, pattern);
  }
});

