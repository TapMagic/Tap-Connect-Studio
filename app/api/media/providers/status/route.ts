import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { providerFixtureModeEnabled } from "@/lib/media/providers/types";
import { localMediaStorageEnabled } from "@/lib/media/storage";

export async function GET() {
  await requireBusiness();
  const fixture = providerFixtureModeEnabled();
  return NextResponse.json({
    mode: fixture ? "fixture" : "live",
    providers: {
      pexels: fixture
        ? { state: "fixture", label: "Fixture mode" }
        : process.env.PEXELS_API_KEY?.trim()
          ? { state: "ready", label: "Ready" }
          : { state: "not_configured", label: "Not configured" },
      logo_dev: fixture
        ? { state: "fixture", label: "Fixture mode" }
        : process.env.LOGO_DEV_TOKEN?.trim()
          ? { state: "ready", label: "Ready" }
          : { state: "not_configured", label: "Not configured" },
    },
    storage: localMediaStorageEnabled()
      ? { state: "fixture", label: "Local fixture storage" }
      : { state: "production", label: "Cloudflare R2" },
  });
}
