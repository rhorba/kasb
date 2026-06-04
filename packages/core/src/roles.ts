export const ROLES = ["owner", "admin", "partner"] as const;
export type Role = (typeof ROLES)[number];

export const BUSINESS_CATEGORIES = [
  "commerce",
  "services",
  "artisanat",
  "construction",
  "food",
  "beauty",
  "other",
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const ENTRY_TYPES = ["income", "expense"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_CATEGORIES = [
  "sales",
  "stock_purchase",
  "rent",
  "transport",
  "staff",
  "loan_repayment",
  "equipment",
  "utilities",
  "other_income",
  "other_expense",
] as const;
export type EntryCategory = (typeof ENTRY_CATEGORIES)[number];

export const ENTRY_SOURCES = ["manual", "voice", "ocr", "sync"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const CREDIT_APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "approved",
  "rejected",
  "withdrawn",
] as const;
export type CreditApplicationStatus = (typeof CREDIT_APPLICATION_STATUSES)[number];

export const AE_STEP_STATUSES = ["pending", "in_progress", "done", "skipped"] as const;
export type AEStepStatus = (typeof AE_STEP_STATUSES)[number];

export const LOCALES = ["dz", "fr", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
