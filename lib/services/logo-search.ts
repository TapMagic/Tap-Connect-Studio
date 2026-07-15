export type LogoSearchHit = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  source: "logo_dev" | "wikimedia" | "favicon" | "duckduckgo" | "brave" | "domain";
  domain?: string;
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

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", next: { revalidate: 0 } });
    if (res.ok) return true;
    if (res.status === 405) {
      const getRes = await fetch(url, { method: "GET", next: { revalidate: 0 } });
      return getRes.ok;
    }
    return false;
  } catch {
    return false;
  }
}

function domainHits(domain: string, logoDevToken?: string): LogoSearchHit[] {
  const hits: LogoSearchHit[] = [];
  const label = domain;

  if (logoDevToken) {
    hits.push({
      id: `logo-dev-${domain}`,
      url: `https://img.logo.dev/${domain}?token=${logoDevToken}&size=256&format=png`,
      thumb: `https://img.logo.dev/${domain}?token=${logoDevToken}&size=128&format=png`,
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
    gsrlimit: "16",
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
      if (/\.svg$/i.test(url) && !mime.includes("svg")) continue;

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

async function searchBraveImages(query: string, apiKey: string): Promise<LogoSearchHit[]> {
  try {
    const params = new URLSearchParams({
      q: `${query.trim()} logo icon`,
      count: "12",
      search_lang: "en",
      country: "US",
      spellcheck: "1",
    });
    const res = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      results?: { url?: string; thumbnail?: { src?: string }; title?: string }[];
    };

    return (data.results ?? [])
      .filter((r) => r.url && r.thumbnail?.src)
      .map((r, i) => ({
        id: `brave-${i}-${r.url}`,
        url: r.url!,
        thumb: r.thumbnail!.src!,
        alt: r.title || query,
        source: "brave" as const,
      }));
  } catch {
    return [];
  }
}

export async function searchLogosAndIcons(query: string): Promise<LogoSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const logoDevToken = process.env.LOGO_DEV_TOKEN?.trim();
  const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  const byId = new Map<string, LogoSearchHit>();

  function add(hit: LogoSearchHit) {
    if (!hit.url || byId.has(hit.id)) return;
    byId.set(hit.id, hit);
  }

  for (const domain of domainCandidates(trimmed)) {
    for (const hit of domainHits(domain, logoDevToken)) {
      add(hit);
    }
  }

  const wiki = await searchWikimedia(trimmed);
  for (const hit of wiki) add(hit);

  if (braveKey) {
    const brave = await searchBraveImages(trimmed, braveKey);
    for (const hit of brave) add(hit);
  }

  // Validate domain-sourced hits (skip broken favicons)
  const validated: LogoSearchHit[] = [];
  for (const hit of byId.values()) {
    if (hit.source === "wikimedia" || hit.source === "brave" || hit.source === "logo_dev") {
      validated.push(hit);
      continue;
    }
    if (hit.source === "favicon" || hit.source === "duckduckgo" || hit.source === "domain") {
      const ok = await urlExists(hit.url);
      if (ok) validated.push(hit);
    }
  }

  return validated.slice(0, 24);
}
