// Darija + Arabic number parsing for voice entry amounts
// Handles: Western digits (120), Arabic-Indic digits (١٢٠), Darija number words

const ARABIC_INDIC_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

// Darija spoken number words → value
const DARIJA_WORDS: Array<[RegExp, number]> = [
  [/ألف و نص|ألف ونص/i, 1500],
  [/ألفين/i, 2000],
  [/ألف/i, 1000],
  [/خمسمية|خمس مية/i, 500],
  [/أربعمية|أربع مية/i, 400],
  [/تلتمية|ثلاث مية/i, 300],
  [/مايتين|ميتين/i, 200],
  [/مية|مئة/i, 100],
  [/تسعين/i, 90],
  [/ثمانين/i, 80],
  [/سبعين/i, 70],
  [/ستين/i, 60],
  [/خمسين/i, 50],
  [/أربعين/i, 40],
  [/تلاتين|ثلاثين/i, 30],
  [/عشرين/i, 20],
  [/تسعطاش/i, 19],
  [/تمنطاش/i, 18],
  [/سبعطاش/i, 17],
  [/سطاش/i, 16],
  [/خمسطاش/i, 15],
  [/ربعطاش/i, 14],
  [/تلتطاش/i, 13],
  [/طناش/i, 12],
  [/حدعش/i, 11],
  [/عشرة/i, 10],
  [/تسعة/i, 9],
  [/ثمانية|تمانية/i, 8],
  [/سبعة/i, 7],
  [/ستة/i, 6],
  [/خمسة/i, 5],
  [/أربعة/i, 4],
  [/تلاتة|ثلاثة/i, 3],
  [/جوج|زوج/i, 2],
  [/واحد/i, 1],
];

function normalizeArabicIndic(str: string): string {
  return str.replace(/[٠-٩]/g, (c) => ARABIC_INDIC_MAP[c] ?? c);
}

/**
 * Attempts to extract a MAD amount (in centimes) from a Darija/French/Arabic transcript.
 * Returns null if no number could be reliably parsed.
 *
 * Strategy:
 * 1. Try to find a digit sequence (Western or Arabic-Indic) in the transcript
 * 2. Fall back to Darija number words
 */
export function parseAmountFromTranscript(transcript: string): number | null {
  const normalized = normalizeArabicIndic(transcript.trim());

  // Match decimal number: "15.50 درهم" or "١٢٠" or "1200"
  const digitMatch = normalized.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (digitMatch?.[1]) {
    const raw = digitMatch[1].replace(",", ".");
    const value = Number.parseFloat(raw);
    if (!Number.isNaN(value) && value > 0 && value < 1_000_000) {
      return Math.round(value * 100); // convert MAD to centimes
    }
  }

  // Try Darija word-based parsing (additive: سبعة و عشرين = 27)
  let total = 0;
  let found = false;
  let remaining = transcript;

  for (const [pattern, value] of DARIJA_WORDS) {
    if (pattern.test(remaining)) {
      total += value;
      remaining = remaining.replace(pattern, "");
      found = true;
    }
  }

  if (found && total > 0 && total < 1_000_000) {
    return total * 100; // whole MAD → centimes
  }

  return null;
}

/**
 * Strips the detected amount words/digits from the transcript to yield a description.
 */
export function extractDescription(transcript: string, amountCentimes: number | null): string {
  if (amountCentimes === null) return transcript.trim();

  // Remove digit sequences
  let desc = normalizeArabicIndic(transcript)
    .replace(/\d+(?:[.,]\d{1,2})?/, "")
    .replace(/\s*(درهم|دراهم|ريال|MAD|دهرم)\s*/gi, "")
    .trim();

  // Collapse multiple spaces
  desc = desc.replace(/\s{2,}/g, " ").trim();
  return desc;
}
