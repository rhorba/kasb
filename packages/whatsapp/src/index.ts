// Sprint 4: receipt formatter + wa.me deep link generator
// v0.1: wa.me/?text=... deep link (no Infobip API needed)
// v0.2: Infobip WhatsApp Business API

export function formatReceiptText(params: {
  businessName: string;
  amount: number; // centimes
  description: string;
  date: Date;
  locale?: "dz" | "fr" | "ar";
}): string {
  const { businessName, amount, description, date, locale = "fr" } = params;
  const dirhams = (amount / 100).toFixed(2);
  const dateStr = date.toLocaleDateString(locale === "fr" ? "fr-MA" : "ar-MA");

  if (locale === "fr") {
    return `✅ Reçu de ${businessName}\nMontant: ${dirhams} MAD\nObjet: ${description}\nDate: ${dateStr}\n\nMerci 🙏`;
  }
  return `✅ وصل من ${businessName}\nالمبلغ: ${dirhams} درهم\nالوصف: ${description}\nالتاريخ: ${dateStr}\n\nشكراً 🙏`;
}

export function buildWhatsAppLink(phone: string | undefined, text: string): string {
  const encoded = encodeURIComponent(text);
  if (phone) {
    const normalized = phone.replace(/^0/, "212").replace(/\+/, "");
    return `https://wa.me/${normalized}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
