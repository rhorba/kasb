---
name: content-editor
description: Darija/FR/AR content for Kasb. Trigger on: "translation", "i18n", "dz.json", "fr.json", "copy", "label".
---
# Content Editor — Kasb

## Voice
- **Darija first**: "Dkhel f7isabek" not "Enregistrez dans votre comptabilité"
- **Zero jargon**: "Flous jayo" (incoming money) not "Recettes"
- **Practical and warm**: like a helpful friend, not a bank
- **Short**: users are recording transactions fast; no long labels

## Key strings (dz.json — Darija in Arabic script)

```json
{
  "home": {
    "todayBalance": "الفلوس ديال اليوم",
    "addSale": "+ بيع",
    "addExpense": "- خرج فلوس",
    "recentEntries": "آخر الدخلات"
  },
  "entry": {
    "amount": "الثمن",
    "category": "النوع",
    "description": "شنو؟ (اختياري)",
    "forWho": "لمن؟ (اختياري)",
    "saved": "تسجل ✓",
    "sendWhatsApp": "شارك الفاتورة ف واتساب",
    "categories": {
      "sales": "بيع",
      "stock_purchase": "شرا البضاعة",
      "rent": "الكراء",
      "transport": "الطرانسبور",
      "staff": "العمال",
      "loan_repayment": "سداد القرض",
      "other_income": "خرا دخول",
      "other_expense": "خرا خروج"
    }
  },
  "score": {
    "title": "سكور كسب ديالك",
    "notReady": "سجل {remaining} يوم باش تشوف سكورك",
    "eligible": "مبروك! راك مقبول عند {partner}",
    "components": {
      "revenueConsistency": "انتظام المداخيل",
      "expenseControl": "تحكم ف المصاريف",
      "growthTrend": "تطور النشاط",
      "debtRecovery": "تحصيل الديون",
      "dataRichness": "غنى المعطيات"
    }
  },
  "debt": {
    "title": "دفتر الكريدي",
    "owes": "خاصو يعطيك",
    "paid": "خلص",
    "reminder": "فكر {name} بـ {amount} درهم"
  },
  "ae": {
    "title": "ودي النشاط ديالك للرسمي",
    "quiz": "واش أنت مستعد؟",
    "simulation": "إلا كنت أوتو-أونتروبرونور، غادي تخلص {amount} درهم ف السنة"
  }
}
```

## French (fr.json) — key strings
```json
{
  "home": {
    "todayBalance": "Mon argent d'aujourd'hui",
    "addSale": "+ Vente", "addExpense": "- Dépense",
    "recentEntries": "Dernières entrées"
  },
  "entry": {
    "amount": "Montant", "category": "Catégorie",
    "description": "Quoi? (optionnel)", "forWho": "Pour qui? (optionnel)",
    "saved": "Enregistré ✓", "sendWhatsApp": "Envoyer le reçu sur WhatsApp",
    "categories": {
      "sales": "Ventes", "stock_purchase": "Achat stock", "rent": "Loyer",
      "transport": "Transport", "staff": "Personnel"
    }
  },
  "score": {
    "title": "Votre score Kasb", "notReady": "Enregistrez encore {remaining} jours",
    "eligible": "Félicitations! Vous êtes éligible chez {partner}"
  },
  "debt": {
    "title": "Livre de dettes", "owes": "Vous doit", "paid": "A payé"
  }
}
```

## Rules
- "Darija" means Moroccan Arabic dialect — not MSA (Modern Standard Arabic), not Classical Arabic
- Numbers in Darija context: Arabic numerals (١٢٣) with fallback to Western (123)
- MAD amounts: always with "درهم" (Darija) or "MAD" (French)
- Never translate "auto-entrepreneur" — it's a legal term known in Darija as-is
- WhatsApp receipt format: plain text, emoji-friendly, reads naturally when received
