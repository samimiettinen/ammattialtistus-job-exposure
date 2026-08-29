import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fi", "sv", "en"],
  defaultLocale: "fi",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
