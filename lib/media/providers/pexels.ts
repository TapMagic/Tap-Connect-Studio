import fixture from "./fixtures/pexels.json";
import {
  PROVIDER_REQUEST_TIMEOUT_MS,
  providerFixtureModeEnabled,
  type ProviderCandidate,
  type ProviderFetch,
  type ProviderSearchFailure,
  type ProviderSearchResult,
} from "./types";

export type PexelsOrientation = "landscape" | "portrait" | "square";

export type PexelsSearchInput = {
  query: string;
  page?: number;
  perPage?: number;
  orientation?: PexelsOrientation;
  color?: string;
};

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { large: string; medium: string };
};

type PexelsResponse = {
  next_page?: string;
  photos?: PexelsPhoto[];
};

type FixtureScenario =
  | "success"
  | "empty"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "outage"
  | "timeout";

export type PexelsProviderOptions = {
  apiKey?: string;
  fetchImpl?: ProviderFetch;
  fixture?: boolean;
  fixtureScenario?: FixtureScenario;
};

const PEXELS_LICENSE_URL = "https://www.pexels.com/license/";
const PEXELS_NAMED_COLORS = new Set([
  "red",
  "orange",
  "yellow",
  "green",
  "turquoise",
  "blue",
  "violet",
  "pink",
  "brown",
  "black",
  "gray",
  "white",
]);

function normalizeColor(value: string | undefined): string | undefined {
  const color = value?.trim().toLowerCase().replace(/^#/, "");
  if (!color) return undefined;
  if (/^[0-9a-f]{6}$/.test(color)) return color;
  return PEXELS_NAMED_COLORS.has(color) ? color : undefined;
}

function failure(
  code: ProviderSearchFailure["code"],
  status: number,
  message: string,
  retryAfterSeconds?: number
): ProviderSearchFailure {
  return {
    ok: false,
    provider: "pexels",
    code,
    status,
    message,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

function normalizePhoto(photo: PexelsPhoto, query: string): ProviderCandidate {
  return {
    provider: "pexels",
    providerAssetId: String(photo.id),
    previewUrl: photo.src.large,
    thumbnailUrl: photo.src.medium,
    altText: photo.alt?.trim() || query,
    sourcePageUrl: photo.url,
    creatorName: photo.photographer,
    creatorUrl: photo.photographer_url,
    width: photo.width,
    height: photo.height,
    mimeType: "image/jpeg",
    licenseCode: "PEXELS",
    licenseUrl: PEXELS_LICENSE_URL,
    attributionText: `Photo by ${photo.photographer} on Pexels`,
    rightsNote: "Imported under the Pexels license; preserve photographer and source attribution.",
    importDescriptor: {
      imageUrl: photo.src.large,
      pexelsId: String(photo.id),
    },
  };
}

function fixtureResult(
  input: PexelsSearchInput,
  scenario: FixtureScenario
): ProviderSearchResult {
  if (scenario === "unauthorized") {
    return failure("unauthorized", 401, "Pexels credentials were rejected.");
  }
  if (scenario === "forbidden") {
    return failure("forbidden", 403, "Pexels access is not authorized for this account.");
  }
  if (scenario === "rate_limited") {
    return failure("rate_limited", 429, "Pexels is temporarily rate-limited.", 30);
  }
  if (scenario === "outage") {
    return failure("outage", 503, "Pexels is temporarily unavailable.");
  }
  if (scenario === "timeout") {
    return failure("timeout", 504, "Pexels did not respond before the request timed out.");
  }

  const page = Math.max(1, input.page || 1);
  const pageFixture = page > 1 ? fixture.page2 : fixture.page1;
  const candidates =
    scenario === "empty"
      ? []
      : pageFixture.photos.map((photo) =>
          normalizePhoto(
            {
              ...photo,
              photographer_url: photo.photographerUrl,
              src: { large: photo.large, medium: photo.medium },
            },
            input.query
          )
        );
  return {
    ok: true,
    provider: "pexels",
    candidates,
    page,
    nextPage: scenario === "empty" ? null : pageFixture.nextPage,
  };
}

export class PexelsProvider {
  private readonly apiKey?: string;
  private readonly fetchImpl: ProviderFetch;
  private readonly fixture: boolean;
  private readonly fixtureScenario: FixtureScenario;

  constructor(options: PexelsProviderOptions = {}) {
    this.apiKey = options.apiKey?.trim();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.fixture = Boolean(options.fixture);
    this.fixtureScenario = options.fixtureScenario ?? "success";
  }

  async search(input: PexelsSearchInput): Promise<ProviderSearchResult> {
    const query = input.query.trim();
    const page = Math.max(1, Math.min(50, input.page || 1));
    if (this.fixture) return fixtureResult({ ...input, query, page }, this.fixtureScenario);
    if (!this.apiKey) {
      return failure(
        "not_configured",
        503,
        "Pexels is unavailable because provider credentials are not configured."
      );
    }

    const params = new URLSearchParams({
      query,
      page: String(page),
      per_page: String(Math.max(1, Math.min(40, input.perPage || 18))),
    });
    if (input.orientation) params.set("orientation", input.orientation);
    const color = normalizeColor(input.color);
    if (color) params.set("color", color);

    try {
      const response = await this.fetchImpl(`https://api.pexels.com/v1/search?${params}`, {
        headers: { Authorization: this.apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
      if (response.status === 401) {
        return failure("unauthorized", 401, "Pexels credentials were rejected.");
      }
      if (response.status === 403) {
        return failure("forbidden", 403, "Pexels access is not authorized for this account.");
      }
      if (response.status === 429) {
        const retryAfter = Math.max(1, Number(response.headers.get("retry-after") || 60) || 60);
        return failure("rate_limited", 429, "Pexels is temporarily rate-limited.", retryAfter);
      }
      if (!response.ok) {
        return failure("outage", 503, `Pexels returned ${response.status}.`);
      }

      const payload = (await response.json()) as PexelsResponse;
      if (!Array.isArray(payload.photos)) {
        return failure("invalid_response", 502, "Pexels returned an invalid response.");
      }
      return {
        ok: true,
        provider: "pexels",
        candidates: payload.photos.map((photo) => normalizePhoto(photo, query)),
        page,
        nextPage: payload.next_page ? page + 1 : null,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return failure("timeout", 504, "Pexels did not respond before the request timed out.");
      }
      return failure("outage", 503, "Pexels could not be reached.");
    }
  }
}

function fixtureScenarioFromEnvironment(): FixtureScenario {
  const raw = process.env.CREATIVE_PROVIDER_FIXTURE_SCENARIO?.trim().toLowerCase();
  const scenario = raw?.replace(/^pexels_/, "");
  return scenario === "empty" ||
    scenario === "unauthorized" ||
    scenario === "forbidden" ||
    scenario === "rate_limited" ||
    scenario === "outage" ||
    scenario === "timeout"
    ? scenario
    : "success";
}

export function getPexelsProvider(): PexelsProvider {
  const fixtureMode = providerFixtureModeEnabled();
  return new PexelsProvider({
    apiKey: process.env.PEXELS_API_KEY,
    fixture: fixtureMode,
    fixtureScenario: fixtureMode ? fixtureScenarioFromEnvironment() : "success",
  });
}
