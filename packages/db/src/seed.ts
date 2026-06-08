/**
 * Demo seed — idempotent (safe to re-run).
 * Inserts 5 businesses, 90 days of cash entries each, 3 MFI partners,
 * credit scores, 2 customer debt books, and 1 AE registration in progress.
 *
 * Demo login: phone +212600000001, OTP 123456 (dev generateOtp() fixed value)
 *
 * Run: pnpm --filter @kasb/db db:seed
 */
import { sql } from "drizzle-orm";
import { db } from "./client";
import {
  aeRegistrationProgress,
  businessProfiles,
  cashEntries,
  creditScores,
  customers,
  debtEntries,
  loanProducts,
  microfinancePartners,
  users,
} from "./schema";

// ─── Fixed UUIDs (stable across re-runs) ──────────────────────────────────────

const ID = {
  // Users
  hassan: "00000000-0000-0000-0000-000000000001",
  fatima: "00000000-0000-0000-0000-000000000002",
  mohammed: "00000000-0000-0000-0000-000000000003",
  khadija: "00000000-0000-0000-0000-000000000004",
  omar: "00000000-0000-0000-0000-000000000005",
  // Businesses
  epicerie: "00000000-0000-0000-0001-000000000001",
  salon: "00000000-0000-0000-0001-000000000002",
  atelier: "00000000-0000-0000-0001-000000000003",
  restaurant: "00000000-0000-0000-0001-000000000004",
  electricite: "00000000-0000-0000-0001-000000000005",
  // Partners
  alamana: "00000000-0000-0000-0002-000000000001",
  fondep: "00000000-0000-0000-0002-000000000002",
  ardi: "00000000-0000-0000-0002-000000000003",
  // Customers
  rachid: "00000000-0000-0000-0003-000000000001",
  aicha: "00000000-0000-0000-0003-000000000002",
  // AE progress
  aeKhadija: "00000000-0000-0000-0004-000000000001",
} as const;

// ─── Deterministic pseudo-random helper ───────────────────────────────────────
// Produces a stable number in [min, max] given any integer seed.

