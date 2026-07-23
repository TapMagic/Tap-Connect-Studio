import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
