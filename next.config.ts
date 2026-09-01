import type { NextConfig } from "next";
import { detectLanBaseUrl } from "./lib/fusion/creative-studio/preview/url";

function liveDeviceDevOrigins(): string[] {
  const origins = new Set(["127.0.0.1", "localhost"]);
  const port = Number(process.env.PORT || "3000");
  const candidates = [
    detectLanBaseUrl(Number.isFinite(port) ? port : 3000),
    process.env.NEXT_PUBLIC_PREVIEW_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.TAPCONNECT_PREVIEW_DEV_ORIGINS || "").split(","),
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      origins.add(new URL(value.includes("://") ? value : `http://${value}`).hostname);
    } catch {
      // Invalid candidates remain rejected by Next's development origin guard.
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  // The framework's bottom-left dev badge covers the phone Studio Add job.
  // Compile/runtime errors still surface when the route indicator is hidden.
  devIndicators: false,
  // Allows an isolated proof server to run alongside an IDE-managed dev server.
  // Production and ordinary development keep Next's standard .next directory.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  // Live Device is opened by a phone through this Mac's current LAN address.
  // Keep Next's dev-only asset/origin guard narrow while admitting that exact
  // address (and explicitly configured preview hosts) at server startup.
  allowedDevOrigins: liveDeviceDevOrigins(),
  async redirects() {
    return [
      {
        source: "/dashboard/builder",
        destination: "/dashboard/card",
        permanent: false,
      },
      // Legacy Experiences sibling → TapCast first-class TikTok channel
      {
        source: "/dashboard/experiences/tiktok",
        destination: "/dashboard/experiences/tapcast/tiktok",
        permanent: false,
      },
      {
        source: "/dashboard/experiences/tiktok/:path*",
        destination: "/dashboard/experiences/tapcast/tiktok/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
