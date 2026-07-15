export type LogoDevTheme = "auto" | "light" | "dark";

export type LogoSearchHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  source: "logo_dev" | "wikimedia" | "favicon" | "duckduckgo" | "domain";
  domain?: string;
};

export type LogoSearchOptions = {
  theme?: LogoDevTheme;
  greyscale?: boolean;
  size?: number;
};

function normalizeDomain(raw: string): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;

  try {
    const withProto = q.includes("://") ? q : `https://${q}`;
    const host = new URL(withProto).hostname.replace(/^www\./, "");
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

function brandSlug(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/[^a-z0-9.-]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function domainCandidates(query: string): string[] {
  const out = new Set<string>();
  const domain = normalizeDomain(query);
  if (domain) out.add(domain);

  const slug = query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/[^a-z0-9.-]+/g, "");

  if (slug && slug.includes(".")) out.add(slug.replace(/^www\./, ""));

  const brand = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (brand && brand.length >= 2) {
    out.add(`${brand}.com`);
    out.add(`${brand}.io`);
  }

  return Array.from(out).slice(0, 4);
}

function logoDevParams(
  token: string,
  opts: LogoSearchOptions,
  size: number
): string {
  const params = new URLSearchParams({
    token,
    size: String(size),
    format: "png",
    theme: opts.theme || "auto",
    fallback: "404",
  });
  if (opts.greyscale) params.set("greyscale", "true");
  return params.toString();
}

function logoDevDomainUrl(
  domain: string,
  token: string,
  opts: LogoSearchOptions,
  size: number
): string {
  return `https://img.logo.dev/${encodeURIComponent(domain)}?${logoDevParams(token, opts, size)}`;
}

function logoDevNameUrl(
  name: string,
  token: string,
  opts: LogoSearchOptions,
  size: number
): string {
  const slug = brandSlug(name);
  return `https://img.logo.dev/name/${encodeURIComponent(slug)}?${logoDevParams(token, opts, size)}`;
}

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", next: { revalidate: 0 } });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, { method: "GET", next: { revalidate: 0 } });
      return getRes.ok;
    }
    return false;
  } catch {
    return false;
  }
}

function domainHits(
  domain: string,
  logoDevToken: string | undefined,
  opts: LogoSearchOptions
): LogoSearchHit[] {
  const hits: LogoSearchHit[] = [];
  const label = domain;

  if (logoDevToken) {
    hits.push({
      id: `logo-dev-${domain}-${opts.theme || "auto"}-${opts.greyscale ? "g" : "c"}`,
      url: logoDevDomainUrl(domain, logoDevToken, opts, 256),
      thumb: logoDevDomainUrl(domain, logoDevToken, opts, 128),
      alt: `${label} logo`,
      source: "logo_dev",
      domain,
    });
  }

  hits.push({
    id: `favicon-${domain}`,
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`,
    thumb: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    alt: `${label} favicon`,
    source: "favicon",
    domain,
  });

  hits.push({
    id: `ddg-${domain}`,
    url: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    thumb: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    alt: `${label} icon`,
    source: "duckduckgo",
    domain,
  });

  return hits;
}

async function searchWikimedia(query: string): Promise<LogoSearchHit[]> {
  const q = `${query.trim()} logo`.replace(/\s+/g, " ");
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: q,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|thumburl|mime",
    iiurlwidth: "256",
    origin: "*",
  });

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            pageid: number;
            title: string;
            imageinfo?: { thumburl?: string; url?: string; mime?: string }[];
          }
        >;
      };
    };

    const pages = data.query?.pages ?? {};
    const hits: LogoSearchHit[] = [];

    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      const url = info?.url;
      const thumb = info?.thumburl || url;
      const mime = info?.mime ?? "";
      if (!url || !thumb) continue;
      if (!mime.startsWith("image/")) continue;

      hits.push({
        id: `wiki-${page.pageid}`,
        url,
        thumb,
        alt: page.title.replace(/^File:/, "").replace(/_/g, " "),
        source: "wikimedia",
      });
    }

    return hits;
  } catch {
    return [];
  }
}

export async function searchLogosAndIcons(
  query: string,
  opts: LogoSearchOptions = {}
): Promise<LogoSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const logoDevToken = process.env.LOGO_DEV_TOKEN?.trim();
  const byId = new Map<string, LogoSearchHit>();
  const options: LogoSearchOptions = {
    theme: opts.theme || "auto",
    greyscale: Boolean(opts.greyscale),
  };

  function add(hit: LogoSearchHit) {
    if (!hit.url || byId.has(hit.id)) return;
    byId.set(hit.id, hit);
  }

  // Prefer Logo.dev name lookup for brand queries (no domain needed)
  if (logoDevToken && !normalizeDomain(trimmed)) {
    const name = brandSlug(trimmed) || trimmed;
    add({
      id: `logo-dev-name-${name}-${options.theme}-${options.greyscale ? "g" : "c"}`,
      url: logoDevNameUrl(name, logoDevToken, options, 256),
      thumb: logoDevNameUrl(name, logoDevToken, options, 128),
      alt: `${trimmed} logo`,
      source: "logo_dev",
    });
  }

  for (const domain of domainCandidates(trimmed)) {
    for (const hit of domainHits(domain, logoDevToken, options)) {
      add(hit);
    }
  }

  const wiki = await searchWikimedia(trimmed);
  for (const hit of wiki) add(hit);

  const validated: LogoSearchHit[] = [];
  for (const hit of byId.values()) {
    if (hit.source === "wikimedia" || hit.source === "logo_dev") {
      validated.push(hit);
      continue;
    }
    if (hit.source === "favicon" || hit.source === "duckduckgo" || hit.source === "domain") {
      const ok = await urlExists(hit.url);
      if (ok) validated.push(hit);
    }
  }

  // Logo.dev hits first
  validated.sort((a, b) => {
    const rank = (s: LogoSearchHit["source"]) =>
      s === "logo_dev" ? 0 : s === "wikimedia" ? 1 : 2;
    return rank(a.source) - rank(b.source);
  });

  return validated.slice(0, 24);
}

/** Rebuild a Logo.dev URL with new theme / greyscale (client-safe helper). */
export function applyLogoDevAppearance(
  url: string,
  opts: { theme?: LogoDevTheme; greyscale?: boolean }
): string {
  if (!url.includes("img.logo.dev")) return url;
  try {
    const u = new URL(url);
    if (opts.theme) u.searchParams.set("theme", opts.theme);
    if (opts.greyscale) u.searchParams.set("greyscale", "true");
    else u.searchParams.delete("greyscale");
    if (!u.searchParams.get("format")) u.searchParams.set("format", "png");
    return u.toString();
  } catch {
    return url;
  }
}
