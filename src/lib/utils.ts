import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null, locale: string): string {
  if (value == null) return "–";
  return new Intl.NumberFormat(locale === "sv" ? "sv-FI" : locale === "en" ? "en-FI" : "fi-FI").format(value);
}

export function occupationName(
  occupation: { occupationNameFi: string; occupationNameSv: string; occupationNameEn: string },
  locale: string,
): string {
  if (locale === "sv") return occupation.occupationNameSv;
  if (locale === "en") return occupation.occupationNameEn;
  return occupation.occupationNameFi;
}
