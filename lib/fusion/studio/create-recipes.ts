/**
 * Outcome-oriented Create recipes — plain-language intents that route into
 * real authoring surfaces. May imply multi-step journeys without inventing objects.
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
  group: "Start" | "Grow" | "Operate";
};

export const CREATE_RECIPES: CreateRecipe[] = [
  {
    id: "recipe_card",
    label: "Create a Card",
    description: "Design the digital card people see when they tap.",
    href: "/dashboard/card",
    nextSteps: [
      "Add your logo and contact actions",
      "Preview on the phone frame",
      "Assign it to a Tap Point when ready",
    ],
    group: "Start",
  },
  {
    id: "recipe_card_offer",
    label: "Put an offer on my Card",
    description:
      "Bind one Campaign offer to Card Spotlight — claim, follow-up, and Insights without rebuilding the offer.",
    href: "/dashboard/card?wire=offer",
    nextSteps: [
      "Bind or create a Campaign offer from the Offer fuse wire",
      "Preview Card, email mock, and TapCast package together",
      "Publish, assign a Tap Point, then claim on the public page",
    ],
    group: "Start",
  },
  {
    id: "recipe_campaign",
    label: "Launch a campaign takeover",
    description:
      "Full campaign page for a Tap Point — use when you need a takeover, not only a Card Spotlight.",
    href: "/dashboard/workbench",
    nextSteps: [
      "Pick a template or blank canvas",
      "Add offer or lead-capture blocks",
      "Publish, then assign to devices",
    ],
    group: "Start",
  },
  {
    id: "recipe_tap_point",
    label: "Set up a Tap Point",
    description: "Register a device or NFC slot so taps reach your experience.",
    href: "/dashboard/devices#create",
    nextSteps: [
      "Create the device slot",
      "Assign a live campaign or card",
      "Test with Scan Mode",
    ],
    group: "Start",
  },
  {
    id: "recipe_contacts",
    label: "Capture and retain contacts",
    description: "Open Audience to review leads, consent, and relationships.",
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
    id: "recipe_email",
    label: "Send an email",
    description: "Email lives on campaigns — open the list, then the email builder.",
    href: "/dashboard/campaigns",
    nextSteps: [
      "Open or create a campaign",
      "Use Email blocks / follow-up",
      "Check email readiness under Settings if send is blocked",
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
];

export function recipesByGroup(): Array<{ group: CreateRecipe["group"]; items: CreateRecipe[] }> {
  const order: CreateRecipe["group"][] = ["Start", "Grow", "Operate"];
  return order.map((group) => ({
    group,
    items: CREATE_RECIPES.filter((r) => r.group === group),
  }));
}
