import type { AEStep, ScoreComponents } from "@kasb/core";
// DB schema — keep enum values in sync with packages/core/src/roles.ts
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["owner", "admin", "partner"]);

export const businessCategoryEnum = pgEnum("business_category", [
  "commerce",
  "services",
  "artisanat",
  "construction",
  "food",
  "beauty",
  "other",
]);

export const entryTypeEnum = pgEnum("entry_type", ["income", "expense"]);

export const entryCategoryEnum = pgEnum("entry_category", [
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
]);

export const entrySourceEnum = pgEnum("entry_source", ["manual", "voice", "ocr", "sync"]);

export const creditApplicationStatusEnum = pgEnum("credit_application_status", [
  "submitted",
  "reviewing",
  "approved",
  "rejected",
  "withdrawn",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "sync",
  "score_compute",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(), // nullable — secondary auth only
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("owner"),
  city: text("city"),
  language: text("language").notNull().default("dz"), // 'dz' | 'fr' | 'ar'
  isActive: boolean("is_active").notNull().default(true),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── OTP Codes ────────────────────────────────────────────────────────────────
// Managed by auth service — no RLS (see rls.sql comment)

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(), // Argon2id of the 6-digit code
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    used: boolean("used").notNull().default(false),
    attempts: integer("attempts").notNull().default(0), // incremented on each failed verify
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxPhone: index("idx_otp_phone").on(t.phone),
  }),
);

// ─── Business Profiles ────────────────────────────────────────────────────────

export const businessProfiles = pgTable(
  "business_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: businessCategoryEnum("category").notNull(),
    city: text("city").notNull(),
    neighborhood: text("neighborhood"),
    hasFixedPremises: boolean("has_fixed_premises").notNull(),
    isAutoEntrepreneur: boolean("is_auto_entrepreneur").notNull().default(false),
    rnaNumber: text("rna_number"),
    monthlyRevenueEstimate: bigint("monthly_revenue_estimate", { mode: "number" }), // centimes
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxUser: index("idx_business_profiles_user").on(t.userId),
  }),
);

// ─── Customers (Debt Book) ────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    outstandingDebt: bigint("outstanding_debt", { mode: "number" }).notNull().default(0), // centimes
    lastTransactionAt: timestamp("last_transaction_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxBusiness: index("idx_customers_business").on(t.businessId),
  }),
);

// ─── Cash Entries ─────────────────────────────────────────────────────────────
// append-only: corrections use correctsId to point at the original entry

export const cashEntries = pgTable(
  "cash_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    offlineId: text("offline_id"), // client UUID; null for server-created
    type: entryTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(), // centimes, always positive
    category: entryCategoryEnum("category").notNull(),
    description: text("description"),
    clientId: uuid("client_id").references(() => customers.id, { onDelete: "set null" }),
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
    source: entrySourceEnum("source").notNull().default("manual"),
    correctsId: uuid("corrects_id").references((): AnyPgColumn => cashEntries.id),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    receiptPhotoKey: text("receipt_photo_key"), // R2 object key
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxBusiness: index("idx_entries_business").on(t.businessId),
    idxDate: index("idx_entries_date").on(t.businessId, t.entryDate),
    // NULL offlineIds are excluded from the unique constraint by Postgres semantics
    offlineIdUnique: unique("cash_entries_offline_dedup").on(t.businessId, t.offlineId),
  }),
);

// ─── Debt Entries ─────────────────────────────────────────────────────────────

export const debtEntries = pgTable(
  "debt_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(), // positive = owes, negative = repayment
    description: text("description"),
    entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxCustomer: index("idx_debt_entries_customer").on(t.customerId),
    idxBusiness: index("idx_debt_entries_business").on(t.businessId),
  }),
);

// ─── Credit Scores ────────────────────────────────────────────────────────────

export const creditScores = pgTable(
  "credit_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 0–100
    components: jsonb("components").notNull().$type<ScoreComponents>(),
    monthsOfData: integer("months_of_data").notNull(),
    eligiblePartnerIds: text("eligible_partner_ids").array().notNull().default([]),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    idxLatest: index("idx_scores_latest").on(t.businessId, t.computedAt),
  }),
);

