import type { MicrofinancePartner } from "@kasb/core";

/**
 * Returns IDs of eligible partners for a given score and city.
 * Filters: partner must be active AND score >= minScore.
 * City filter: if partner.cities is non-empty, the business city must be included.
 * Sorted: most accessible (lowest minScore) first.
 */
export function matchPartners(
  score: number,
  city: string,
  partners: MicrofinancePartner[],
): string[] {
  return partners
    .filter((p) => p.active && score >= p.minScore)
    .filter((p) => p.cities.length === 0 || p.cities.includes(city))
    .sort((a, b) => a.minScore - b.minScore)
    .map((p) => p.id);
}
