import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["dz", "fr", "ar"],
  defaultLocale: "dz",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
