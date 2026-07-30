import fixture from "./fixtures/logo-dev.json";
import {
  searchLogosAndIcons,
  type LogoDevTheme,
  type LogoSearchHit,
} from "@/lib/services/logo-search";
import {
  providerFixtureModeEnabled,
  type ProviderCandidate,
  type ProviderSearchFailure,
  type ProviderSearchResult,
} from "./types";

export type LogoDevSearchInput = {
  query: string;
  theme?: LogoDevTheme;
  greyscale?: boolean;
};

type FixtureScenario = "success" | "empty" | "unavailable" | "outage";

export type LogoDevProviderOptions = {
  configured?: boolean;
  fixture?: boolean;
  fixtureScenario?: FixtureScenario;
  searchImpl?: typeof searchLogosAndIcons;
};

function failure(
  code: ProviderSearchFailure["code"],
  status: number,
  message: string
): ProviderSearchFailure {
  return { ok: false, provider: "logo_dev", code, status, message };
}

function normalizeLogoDevHit(
  hit: LogoSearchHit,
  input: Required<Pick<LogoDevSearchInput, "theme" | "greyscale">>
): ProviderCandidate {
  const descriptor: Record<string, string | number | boolean> = hit.domain
    ? { domain: hit.domain }
    : { name: hit.providerId || hit.alt.replace(/\s+logo$/i, "") };
  return {
    provider: "logo_dev",
    providerAssetId: hit.providerId || hit.id,
    previewUrl: hit.url,
    thumbnailUrl: hit.thumb,
    altText: hit.alt,
    sourcePageUrl: hit.sourceUrl || "https://www.logo.dev/",
    width: hit.width || 256,
    height: hit.height || 256,
    mimeType: "image/png",
    licenseCode: "NO_LICENSE_ASSERTED",
    attributionText: "Logo discovered through Logo.dev",
    rightsNote:
      "Logo.dev is the discovery source. Trademark and usage rights remain with the brand owner; Owner approval is required.",
    importDescriptor: {
      ...descriptor,
      theme: input.theme,
      greyscale: input.greyscale,
      size: 512,
    },
    treatment: { theme: input.theme, greyscale: input.greyscale },
  };
}

function fixtureResult(
  input: Required<Pick<LogoDevSearchInput, "theme" | "greyscale">>,
  scenario: FixtureScenario
): ProviderSearchResult {
  if (scenario === "unavailable") {
    return failure("not_configured", 503, "Logo.dev is not configured.");
  }
  if (scenario === "outage") {
    return failure("outage", 503, "Logo.dev is temporarily unavailable.");
  }

  const candidates =
    scenario === "empty"
      ? []
      : fixture.results.map((result) => {
          return normalizeLogoDevHit(
            {
              id: result.id,
              url: "/tap-connect-logo.png",
              thumb: "/tap-connect-logo.png",
              alt: `${result.name} logo`,
              source: "logo_dev",
              domain: result.domain,
              sourceUrl: result.sourcePageUrl,
              providerId: result.domain || result.name,
              width: result.width,
              height: result.height,
            },
            input
          );
        });

  return {
    ok: true,
    provider: "logo_dev",
    candidates,
    page: 1,
    nextPage: null,
  };
}

export class LogoDevProvider {
  private readonly configured: boolean;
  private readonly fixture: boolean;
  private readonly fixtureScenario: FixtureScenario;
  private readonly searchImpl: typeof searchLogosAndIcons;

  constructor(options: LogoDevProviderOptions = {}) {
    this.configured = options.configured ?? Boolean(process.env.LOGO_DEV_TOKEN?.trim());
    this.fixture = Boolean(options.fixture);
    this.fixtureScenario = options.fixtureScenario ?? "success";
    this.searchImpl = options.searchImpl ?? searchLogosAndIcons;
  }

  async search(input: LogoDevSearchInput): Promise<ProviderSearchResult> {
    const theme = input.theme || "auto";
    const greyscale = Boolean(input.greyscale);
    if (this.fixture) return fixtureResult({ theme, greyscale }, this.fixtureScenario);
    if (!this.configured) {
      return failure(
        "not_configured",
        503,
        "Logo.dev is unavailable because provider credentials are not configured."
      );
    }

    try {
      const hits = await this.searchImpl(input.query, { theme, greyscale });
      return {
        ok: true,
        provider: "logo_dev",
        candidates: hits
          .filter((hit) => hit.source === "logo_dev")
          .map((hit) => normalizeLogoDevHit(hit, { theme, greyscale })),
        page: 1,
        nextPage: null,
      };
    } catch {
      return failure("outage", 503, "Logo.dev could not be reached.");
    }
  }
}

function fixtureScenarioFromEnvironment(): FixtureScenario {
  const raw = process.env.CREATIVE_PROVIDER_FIXTURE_SCENARIO?.trim().toLowerCase();
  const scenario = raw?.replace(/^logo_dev_/, "");
  return scenario === "empty" || scenario === "unavailable" || scenario === "outage"
    ? scenario
    : "success";
}

export function getLogoDevProvider(): LogoDevProvider {
  const fixtureMode = providerFixtureModeEnabled();
  return new LogoDevProvider({
    configured: Boolean(process.env.LOGO_DEV_TOKEN?.trim()),
    fixture: fixtureMode,
    fixtureScenario: fixtureMode ? fixtureScenarioFromEnvironment() : "success",
  });
}
