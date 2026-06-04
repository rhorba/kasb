// All monetary values are integer centimes (MAD × 100). Never a float.
export type Money = number & { readonly __brand: "Money" };

export function toMoney(centimes: number): Money {
  if (!Number.isInteger(centimes)) {
    throw new Error(`Money must be an integer (centimes), got: ${centimes}`);
  }
  return centimes as Money;
}

export function toMoneyFromDirhams(dirhams: number): Money {
  return toMoney(Math.round(dirhams * 100));
}

export function toDirhams(money: Money): number {
  return money / 100;
}

export function addMoney(a: Money, b: Money): Money {
  return toMoney(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return toMoney(a - b);
}

export function formatMAD(money: Money, locale: "dz" | "fr" | "ar" = "fr"): string {
  const dirhams = toDirhams(money);
  const intlLocale = locale === "fr" ? "fr-MA" : "ar-MA";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
  }).format(dirhams);
}

export const ZERO: Money = 0 as Money;
