import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { notFound } from "next/navigation";
import { NoticeBanner } from "@/components/NoticeBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type SupportedLocale = (typeof routing.locales)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (routing.locales as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Requests such as /favicon.ico fall through to this dynamic segment, and
  // metadata runs before the layout body. Without this guard the message import
  // below throws MODULE_NOT_FOUND and the request 500s instead of 404ing.
  if (!isSupportedLocale(locale)) notFound();
  const messages = (await import(`../../messages/${locale}.json`)).default as {
    meta: { title: string; description: string };
  };
  return {
    title: messages.meta.title,
    description: messages.meta.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NuqsAdapter>
          <NextIntlClientProvider messages={messages}>
            <NoticeBanner />
            <SiteHeader />
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          </NextIntlClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
