import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright and local proofs use 127.0.0.1; allow Turbopack HMR / client assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/dashboard/builder",
        destination: "/dashboard/card",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
