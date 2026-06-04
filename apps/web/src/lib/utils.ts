import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format integer centimes as "1 500 MAD" */
export function formatMAD(centimes: number): string {
  const mad = Math.abs(centimes) / 100;
  return `${mad.toLocaleString("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} MAD`;
}

/** Parse a MAD string from the numpad (e.g. "1500" or "15.50") to centimes */
export function parseMADToCentimes(input: string): number {
  const num = Number.parseFloat(input || "0");
  return Math.round(num * 100);
}
