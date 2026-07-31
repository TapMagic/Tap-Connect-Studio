import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows an isolated proof server to run alongside an IDE-managed dev server.
  // Production and ordinary development keep Next's standard .next directory.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  // Playwright and local proofs use 127.0.0.1; allow Turbopack HMR / client assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
