import { z } from "zod";
import {
  AE_STEP_STATUSES,
  BUSINESS_CATEGORIES,
  CREDIT_APPLICATION_STATUSES,
  ENTRY_CATEGORIES,
  ENTRY_SOURCES,
  ENTRY_TYPES,
  LOCALES,
  ROLES,
} from "./roles";

// ─── Primitives ───────────────────────────────────────────────────────────────

// Moroccan phone: +2126XXXXXXXX or 06/07XXXXXXXX
export const phoneSchema = z
  .string()
  .regex(/^(\+212|0)[567]\d{8}$/, "Numéro de téléphone invalide (ex: 0612345678)");

export const otpSchema = z
  .string()
  .length(6)
  .regex(/^\d{6}$/, "Le code OTP doit contenir 6 chiffres");

// Money: positive integer centimes
export const moneySchema = z.number().int().nonnegative("Le montant doit être positif");

export const roleSchema = z.enum(ROLES);
export const localeSchema = z.enum(LOCALES);
export const businessCategorySchema = z.enum(BUSINESS_CATEGORIES);
export const entryTypeSchema = z.enum(ENTRY_TYPES);
export const entryCategorySchema = z.enum(ENTRY_CATEGORIES);
export const entrySourceSchema = z.enum(ENTRY_SOURCES);
export const creditApplicationStatusSchema = z.enum(CREDIT_APPLICATION_STATUSES);
export const aeStepStatusSchema = z.enum(AE_STEP_STATUSES);

// ─── User ─────────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().min(1).max(100),
  role: roleSchema,
  city: z.string().max(100).optional(),
  language: localeSchema,
  isActive: z.boolean(),
  phoneVerified: z.boolean(),
  createdAt: z.date(),
});
export type User = z.infer<typeof userSchema>;

// ─── Business Profile ─────────────────────────────────────────────────────────

export const createBusinessProfileSchema = z.object({
  name: z.string().min(1).max(200),
  category: businessCategorySchema,
  city: z.string().min(1).max(100),
  neighborhood: z.string().max(200).optional(),
  hasFixedPremises: z.boolean(),
  isAutoEntrepreneur: z.boolean(),
  rnaNumber: z.string().max(50).optional(),
  monthlyRevenueEstimate: moneySchema.optional(),
});
export type CreateBusinessProfileInput = z.infer<typeof createBusinessProfileSchema>;

export const businessProfileSchema = createBusinessProfileSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BusinessProfile = z.infer<typeof businessProfileSchema>;

// ─── Cash Entry ───────────────────────────────────────────────────────────────

export const createCashEntrySchema = z.object({
  type: entryTypeSchema,
  amount: moneySchema.pipe(z.number().positive("Le montant doit être supérieur à 0")),
  category: entryCategorySchema,
  description: z.string().max(500).optional(),
  clientId: z.string().uuid().optional(),
  receiptPhotoKey: z.string().max(500).optional(),
  entryDate: z.date(),
  source: entrySourceSchema,
  offlineId: z.string().uuid().optional(),
});
export type CreateCashEntryInput = z.infer<typeof createCashEntrySchema>;

export const cashEntrySchema = createCashEntrySchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  syncedAt: z.date().optional(),
  createdAt: z.date(),
});
export type CashEntry = z.infer<typeof cashEntrySchema>;

// ─── Customer ─────────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: phoneSchema.optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const customerSchema = createCustomerSchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  outstandingDebt: moneySchema,
  lastTransactionAt: z.date().optional(),
  createdAt: z.date(),
});
export type Customer = z.infer<typeof customerSchema>;

// ─── Debt Entry ───────────────────────────────────────────────────────────────

export const debtEntrySchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  businessId: z.string().uuid(),
  amount: z.number().int(), // positive = owes; negative = repayment
  description: z.string().max(500).optional(),
  entryDate: z.date(),
  createdAt: z.date(),
});
export type DebtEntry = z.infer<typeof debtEntrySchema>;

// ─── Credit Score ─────────────────────────────────────────────────────────────

export const scoreComponentsSchema = z.object({
  revenueConsistency: z.number().min(0).max(30),
  expenseControl: z.number().min(0).max(25),
  growthTrend: z.number().min(0).max(20),
  debtRecoveryRate: z.number().min(0).max(15),
  dataRichness: z.number().min(0).max(10),
});
export type ScoreComponents = z.infer<typeof scoreComponentsSchema>;

export const creditScoreSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  score: z.number().min(0).max(100),
  components: scoreComponentsSchema,
  eligiblePartners: z.array(z.string().uuid()),
  computedAt: z.date(),
  monthsOfData: z.number().int().nonnegative(),
});
export type CreditScore = z.infer<typeof creditScoreSchema>;

// ─── Microfinance Partner ─────────────────────────────────────────────────────

export const loanProductSchema = z.object({
  id: z.string().uuid(),
  partnerId: z.string().uuid(),
  name: z.string().min(1).max(200),
  minAmount: moneySchema,
  maxAmount: moneySchema,
  maxDurationMonths: z.number().int().positive(),
  interestRateApprox: z.number().min(0).max(100),
  targetCategory: businessCategorySchema.optional(),
  description: z.string().max(1000),
});
export type LoanProduct = z.infer<typeof loanProductSchema>;

export const microfinancePartnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  logoUrl: z.string().url(),
  minScore: z.number().int().min(0).max(100),
  products: z.array(loanProductSchema),
  cities: z.array(z.string()),
  contactPhone: phoneSchema,
  websiteUrl: z.string().url().optional(),
  active: z.boolean(),
});
export type MicrofinancePartner = z.infer<typeof microfinancePartnerSchema>;

// ─── Credit Application ───────────────────────────────────────────────────────

export const createCreditApplicationSchema = z.object({
  partnerId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  requestedAmount: moneySchema.pipe(z.number().positive()),
});
export type CreateCreditApplicationInput = z.infer<typeof createCreditApplicationSchema>;

export const creditApplicationSchema = createCreditApplicationSchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  status: creditApplicationStatusSchema,
  scoreAtApplication: z.number().int().min(0).max(100),
  submittedAt: z.date(),
  updatedAt: z.date(),
});
export type CreditApplication = z.infer<typeof creditApplicationSchema>;

// ─── AE Registration ─────────────────────────────────────────────────────────

export const aeStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: aeStepStatusSchema,
  completedAt: z.date().optional(),
});
export type AEStep = z.infer<typeof aeStepSchema>;

export const aeRegistrationProgressSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  steps: z.array(aeStepSchema),
  completedAt: z.date().optional(),
  rnaNumber: z.string().max(50).optional(),
  createdAt: z.date(),
});
export type AERegistrationProgress = z.infer<typeof aeRegistrationProgressSchema>;

// ─── Stock Item ───────────────────────────────────────────────────────────────

export const createStockItemSchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(50),
  purchasePrice: moneySchema,
  sellingPrice: moneySchema,
  currentStock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  supplierId: z.string().uuid().optional(),
});
export type CreateStockItemInput = z.infer<typeof createStockItemSchema>;

export const stockItemSchema = createStockItemSchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type StockItem = z.infer<typeof stockItemSchema>;

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().uuid(),
  entity: z.string(),
  entityId: z.string(),
  action: z.enum(["create", "update", "delete", "sync", "score_compute"]),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  at: z.date(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;
