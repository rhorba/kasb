// Sprint 4: receipt formatter + wa.me deep link generator
// v0.1: wa.me/?text=... deep link (no Infobip API needed)
// v0.2: Infobip WhatsApp Business API

export type ReceiptLocale = "dz" | "fr" | "ar";

export interface ReceiptEntry {
  amount: number; // centimes — always positive
  type: "income" | "expense";
  category: string;
  description?: string | null;
  entryDate: Date;
}

export interface ReceiptBusiness {
  name: string;
  city?: string | null | undefined;
  phone?: string | null | undefined;
}

/**
 * Formats a cash entry as a WhatsApp-friendly plain-text receipt.
 * Used for: sharing a sale receipt with a customer, or confirming a transaction.
 */
export function formatReceipt(
  entry: ReceiptEntry,
  business: ReceiptBusiness,
  locale: ReceiptLocale = "fr",
): string {
  const dirhams = (Math.abs(entry.amount) / 100).toFixed(2);
  const dateStr = entry.entryDate.toLocaleDateString(locale === "fr" ? "fr-MA" : "ar-MA");
  const desc = entry.description ?? (locale === "fr" ? entry.category : entry.category);

  if (locale === "fr") {
    return [
      `✅ Reçu — ${business.name}`,
      `Montant : ${dirhams} MAD`,
      `Objet : ${desc}`,
      `Date : ${dateStr}`,
      ...(business.city ? [`Ville : ${business.city}`] : []),
      "",
      "Merci pour votre confiance 🙏",
    ].join("\n");
  }

  // Darija / Arabic
  return [
    `✅ وصل — ${business.name}`,
    `المبلغ: ${dirhams} درهم`,
    `الوصف: ${desc}`,
    `التاريخ: ${dateStr}`,
    ...(business.city ? [`المدينة: ${business.city}`] : []),
    "",
    "شكراً على ثقتكم 🙏",
  ].join("\n");
}

/**
 * Builds a wa.me deep link that opens WhatsApp with the receipt pre-filled.
 * If phone is provided, opens a direct conversation; otherwise opens share picker.
 */
export function buildWhatsAppLink(phone: string | undefined | null, text: string): string {
  const encoded = encodeURIComponent(text);
  if (phone) {
    const normalized = phone.replace(/^0/, "212").replace(/\+/g, "");
    return `https://wa.me/${normalized}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

// Legacy: kept for backward compatibility
export function formatReceiptText(params: {
  businessName: string;
  amount: number;
  description: string;
  date: Date;
  locale?: ReceiptLocale;
}): string {
  return formatReceipt(
    {
      amount: params.amount,
      type: "income",
      category: "sales",
      description: params.description,
      entryDate: params.date,
    },
    { name: params.businessName },
    params.locale,
  );
}
