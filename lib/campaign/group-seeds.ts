export type GroupSeedPack =
  | "none"
  | "general"
  | "hospitality"
  | "salon"
  | "wedding"
  | "home_services";

export const GROUP_SEED_OPTIONS: {
  id: GroupSeedPack;
  label: string;
  blurb: string;
}[] = [
  { id: "none", label: "Empty group", blurb: "Add your own timed pages" },
  {
    id: "general",
    label: "General business",
    blurb: "Weekday offer + weekend promo + welcome default",
  },
  {
    id: "hospitality",
    label: "Restaurant / bar / venue",
    blurb: "Weeknight special + daytime promo + house welcome",
  },
  {
    id: "salon",
    label: "Salon / spa",
    blurb: "Color weekdays + weekend package + booking welcome",
  },
  {
    id: "wedding",
    label: "Wedding / events",
    blurb: "Consult hours + weekend showcase + inquiry default",
  },
  {
    id: "home_services",
    label: "Home / landscaping / trades",
    blurb: "Seasonal weekday offer + weekend estimate + welcome",
  },
];
