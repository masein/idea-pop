import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Where /api/* requests are proxied (server-side). The backend serves its
// routes WITHOUT the /api prefix; the frontend always calls same-origin
// /api/* and this rewrite bridges the two. Baked at build time (standalone
// output) — set API_URL as a build arg/env: localhost:8080 for local dev,
// http://backend:8080 inside docker compose.
const API_URL = process.env.API_URL ?? "http://localhost:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },

  images: {
    remotePatterns: [
      // Local MinIO (dev)
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "localhost", port: "9001" },
      // Any HTTPS origin (S3/CDN) — restrict to exact hostname before production
      { protocol: "https", hostname: "**" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http://localhost:*",
              "media-src 'self' blob: https: http://localhost:*",
              "connect-src 'self' http://localhost:* https:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
