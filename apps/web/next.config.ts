import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // PWA disabled in dev — enable for testing with ENABLE_PWA=1
  disable: process.env.NODE_ENV === "development" && !process.env.ENABLE_PWA,
  workboxOptions: {
    disableDevLogs: true,
    // Inject push-handler.js into the generated service worker so it can receive push events
    importScripts: ["/push-handler.js"],
    // Exclude push-handler from precaching (it's imported directly, not fetched by the app)
    exclude: [/push-handler\.js$/],
  },
});

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD ? { output: "standalone" as const } : {}),
  transpilePackages: [
    "@kasb/core",
    "@kasb/db",
    "@kasb/cashbook",
    "@kasb/credit",
    "@kasb/inventory",
    "@kasb/whatsapp",
    "@kasb/notifications",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default withPWA(withNextIntl(nextConfig));
