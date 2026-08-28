import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Full source is copied into the image (app, worker, sandbox, migrate/seed).
  // `output: "standalone"` makes `next start` fail, which Compose uses as CMD.
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/sandbox/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; script-src 'none'; style-src 'none'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
