import { parseAmountFromTranscript } from "@/lib/voice/number-parser";
import type { ReceiptDraft } from "./types";

// Patterns for total amount on a Moroccan receipt
// Common labels: Total, المجموع, الإجمالي, TOTAL TTC, Net à payer, Montant
const TOTAL_PATTERNS = [
  /(?:total\s+(?:ttc|net|général)?|montant|net\s+à\s+payer|المجموع|الإجمالي|مبلغ)[:\s]*(\d[\d\s,.']*)/i,
  /(\d[\d\s,.']+)\s*(?:MAD|DH|درهم|dh)/i,
];

function parseAmountFromText(text: string): number | null {
  for (const pattern of TOTAL_PATTERNS) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const cleaned = m[1].replace(/\s/g, "").replace(",", ".");
      const value = Number.parseFloat(cleaned);
      if (!Number.isNaN(value) && value > 0 && value < 1_000_000) {
        return Math.round(value * 100);
      }
    }
  }
  // Fallback: try voice parser on the full text
  return parseAmountFromTranscript(text);
}

function extractDescription(text: string): string | null {
  // First non-empty line is often the merchant/store name
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^\d/.test(l));
  return lines[0] ?? null;
}

function extractDate(text: string): string | null {
  // DD/MM/YYYY or YYYY-MM-DD
  const m = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
  if (!m?.[0]) return null;
  try {
    const normalized = m[0].replace(/\//g, "-");
    // Try DD-MM-YYYY → reformat
    const parts = normalized.split("-");
    if (parts.length !== 3) return null;
    if (parts[0] && parts[0].length === 4) return normalized; // already YYYY-MM-DD
    // DD-MM-YYYY
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  } catch {
    return null;
  }
}

export function parseReceiptText(rawText: string): ReceiptDraft {
  const amount = parseAmountFromText(rawText);
  const description = extractDescription(rawText);
  const date = extractDate(rawText);

  const confidence =
    amount !== null && description !== null ? "high" : amount !== null ? "medium" : "low";

  return { amountCentimes: amount, description, date, confidence, rawText };
}