function pick(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return min + Math.floor(Math.abs(x % 1) * (max - min + 1));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

// ─── Cash entry generators ────────────────────────────────────────────────────

type EntryRow = {
  id: string;
  businessId: string;
  offlineId: string;
  type: "income" | "expense";
  amount: number;
  category:
    | "sales"
    | "stock_purchase"
    | "rent"
    | "transport"
    | "staff"
    | "utilities"
    | "equipment"
    | "loan_repayment"
    | "other_income"
    | "other_expense";
  description: string | null;
  entryDate: Date;
  source: "manual";
};

function eid(bizKey: string, day: number, seq: number): string {
  return `seed-${bizKey}-d${day}-s${seq}`;
}

// Valid deterministic UUIDs for seed entries (hex-only, proper 8-4-4-4-12 format)
// bizHex codes: epi=e910  sal=5a10  ate=a7e0  res=1e50  ele=e1e0
function makeEntryId(bizHex: string, d: number, seq: number): string {
  const dh = d.toString(16).padStart(4, "0");
  const sh = seq.toString(16).padStart(4, "0");
  return `0000${bizHex}-0000-${dh}-${sh}-000000000000`;
}

/** Épicerie Hassan — commerce, consistent daily sales */
function generateEpicerieEntries(): EntryRow[] {
  const rows: EntryRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = date.getDay(); // 0=Sun
    // Sales: higher Fri-Sat (dow 5-6)
    const salesBase = dow >= 5 ? 1800 : 1200;
    rows.push({
      id: makeEntryId("e910", d, 1),
      businessId: ID.epicerie,
      offlineId: eid("epi", d, 1),
      type: "income",
      amount: pick(d * 7 + 1, salesBase, salesBase + 600) * 100,
      category: "sales",
      description: null,
      entryDate: date,
      source: "manual",
    });
    // Stock purchase twice a week (Mon + Thu = dow 1,4)
    if (dow === 1 || dow === 4) {
      rows.push({
        id: makeEntryId("e910", d, 2),
        businessId: ID.epicerie,
        offlineId: eid("epi", d, 2),
        type: "expense",
        amount: pick(d * 13 + 2, 1500, 2800) * 100,
        category: "stock_purchase",
        description: "Réapprovisionnement",
        entryDate: date,
        source: "manual",
      });
    }
    // Rent on 1st of month
    if (date.getDate() === 1) {
      rows.push({
        id: makeEntryId("e910", d, 3),
        businessId: ID.epicerie,
        offlineId: eid("epi", d, 3),
        type: "expense",
        amount: 350000, // 3 500 MAD
        category: "rent",
        description: "Loyer mensuel",
        entryDate: date,
        source: "manual",
      });
    }
    // Transport on Saturdays
    if (dow === 6) {
      rows.push({
        id: makeEntryId("e910", d, 4),
        businessId: ID.epicerie,
        offlineId: eid("epi", d, 4),
        type: "expense",
        amount: pick(d * 5 + 4, 200, 350) * 100,
        category: "transport",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
  }
  return rows;
}

/** Salon Fatima — beauty, Tue–Sat only */
function generateSalonEntries(): EntryRow[] {
  const rows: EntryRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = date.getDay();
    // Open Tue–Sat (dow 2–6)
    if (dow >= 2 && dow <= 6) {
      rows.push({
        id: makeEntryId("5a10", d, 1),
        businessId: ID.salon,
        offlineId: eid("sal", d, 1),
        type: "income",
        amount: pick(d * 11 + 3, 350, 750) * 100,
        category: "sales",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
    // Rent 1st of month
    if (date.getDate() === 1) {
      rows.push({
        id: makeEntryId("5a10", d, 2),
        businessId: ID.salon,
        offlineId: eid("sal", d, 2),
        type: "expense",
        amount: 200000, // 2 000 MAD
        category: "rent",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
    // Utilities 15th of month
    if (date.getDate() === 15) {
      rows.push({
        id: makeEntryId("5a10", d, 3),
        businessId: ID.salon,
        offlineId: eid("sal", d, 3),
        type: "expense",
        amount: 30000, // 300 MAD
        category: "utilities",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
  }
  return rows;
}

/** Atelier Mohammed — artisanat, irregular project-based */
function generateAtelierEntries(): EntryRow[] {
  const rows: EntryRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = date.getDay();
    // Project income roughly every 7–10 days
    if (d % 8 === 0 || d % 11 === 0) {
      rows.push({
        id: makeEntryId("a7e0", d, 1),
        businessId: ID.atelier,
        offlineId: eid("ate", d, 1),
        type: "income",
        amount: pick(d * 17 + 5, 2000, 8000) * 100,
        category: "sales",
        description: "Commande zellige",
        entryDate: date,
        source: "manual",
      });
    }
    // Materials bi-weekly (Mon dow=1)
    if (dow === 1 && d % 14 < 7) {
      rows.push({
        id: makeEntryId("a7e0", d, 2),
        businessId: ID.atelier,
        offlineId: eid("ate", d, 2),
        type: "expense",
        amount: pick(d * 9 + 6, 800, 2000) * 100,
        category: "stock_purchase",
        description: "Matières premières",
        entryDate: date,
        source: "manual",
      });
    }
    // Transport monthly
    if (date.getDate() === 20) {
      rows.push({
        id: makeEntryId("a7e0", d, 3),
        businessId: ID.atelier,
        offlineId: eid("ate", d, 3),
        type: "expense",
        amount: 40000, // 400 MAD
        category: "transport",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
  }
  return rows;
}

/** Restaurant Khadija — food, daily high volume */
function generateRestaurantEntries(): EntryRow[] {
  const rows: EntryRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = date.getDay();
    // Daily sales — higher on weekends
    const salesBase = dow === 0 || dow === 6 ? 2500 : 1600;
    rows.push({
      id: makeEntryId("1e50", d, 1),
      businessId: ID.restaurant,
      offlineId: eid("res", d, 1),
      type: "income",
      amount: pick(d * 19 + 7, salesBase, salesBase + 800) * 100,
      category: "sales",
      description: null,
      entryDate: date,
      source: "manual",
    });
    // Daily supplies
    rows.push({
      id: makeEntryId("1e50", d, 2),
      businessId: ID.restaurant,
      offlineId: eid("res", d, 2),
      type: "expense",
      amount: pick(d * 23 + 8, 400, 800) * 100,
      category: "stock_purchase",
      description: "Marché",
      entryDate: date,
      source: "manual",
    });
    // Rent 1st of month
    if (date.getDate() === 1) {
      rows.push({
        id: makeEntryId("1e50", d, 3),
        businessId: ID.restaurant,
        offlineId: eid("res", d, 3),
        type: "expense",
        amount: 500000, // 5 000 MAD
        category: "rent",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
    // Staff 10th and 25th
    if (date.getDate() === 10 || date.getDate() === 25) {
      rows.push({
        id: makeEntryId("1e50", d, 4),
        businessId: ID.restaurant,
        offlineId: eid("res", d, 4),
        type: "expense",
        amount: 300000, // 3 000 MAD
        category: "staff",
        description: "Salaire",
        entryDate: date,
        source: "manual",
      });
    }
  }
  return rows;
}

/** Électricien Omar — construction, irregular projects */
function generateElectriciteEntries(): EntryRow[] {
  const rows: EntryRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = date.getDay();
    // Project income every ~9 days
    if (d % 9 === 0) {
      rows.push({
        id: makeEntryId("e1e0", d, 1),
        businessId: ID.electricite,
        offlineId: eid("ele", d, 1),
        type: "income",
        amount: pick(d * 29 + 9, 2000, 6000) * 100,
        category: "sales",
        description: "Travaux électricité",
        entryDate: date,
        source: "manual",
      });
    }
    // Equipment purchase monthly
    if (date.getDate() === 5) {
      rows.push({
        id: makeEntryId("e1e0", d, 2),
        businessId: ID.electricite,
        offlineId: eid("ele", d, 2),
        type: "expense",
        amount: pick(d * 31 + 10, 500, 1500) * 100,
        category: "equipment",
        description: "Matériel",
        entryDate: date,
        source: "manual",
      });
    }
    // Transport weekly on Wed
    if (dow === 3) {
      rows.push({
        id: makeEntryId("e1e0", d, 3),
        businessId: ID.electricite,
        offlineId: eid("ele", d, 3),
        type: "expense",
        amount: pick(d * 37 + 11, 300, 500) * 100,
        category: "transport",
        description: null,
        entryDate: date,
        source: "manual",
      });
    }
  }
  return rows;
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Setting admin RLS context...");
  await db.execute(sql`SELECT set_config('app.current_user', ${ID.hassan}, false)`);
  await db.execute(sql`SELECT set_config('app.current_role', 'admin', false)`);

  // ── Microfinance Partners ──────────────────────────────────────────────────
  console.log("🏦 Seeding microfinance partners...");
  await db
    .insert(microfinancePartners)
    .values([
      {
        id: ID.alamana,
        name: "Al Amana",
        logoUrl: "https://kasb.ma/logos/alamana.png",
        minScore: 40,
        cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir"],
        contactPhone: "+212522000001",
        websiteUrl: "https://www.alamana.org",
        active: true,
      },
      {
        id: ID.fondep,
        name: "Fondep",
        logoUrl: "https://kasb.ma/logos/fondep.png",
        minScore: 55,
        cities: ["Casablanca", "Rabat", "Fès", "Meknès"],
        contactPhone: "+212537000001",
        websiteUrl: "https://www.fondep.com",
        active: true,
      },
      {
        id: ID.ardi,
        name: "Ardi",
        logoUrl: "https://kasb.ma/logos/ardi.png",
        minScore: 60,
        cities: ["Casablanca", "Marrakech", "Agadir", "Ouarzazate"],
        contactPhone: "+212524000001",
        websiteUrl: "https://www.ardi.ma",
        active: true,
      },
    ])
    .onConflictDoNothing();

  // ── Loan Products ──────────────────────────────────────────────────────────
  console.log("📋 Seeding loan products...");
  await db
    .insert(loanProducts)
    .values([
      // Al Amana
      {
        id: "00000000-0000-0000-0005-000000000001",
        partnerId: ID.alamana,
        name: "Micro-crédit solidaire",
        minAmount: 200000, // 2 000 MAD
        maxAmount: 5000000, // 50 000 MAD
        maxDurationMonths: 24,
        interestRateBps: 1200, // 12%
        targetCategory: null,
        description: "Financement pour toute activité génératrice de revenus",
      },
      {
        id: "00000000-0000-0000-0005-000000000002",
        partnerId: ID.alamana,
        name: "Crédit commerce",
        minAmount: 500000, // 5 000 MAD
        maxAmount: 15000000, // 150 000 MAD
        maxDurationMonths: 36,
        interestRateBps: 1000, // 10%
        targetCategory: "commerce" as const,
        description: "Financement dédié aux activités commerciales",
      },
      // Fondep
      {
        id: "00000000-0000-0000-0005-000000000003",
        partnerId: ID.fondep,
        name: "Mourabaha entreprise",
        minAmount: 1000000, // 10 000 MAD
        maxAmount: 30000000, // 300 000 MAD
        maxDurationMonths: 48,
        interestRateBps: 900, // 9%
        targetCategory: null,
        description: "Financement islamique conforme Charia pour les TPE",
      },
      // Ardi
      {
        id: "00000000-0000-0000-0005-000000000004",
        partnerId: ID.ardi,
        name: "Crédit artisanat",
        minAmount: 500000,
        maxAmount: 10000000, // 100 000 MAD
        maxDurationMonths: 36,
        interestRateBps: 1100, // 11%
        targetCategory: "artisanat" as const,
        description: "Financement spécifique pour les artisans",
      },
    ])
    .onConflictDoNothing();

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log("👥 Seeding demo users...");
  await db
    .insert(users)
    .values([
      {
        id: ID.hassan,
        phone: "+212600000001",
        name: "Hassan Benali",
        role: "owner",
        city: "Casablanca",
        language: "dz",
        isActive: true,
        phoneVerified: true,
      },
      {
        id: ID.fatima,
        phone: "+212600000002",
        name: "Fatima Zahra",
        role: "owner",
        city: "Rabat",
        language: "dz",
        isActive: true,
        phoneVerified: true,
      },
      {
        id: ID.mohammed,
        phone: "+212600000003",
        name: "Mohammed Filali",
        role: "owner",
        city: "Fès",
        language: "dz",
        isActive: true,
        phoneVerified: true,
      },
      {
        id: ID.khadija,
        phone: "+212600000004",
        name: "Khadija Amrani",
        role: "owner",
        city: "Marrakech",
        language: "fr",
        isActive: true,
        phoneVerified: true,
      },
      {
        id: ID.omar,
        phone: "+212600000005",
        name: "Omar Tazi",
        role: "owner",
        city: "Tanger",
        language: "dz",
        isActive: true,
        phoneVerified: true,
      },
    ])
    .onConflictDoNothing();

  // ── Business Profiles ──────────────────────────────────────────────────────
  console.log("🏪 Seeding business profiles...");
  await db
    .insert(businessProfiles)
    .values([
      {
        id: ID.epicerie,
        userId: ID.hassan,
        name: "Épicerie Hassan",
        category: "commerce",
        city: "Casablanca",
        neighborhood: "Derb Sultan",
        hasFixedPremises: true,
        isAutoEntrepreneur: false,
        monthlyRevenueEstimate: 4500000, // ~45 000 MAD
      },
      {
        id: ID.salon,
        userId: ID.fatima,
        name: "Salon Fatima",
        category: "beauty",
        city: "Rabat",
        neighborhood: "Agdal",
        hasFixedPremises: true,
        isAutoEntrepreneur: false,
      },
      {
        id: ID.atelier,
        userId: ID.mohammed,
        name: "Atelier Zellige Mohammed",
        category: "artisanat",
        city: "Fès",
        neighborhood: "Médina",
        hasFixedPremises: true,
        isAutoEntrepreneur: false,
      },
      {
        id: ID.restaurant,
        userId: ID.khadija,
        name: "Restaurant Khadija",
        category: "food",
        city: "Marrakech",
        neighborhood: "Guéliz",
        hasFixedPremises: true,
        isAutoEntrepreneur: true,
        rnaNumber: "AE-2024-MKS-00472",
      },
      {
        id: ID.electricite,
        userId: ID.omar,
        name: "Électricité Omar",
        category: "construction",
        city: "Tanger",
        neighborhood: "Centre",
        hasFixedPremises: false,
        isAutoEntrepreneur: false,
      },
    ])
    .onConflictDoNothing();

  // ── Cash Entries ───────────────────────────────────────────────────────────
  console.log("📒 Generating 90 days of cash entries...");
  const allEntries = [
    ...generateEpicerieEntries(),
    ...generateSalonEntries(),
    ...generateAtelierEntries(),
    ...generateRestaurantEntries(),
    ...generateElectriciteEntries(),
  ];

  // Insert in batches of 100 to avoid query size limits
  for (let i = 0; i < allEntries.length; i += 100) {
    const batch = allEntries.slice(i, i + 100);
    await db
      .insert(cashEntries)
      .values(
        batch.map((e) => ({
          id: e.id,
          businessId: e.businessId,
          offlineId: e.offlineId,
          type: e.type,
          amount: e.amount,
          category: e.category,
          description: e.description,
          entryDate: e.entryDate,
          source: e.source,
        })),
      )
      .onConflictDoNothing();
  }
  console.log(`   ✓ ${allEntries.length} entries inserted`);

  // ── Customers + Debt Entries ───────────────────────────────────────────────
  console.log("👤 Seeding customers and debt entries...");
  await db
    .insert(customers)
    .values([
      {
        id: ID.rachid,
        businessId: ID.epicerie,
        name: "Rachid Benali",
        phone: "+212661000001",
        outstandingDebt: 75000, // 750 MAD
        lastTransactionAt: daysAgo(3),
      },
      {
        id: ID.aicha,
        businessId: ID.epicerie,
        name: "Aicha Tazi",
        phone: "+212661000002",
        outstandingDebt: 120000, // 1 200 MAD
        lastTransactionAt: daysAgo(7),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(debtEntries)
    .values([
      // Rachid: bought 1000 MAD on credit, paid back 250 MAD
      {
        id: "00000000-0000-0000-0006-000000000001",
        customerId: ID.rachid,
        businessId: ID.epicerie,
        amount: 100000, // 1 000 MAD owed
        description: "Achats épicerie",
        entryDate: daysAgo(10),
      },
      {
        id: "00000000-0000-0000-0006-000000000002",
        customerId: ID.rachid,
        businessId: ID.epicerie,
        amount: -25000, // 250 MAD repayment
        description: "Remboursement partiel",
        entryDate: daysAgo(3),
      },
      // Aicha: 1200 MAD outstanding
      {
        id: "00000000-0000-0000-0006-000000000003",
        customerId: ID.aicha,
        businessId: ID.epicerie,
        amount: 120000, // 1 200 MAD
        description: "Achats crédit",
        entryDate: daysAgo(7),
      },
    ])
    .onConflictDoNothing();

  // ── Credit Scores ──────────────────────────────────────────────────────────
  console.log("📊 Seeding credit scores...");
  const now = new Date();
  await db
    .insert(creditScores)
    .values([
      {
        id: "00000000-0000-0000-0007-000000000001",
        businessId: ID.epicerie,
        score: 72,
        components: {
          revenueConsistency: 22,
          expenseControl: 18,
          growthTrend: 14,
          debtRecoveryRate: 10,
          dataRichness: 8,
        },
        monthsOfData: 3,
        eligiblePartnerIds: [ID.alamana, ID.fondep],
        computedAt: now,
      },
      {
        id: "00000000-0000-0000-0007-000000000002",
        businessId: ID.salon,
        score: 68,
        components: {
          revenueConsistency: 20,
          expenseControl: 19,
          growthTrend: 13,
          debtRecoveryRate: 10,
          dataRichness: 6,
        },
        monthsOfData: 3,
        eligiblePartnerIds: [ID.alamana, ID.fondep],
        computedAt: now,
      },
      {
        id: "00000000-0000-0000-0007-000000000003",
        businessId: ID.atelier,
        score: 55,
        components: {
          revenueConsistency: 15,
          expenseControl: 16,
          growthTrend: 12,
          debtRecoveryRate: 8,
          dataRichness: 4,
        },
        monthsOfData: 3,
        eligiblePartnerIds: [ID.alamana, ID.fondep],
        computedAt: now,
      },
      {
        id: "00000000-0000-0000-0007-000000000004",
        businessId: ID.restaurant,
        score: 82,
        components: {
          revenueConsistency: 27,
          expenseControl: 20,
          growthTrend: 18,
          debtRecoveryRate: 12,
          dataRichness: 5,
        },
        monthsOfData: 3,
        eligiblePartnerIds: [ID.alamana, ID.fondep, ID.ardi],
        computedAt: now,
      },
      {
        id: "00000000-0000-0000-0007-000000000005",
        businessId: ID.electricite,
        score: 45,
        components: {
          revenueConsistency: 12,
          expenseControl: 14,
          growthTrend: 8,
          debtRecoveryRate: 5,
          dataRichness: 6,
        },
        monthsOfData: 3,
        eligiblePartnerIds: [ID.alamana],
        computedAt: now,
      },
    ])
    .onConflictDoNothing();

  // ── AE Registration Progress (Khadija, in progress) ───────────────────────
  console.log("📝 Seeding AE registration progress...");
  await db
    .insert(aeRegistrationProgress)
    .values({
      id: ID.aeKhadija,
      businessId: ID.restaurant,
      steps: [
        {
          id: "ae-step-1",
          title: "Vérifier mon éligibilité",
          status: "done",
          completedAt: daysAgo(45),
        },
        {
          id: "ae-step-2",
          title: "Créer un compte sur rn.ae.gov.ma",
          status: "done",
          completedAt: daysAgo(30),
        },
        {
          id: "ae-step-3",
          title: "Remplir le formulaire d'inscription",
          status: "in_progress",
        },
        {
          id: "ae-step-4",
          title: "Soumettre la demande",
          status: "pending",
        },
        {
          id: "ae-step-5",
          title: "Recevoir le certificat AE",
          status: "pending",
        },
      ],
    })
    .onConflictDoNothing();

  console.log("✅ Seed complete!");
  console.log("   Demo login: +212600000001 / OTP 123456 (dev)");
  console.log(`   Hassan's score: 72 | Khadija's score: 82 | Omar's score: 45`);

  await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
