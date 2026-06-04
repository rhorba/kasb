export interface ReceiptDraft {
  amountCentimes: number | null; // best-guess MAD amount from the receipt
  description: string | null; // merchant name or receipt header
  date: string | null; // ISO date if detected on receipt
  confidence: "high" | "medium" | "low";
  rawText: string; // full OCR text (shown to user for correction)
}
