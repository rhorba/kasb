import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// Root layout — [locale]/layout.tsx provides html/body with locale-specific dir + fonts

export const metadata: Metadata = {
  title: "كسب",
  description: "دير الحساب ديالك. وصّل للقرض. رسمي النشاط ديالك.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "كسب",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2D2D6B" },
    { media: "(prefers-color-scheme: dark)", color: "#2D2D6B" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
