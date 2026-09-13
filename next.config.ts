import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only used for self-hosting (local server / VPS).
  // On Vercel the platform performs its own optimized build instead.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    serverActions: {
      // The app is served behind reverse proxies (local Caddy + the hosting
      // platform edge), so the browser Origin (preview subdomain) will not
      // always match the host header that reaches Next.js. Without this
      // whitelist every Server Action POST (login, forms...) is rejected with
      // "Invalid Server Actions request" (Next.js CSRF protection).
      allowedOrigins: [
        "localhost",
        "localhost:3000",
        "localhost:81",
        "127.0.0.1",
        "127.0.0.1:3000",
        "127.0.0.1:81",
        "*.space-z.ai",
        "**.space-z.ai",
        "*.vercel.app",
        "**.vercel.app",
      ],
    },
  },
};

export default nextConfig;