// ─── Microfinance Partners ────────────────────────────────────────────────────

export const microfinancePartners = pgTable("microfinance_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  minScore: integer("min_score").notNull(), // minimum Kasb score to qualify
  cities: text("cities").array().notNull().default([]),
  contactPhone: text("contact_phone").notNull(),
  websiteUrl: text("website_url"),
  active: boolean("active").notNull().default(true),
});

// ─── Loan Products ────────────────────────────────────────────────────────────

export const loanProducts = pgTable(
  "loan_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => microfinancePartners.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minAmount: bigint("min_amount", { mode: "number" }).notNull(), // centimes
    maxAmount: bigint("max_amount", { mode: "number" }).notNull(), // centimes
    maxDurationMonths: integer("max_duration_months").notNull(),
    interestRateBps: integer("interest_rate_bps").notNull(), // basis points (850 = 8.50%)
    targetCategory: businessCategoryEnum("target_category"),
    description: text("description").notNull(),
  },
  (t) => ({
    idxPartner: index("idx_loan_products_partner").on(t.partnerId),
  }),
);

// ─── Credit Applications ──────────────────────────────────────────────────────

export const creditApplications = pgTable(
  "credit_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => microfinancePartners.id),
    productId: uuid("product_id").references(() => loanProducts.id, { onDelete: "set null" }),
    requestedAmount: bigint("requested_amount", { mode: "number" }).notNull(), // centimes
    status: creditApplicationStatusEnum("status").notNull().default("submitted"),
    scoreAtApplication: integer("score_at_application").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxBusiness: index("idx_credit_apps_business").on(t.businessId),
    idxPartner: index("idx_credit_apps_partner").on(t.partnerId),
  }),
);

// ─── AE Registration Progress ─────────────────────────────────────────────────

export const aeRegistrationProgress = pgTable("ae_registration_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businessProfiles.id, { onDelete: "cascade" })
    .unique(), // one AE record per business
  steps: jsonb("steps").notNull().$type<AEStep[]>().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  rnaNumber: text("rna_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Stock Items ──────────────────────────────────────────────────────────────

export const stockItems = pgTable(
  "stock_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit").notNull(), // "pièce", "kg", "litre", "carton"
    purchasePrice: bigint("purchase_price", { mode: "number" }).notNull(), // centimes
    sellingPrice: bigint("selling_price", { mode: "number" }).notNull(), // centimes
    currentStock: integer("current_stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(0),
    supplierId: uuid("supplier_id"), // no FK — suppliers not a v0.1 table
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxBusiness: index("idx_stock_items_business").on(t.businessId),
  }),
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// Append-only; admin-readable only (see rls.sql)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idxActor: index("idx_audit_logs_actor").on(t.actorUserId),
    idxEntity: index("idx_audit_logs_entity").on(t.entity, t.entityId),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectBusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;
export type SelectCashEntry = typeof cashEntries.$inferSelect;
export type InsertCashEntry = typeof cashEntries.$inferInsert;
export type SelectCustomer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type SelectDebtEntry = typeof debtEntries.$inferSelect;
export type InsertDebtEntry = typeof debtEntries.$inferInsert;
export type SelectCreditScore = typeof creditScores.$inferSelect;
export type InsertCreditScore = typeof creditScores.$inferInsert;
export type SelectMicrofinancePartner = typeof microfinancePartners.$inferSelect;
export type InsertMicrofinancePartner = typeof microfinancePartners.$inferInsert;
export type SelectLoanProduct = typeof loanProducts.$inferSelect;
export type InsertLoanProduct = typeof loanProducts.$inferInsert;
export type SelectCreditApplication = typeof creditApplications.$inferSelect;
export type InsertCreditApplication = typeof creditApplications.$inferInsert;
export type SelectAEProgress = typeof aeRegistrationProgress.$inferSelect;
export type InsertAEProgress = typeof aeRegistrationProgress.$inferInsert;
export type SelectStockItem = typeof stockItems.$inferSelect;
export type InsertStockItem = typeof stockItems.$inferInsert;
export type SelectAuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
