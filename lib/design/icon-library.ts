/**
 * Searchable icon library for buttons / Tap Connect Card actions.
 * Keys map to SocialGlyph platform ids where possible; others use lucide-style aliases.
 */

export type IconLibraryItem = {
  id: string;
  label: string;
  keywords: string[];
  category:
    | "contact"
    | "social"
    | "commerce"
    | "media"
    | "travel"
    | "actions"
    | "places"
    | "misc";
};

export const ICON_LIBRARY: IconLibraryItem[] = [
  // Contact
  { id: "phone", label: "Phone", keywords: ["call", "tel", "mobile"], category: "contact" },
  { id: "mail", label: "Email", keywords: ["email", "message", "inbox"], category: "contact" },
  { id: "sms", label: "SMS / Text", keywords: ["text", "chat", "message"], category: "contact" },
  { id: "vcard", label: "vCard / Contact", keywords: ["download", "vcf", "card"], category: "contact" },
  { id: "map", label: "Map / Directions", keywords: ["location", "gps", "navigate"], category: "contact" },
  { id: "homescreen", label: "Home Screen", keywords: ["install", "app", "shortcut"], category: "contact" },
  { id: "bookmark", label: "Bookmark", keywords: ["save", "favorite"], category: "contact" },

  // Social
  { id: "instagram", label: "Instagram", keywords: ["ig", "photo", "reels"], category: "social" },
  { id: "facebook", label: "Facebook", keywords: ["fb", "meta"], category: "social" },
  { id: "tiktok", label: "TikTok", keywords: ["video", "short"], category: "social" },
  { id: "snapchat", label: "Snapchat", keywords: ["snap", "ghost"], category: "social" },
  { id: "x", label: "X / Twitter", keywords: ["twitter", "tweet"], category: "social" },
  { id: "youtube", label: "YouTube", keywords: ["video", "watch"], category: "social" },
  { id: "linkedin", label: "LinkedIn", keywords: ["job", "career", "biz"], category: "social" },
  { id: "whatsapp", label: "WhatsApp", keywords: ["chat", "wa"], category: "social" },
  { id: "threads", label: "Threads", keywords: ["meta", "text"], category: "social" },
  { id: "pinterest", label: "Pinterest", keywords: ["pin", "ideas"], category: "social" },
  { id: "yelp", label: "Yelp", keywords: ["review", "restaurant"], category: "social" },
  { id: "spotify", label: "Spotify", keywords: ["music", "audio"], category: "social" },

  // Commerce / booking
  { id: "cart", label: "Shop / Cart", keywords: ["buy", "store", "ecommerce"], category: "commerce" },
  { id: "square", label: "Square / Pay", keywords: ["pay", "payment", "checkout", "trade"], category: "commerce" },
  { id: "calendar", label: "Calendar / Book", keywords: ["schedule", "appointment", "booking"], category: "commerce" },
  { id: "star", label: "Review / Star", keywords: ["rating", "google", "feedback"], category: "commerce" },
  { id: "google", label: "Google", keywords: ["g", "review", "maps"], category: "commerce" },
  { id: "review", label: "Review", keywords: ["google", "feedback", "rating"], category: "commerce" },
  { id: "tag", label: "Offer / Tag", keywords: ["deal", "sale", "coupon", "discount"], category: "commerce" },
  { id: "gift", label: "Gift", keywords: ["present", "reward"], category: "commerce" },
  { id: "ticket", label: "Ticket", keywords: ["event", "pass"], category: "commerce" },
  { id: "wallet", label: "Wallet", keywords: ["pay", "money", "cash"], category: "commerce" },

  // Media
  { id: "play", label: "Play / Video", keywords: ["watch", "media", "stream"], category: "media" },
  { id: "camera", label: "Camera", keywords: ["photo", "picture"], category: "media" },
  { id: "music", label: "Music", keywords: ["audio", "song"], category: "media" },
  { id: "mic", label: "Microphone", keywords: ["podcast", "speak"], category: "media" },
  { id: "image", label: "Image / Gallery", keywords: ["photo", "pictures"], category: "media" },

  // Travel / places
  { id: "globe", label: "Website / Globe", keywords: ["web", "www", "internet", "link"], category: "travel" },
  { id: "link", label: "Link", keywords: ["url", "external", "web"], category: "travel" },
  { id: "external", label: "External link", keywords: ["open", "new tab"], category: "travel" },
  { id: "pin", label: "Pin / Place", keywords: ["location", "store"], category: "places" },
  { id: "building", label: "Building", keywords: ["office", "business", "store"], category: "places" },
  { id: "home", label: "Home", keywords: ["house", "property"], category: "places" },
  { id: "car", label: "Car / Drive", keywords: ["auto", "uber", "ride"], category: "travel" },
  { id: "plane", label: "Travel / Plane", keywords: ["flight", "trip"], category: "travel" },
  { id: "coffee", label: "Coffee / Cafe", keywords: ["food", "drink"], category: "places" },
  { id: "utensils", label: "Restaurant", keywords: ["food", "dining", "eat"], category: "places" },
  { id: "scissors", label: "Salon / Cut", keywords: ["hair", "barber", "beauty"], category: "places" },
  { id: "heart", label: "Heart / Love", keywords: ["favorite", "health", "care"], category: "misc" },
  { id: "sparkles", label: "Sparkles / Magic", keywords: ["special", "new", "glow"], category: "misc" },
  { id: "zap", label: "Zap / Energy", keywords: ["fast", "power", "electric"], category: "misc" },
  { id: "shield", label: "Shield / Trust", keywords: ["secure", "safe", "warranty"], category: "misc" },
  { id: "users", label: "People / Team", keywords: ["group", "community"], category: "misc" },
  { id: "user", label: "Person", keywords: ["profile", "account"], category: "misc" },
  { id: "clock", label: "Clock / Hours", keywords: ["time", "open"], category: "actions" },
  { id: "download", label: "Download", keywords: ["save", "file"], category: "actions" },
  { id: "share", label: "Share", keywords: ["send", "forward"], category: "actions" },
  { id: "qr", label: "QR Code", keywords: ["scan", "code"], category: "actions" },
  { id: "nfc", label: "NFC / Tap", keywords: ["tap", "wireless", "contactless"], category: "actions" },
  { id: "bell", label: "Bell / Alerts", keywords: ["notify", "reminder"], category: "actions" },
  { id: "chat", label: "Chat", keywords: ["message", "support"], category: "actions" },
  { id: "help", label: "Help / FAQ", keywords: ["support", "question"], category: "actions" },
  { id: "info", label: "Info", keywords: ["about", "details"], category: "actions" },
  { id: "check", label: "Check / Done", keywords: ["ok", "success", "confirm"], category: "actions" },
  { id: "plus", label: "Plus / Add", keywords: ["new", "create"], category: "actions" },
  { id: "settings", label: "Settings", keywords: ["gear", "prefs"], category: "actions" },
  { id: "key", label: "Key / Access", keywords: ["vip", "login", "password"], category: "actions" },
  { id: "crown", label: "VIP / Crown", keywords: ["premium", "membership"], category: "commerce" },
  { id: "paw", label: "Pet / Paw", keywords: ["dog", "cat", "animal"], category: "misc" },
  { id: "leaf", label: "Leaf / Eco", keywords: ["green", "nature"], category: "misc" },
  { id: "dumbbell", label: "Fitness", keywords: ["gym", "workout"], category: "places" },
  { id: "stethoscope", label: "Medical", keywords: ["doctor", "health", "clinic"], category: "places" },
  { id: "graduation", label: "Education", keywords: ["school", "learn", "course"], category: "places" },
  { id: "briefcase", label: "Work / Services", keywords: ["business", "job"], category: "commerce" },
  { id: "handshake", label: "Partner / Deal", keywords: ["agree", "collab"], category: "commerce" },
];

export function searchIconLibrary(query: string, limit = 48): IconLibraryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_LIBRARY.slice(0, limit);
  const scored = ICON_LIBRARY.map((item) => {
    const hay = `${item.id} ${item.label} ${item.keywords.join(" ")} ${item.category}`.toLowerCase();
    let score = 0;
    if (item.id === q) score += 100;
    if (item.label.toLowerCase().startsWith(q)) score += 50;
    if (hay.includes(q)) score += 20;
    for (const part of q.split(/\s+/)) {
      if (hay.includes(part)) score += 5;
    }
    return { item, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.item);
}

export const ICON_CATEGORIES = [
  "contact",
  "social",
  "commerce",
  "media",
  "travel",
  "places",
  "actions",
  "misc",
] as const;
