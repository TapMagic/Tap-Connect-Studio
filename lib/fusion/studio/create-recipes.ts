/**
 * Outcome-oriented Create recipes — plain-language intents that route into
 * real authoring surfaces. Card-first hierarchy; may imply multi-step journeys
 * without inventing objects.
 */

export type CreateRecipe = {
  id: string;
  /** Host-facing outcome label */
  label: string;
  /** One sentence why / what happens */
  description: string;
  /** Primary destination */
  href: string;
  /** Plain-language next steps after landing */
  nextSteps: string[];
  group: "Start" | "Grow" | "Operate" | "Advanced";
};

export const CREATE_RECIPES: CreateRecipe[] = [
  {
    id: "recipe_card",
    label: "Build my customer Card",
    description: "Create or improve the living relationship hub people see when they tap.",
    href: "/dashboard/card",
    nextSteps: [
      "Add your logo and contact actions",
      "Preview on the phone frame",
      "Assign it to a Tap Point when ready",
    ],
    group: "Start",
  },
  {
    id: "recipe_campaign",
    label: "Promote something",
    description: "Start a Campaign that can Spotlight on the Card or take over a Tap Point.",
    href: "/dashboard/workbench",
    nextSteps: [
      "Pick a template or blank canvas",
      "Add offer or lead-capture blocks",
      "Publish, then bind Spotlight or assign devices",
    ],
    group: "Start",
  },
  {
    id: "recipe_email",
    label: "Prepare an Email",
    description: "Email lives on campaigns — prepare a return path (no live send in this wave).",
    href: "/dashboard/campaigns",
    nextSteps: [
      "Open or create a campaign",
      "Use the Email workspace",
      "Check Email & Replies readiness under Integrations",
    ],
    group: "Start",
  },
  {
    id: "recipe_tap_point",
    label: "Connect a Tap Point",
    description: "Register a device or NFC slot so taps reach your Card experience.",
    href: "/dashboard/devices#create",
    nextSteps: [
      "Create the device slot",
      "Assign a live campaign or card",
      "Test with Scan Mode",
    ],
    group: "Start",
  },
  {
    id: "recipe_card_offer",
    label: "Bring customers back",
    description:
      "Autopilot prepares a measurable Card Spotlight offer from Campaign and Brand — review locally.",
    href: "/dashboard/card?wire=offer",
    nextSteps: [
      "Prepare your plan with Autopilot (local only)",
      "Answer any missing detail, preview, approve locally",
      "Take manual control when ready to bind or publish",
    ],
    group: "Grow",
  },
  {
    id: "recipe_contacts",
    label: "Collect customer information",
    description: "Open Audience for consent, memory, and eligibility around the Card.",
    href: "/dashboard/audience#workspace",
    nextSteps: [
      "Add a lead form on a campaign if you need new capture",
      "Review consent and suppressions in Settings when sending",
    ],
    group: "Grow",
  },
  {
    id: "recipe_loyalty",
    label: "Start loyalty",
    description: "Create a TapLoop program with earn rules, tiers, and rewards.",
    href: "/dashboard/audience#taploop",
    nextSteps: [
      "Name the program",
      "Set how points are earned",
      "Add a reward members can redeem",
    ],
    group: "Grow",
  },
  {
    id: "recipe_journey",
    label: "Build a journey",
    description: "Open TapFlow to draft triggers, waits, and follow-ups.",
    href: "/dashboard/experiences/journeys",
    nextSteps: [
      "Start or open a draft journey",
      "Simulate before going live",
      "Connect to campaigns and Audience where needed",
    ],
    group: "Grow",
  },
  {
    id: "recipe_insights",
    label: "Review results",
    description: "See taps, conversions, and provenance in Insights.",
    href: "/dashboard/insights",
    nextSteps: ["Pick a date range", "Drill into a KPI", "Act on anything that looks off"],
    group: "Operate",
  },
  {
    id: "recipe_recover",
    label: "Resolve a problem",
    description: "Open the decision queue and outbox recovery path.",
    href: "/dashboard#decision-queue",
    nextSteps: [
      "Read the plain-language alert",
      "Open recovery or fix the linked item",
      "Confirm the alert clears",
    ],
    group: "Operate",
  },
  {
    id: "recipe_labs",
    label: "Advanced / Labs",
    description: "TapCanvas, mock Orders, and other experimental surfaces — demoted from primary Create.",
    href: "/dashboard/experiences",
    nextSteps: ["Open Experiences", "Expand Labs / legacy", "Use only when you need those tools"],
    group: "Advanced",
  },
];

export function recipesByGroup(): Array<{ group: CreateRecipe["group"]; items: CreateRecipe[] }> {
  const order: CreateRecipe["group"][] = ["Start", "Grow", "Operate", "Advanced"];
  return order.map((group) => ({
    group,
    items: CREATE_RECIPES.filter((r) => r.group === group),
  }));
}
