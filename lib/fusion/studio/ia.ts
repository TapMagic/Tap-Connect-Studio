/**
 * Final Studio IA — seven permanent destinations.
 * Map all V1 routes without losing capability.
 */

export type StudioNavItem = {
  id: string;
  label: string;
  href: string;
  /** Legacy V1 hrefs that fold into this destination */
  aliases: string[];
  description: string;
};

export const STUDIO_NAV: StudioNavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    aliases: ["/dashboard"],
    description: "Overview, onboarding, Automation Team entry",
  },
  {
    id: "experiences",
    label: "Experiences",
    href: "/dashboard/experiences",
    aliases: [
      "/dashboard/workbench",
      "/dashboard/campaigns",
      "/dashboard/card",
      "/dashboard/groups",
    ],
    description: "Cards, Campaigns, Groups, Workbench, Journeys",
  },
  {
    id: "tap_points",
    label: "Tap Points",
    href: "/dashboard/tap-points",
    aliases: ["/dashboard/devices", "/dashboard/scan"],
    description: "Devices, Tap Points, Sets, Rotations, Scan Mode",
  },
  {
    id: "audience",
    label: "Audience",
    href: "/dashboard/audience",
    aliases: ["/dashboard/leads"],
    description: "Contacts, TapSave, Inbox, Email, Loyalty",
  },
  {
    id: "insights",
    label: "Insights",
    href: "/dashboard/insights",
    aliases: ["/dashboard/analytics"],
    description: "Analytics, TapProof, multi-view intelligence",
  },
  {
    id: "assets",
    label: "Assets",
    href: "/dashboard/assets",
    aliases: ["/dashboard/brand"],
    description: "Brand Kit, media, templates, packs",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    aliases: ["/dashboard/integrations", "/dashboard/billing"],
    description: "Workspace admin, providers, plans, features",
  },
];

/** Compatibility: keep V1 routes working while IA migrates */
export function resolveStudioDestination(pathname: string): StudioNavItem {
  for (const item of STUDIO_NAV) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) return item;
    for (const alias of item.aliases) {
      if (pathname === alias || pathname.startsWith(alias + "/")) return item;
    }
  }
  return STUDIO_NAV[0];
}
