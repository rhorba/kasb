# Kasb — كسب — Claude Code Project Bible

> This is the root business document. All specialists read this first.
> `.claude/CLAUDE.md` governs HOW the team works.
>
> **Kasb** (كسب — "earnings/gain" in Arabic and Darija) is a mobile-first fintech
> platform giving Morocco's 2 million informal businesses their first real financial tool —
> a digital cash book, alternative credit score, and auto-entrepreneur pathway.

---

## §1 — The Problem (grounded in HCP 2025/2026 data)

Morocco's informal economy is massive and structurally trapped:

- **2.03 million informal production units (UPI)** in Morocco (HCP 2023/2024 survey)
- **85.5% are solo operators** — one person, no employees
- **77.3% are urban** — concentrated in Casablanca-Settat (22.7%)
- **47% in commerce**, 28.3% services, 11.6% construction
- **55.3% have no fixed premises** — operate from streets, markets, or home
- Only **6.2% are affiliated to CPU** (Contribution Professionnelle Unique)
- Only **1.7% have auto-entrepreneur status** despite 500K+ auto-entrepreneurs registered in 2026
- Main barriers: no accounting (no formal comptabilité), no credit history, administrative complexity

**The core trap**: informal businesses cannot get credit because they have no financial history.
They have no financial history because they don't track their finances.
They don't track finances because there are no tools designed for them.

**Kasb breaks this cycle**: a phone-first cash book builds a credit history → unlocks
microfinance access (Al Amana, Fondep, Ardi) → business grows → considers formalization.

---

## §2 — Project Identity

**Name**: Kasb
**Domain**: kasb.ma
**Tagline (FR)**: "Gérez votre argent. Accédez au crédit. Formalisez votre activité."
**Tagline (AR/Darija)**: "دير الحساب ديالك. وصّل للقرض. رسمي النشاط ديالك."
**Type**: B2C SaaS + marketplace (business owners + microfinance partners).
**Audience**:
  - **Business owners (informal)**: street vendors (ferrachins), market stall owners,
    small café/restaurant owners, artisans (zellige makers, cobblers, tailors),
    home-based businesses (cooking, beauty, sewing), construction craftsmen.
    Mostly 25-55, Android phones, 3G/4G, limited formal education.
  - **Microfinance partners**: Al Amana, Fondep, Ardi, Attawfiq — organizations
    looking for qualified leads with 3+ months of verified cash flow history.
  - **Platform Admin**: Internal — partner management, credit score review, KPIs.
**Language**: **Darija primary** (Moroccan Arabic dialect, written in Arabic script),
  French secondary (`fr`), Modern Standard Arabic (`ar`). English optional.
**Tone**: Warm, direct, practical. "Hna maakom" (We're with you). No financial jargon.
  Speak like a helpful friend at the market, not a bank.

### Positioning
> "Not a bank. Not an ERP. The financial tool your business needs before the bank will see you."

---

## §3 — Core Features (v0.1 scope)

### Module A — Digital Cash Book (Carnet Numérique / الدفتر الرقمي)
The core product. Replace the physical notebook every informal business uses.

- **Quick entry**: Tap [Vente +] or [Dépense -] → amount → category → optional note/photo
- **Voice entry**: speak amount + description → parsed and recorded (no typing required)
- **Receipt photo**: photograph a purchase receipt → OCR pre-fills amount/date
- **WhatsApp receipt**: after recording a sale, one tap to send a digital receipt to client
  on WhatsApp (huge in Morocco — every small transaction happens on WhatsApp)
- **Customer credit book (Livre de dettes)**: track customers who owe money ("cr-dit" in Darija)
  — which client owes how much, since when
- **Daily/weekly/monthly summary**: "Today: +1,200 MAD sales, -350 MAD expenses, +850 MAD net"
- **Categories**: Ventes / Achats stock / Loyer / Transport / Personnel / Remboursement / Autre
- **Offline-first**: works with no signal; syncs when connected
- **Export**: PDF summary (monthly) for sharing with microfinance advisor

### Module B — Credit Score Builder (Score de Crédit Alternatif)
The economic unlock. Built from 3+ months of cash book data.

- **Dashboard**: "Votre score Kasb: 68/100 — Éligible au micro-crédit chez Al Amana"
- **Score components**: revenue consistency, expense control, growth trend, debt recovery rate
- **Progress tracker**: "Continuez pendant 2 mois pour atteindre le score requis par Fondep"
- **Partner matching**: based on score + activity type + location → recommended microfinance partners
- **Pre-qualification**: one-tap send of cash flow summary to partner → no physical visit needed
- **Score history**: see how score improved over time

### Module C — Microfinance Marketplace
Connect qualified users to the right partner.

- **Partner directory**: Al Amana, Fondep, Ardi, Attawfiq + product cards (loan amount, rate, duration)
- **Eligibility check**: real-time against user's score and profile
- **Application initiation**: pre-fill application with Kasb data → partner receives lead
- **Appointment booking**: pick nearest agency + time slot
- **Status tracking**: "Votre demande chez Al Amana: En cours d'examen"

### Module D — Auto-Entrepreneur Pathway (Guide AE)
The formalization road. Step-by-step, at the user's own pace.

- **Readiness quiz**: "Êtes-vous prêt à devenir auto-entrepreneur?"
- **Income simulation**: based on cash book data → "Si vous étiez AE, vous paieriez X MAD d'impôt"
- **Registration wizard**: pre-fills rn.ae.gov.ma data from Kasb profile
- **Quarterly declaration helper**: compute the 0.5%/1% CPU declaration with current data
- **Benefits reminder**: CNSS/AMO coverage eligibility explained simply
- **AE + Kasb integration**: once registered as AE, Kasb becomes a mini-accounting tool

### Module E — Stock Tracker (Suivi des Stocks)
Simple inventory for the 47% of UPIs in commerce.

- **Add product**: name + unit + purchase price + selling price
- **Record sale**: deducts from stock automatically (or manually)
- **Low stock alert**: "Il vous reste 5 unités de [product]"
- **Reorder history**: track where you buy each product (supplier + price)
- Simple, not a full WMS. Designed for market stalls.

### Module F — Admin + Partner Dashboard
- Credit score review queue (admin can manually adjust anomalous scores)
- Partner management: onboard Al Amana / Fondep with API credentials
- Platform KPIs: DAU/MAU, cash book entries/day, credit applications, formalization rate
- Fraud detection: flag anomalous cash flow patterns (e.g. sudden 10x revenue spike)

### Cross-cutting (v0.1, non-negotiable)
- **Auth**: phone number + OTP (NOT email — this audience uses phones, not email)
- **PWA**: installable progressive web app — works offline, push notifications, no app store
- **Offline-first**: entire cash book works without internet
- **Darija/FR/AR bilingual** with simplified Arabic (no MSA jargon)
- **Large tap targets**: designed for users with limited smartphone experience
- **Audit log** on all financial mutations

---

## §4 — Out of Scope (v0.1)

| Deferred | Feature |
|---|---|
| **v0.2** | Native React Native app (iOS + Android) |
| **v0.2** | Real WhatsApp Business API integration (use deep link share in v0.1) |
| **v0.2** | Actual credit scoring API integration with microfinance partners |
| **v0.2** | Bank account aggregation / open banking |
| **v0.2** | Team accounts (multiple users per business) |
| **v0.2** | POS (point-of-sale) hardware integration |
| **v0.3** | Government tax portal (DGI) integration for AE declarations |
| **v0.3** | B2B: employer payroll for informal workers |
| **out** | Consumer banking / e-wallet / money transfer |

---

## §5 — Tech Stack (FINAL)

| Concern | Choice | Why |
|---|---|---|
| Web | Next.js 15 App Router + TypeScript strict | PWA capabilities, SSR |
| PWA | next-pwa / service worker | Offline-first, installable |
| Styling | Tailwind v4 + shadcn/ui | |
| DB | PostgreSQL 16 + Drizzle ORM + RLS | |
| Auth | **Phone OTP** via Infobip (primary) + Auth.js v5 | Email auth is secondary; most users have phone-only |
| Money | Integer centimes (MAD) via `Money` type | Never floats |
| Credit scoring | Custom algorithm in `packages/credit` (statistical, no ML service) | Transparent, auditable, configurable |
| Voice entry | Web Speech API (browser-native) + fallback manual | No API cost; works in Moroccan Arabic |
| OCR (receipts) | Google Vision / Tesseract.js (local fallback) behind adapter | Same as Naql/Riaya pattern |
| WhatsApp | `wa.me` deep link (v0.1) → Infobip API (v0.2) | No setup cost in v0.1 |
| Offline sync | IndexedDB (client) + sync queue → pg-boss | PWA offline pattern |
| Jobs | pg-boss (score compute, alert sweeps, sync processing) | |
| Email/SMS | Infobip (OTP + eventual SMS notifications) | Moroccan number support |
| File storage | Cloudflare R2 (receipt photos) | |
| i18n | next-intl (dz/fr/ar), Darija as primary | |
| Testing | Vitest + Playwright | |
| Container | Docker Compose (postgres + web + worker + caddy) | |
| PM | pnpm workspaces | |
| Linting | Biome | |
| CI | GitHub Actions | |

> **CRITICAL UX CONSTRAINT**: The primary user has a mid-range Android (Tecno/Infinix/Samsung A series),
> 3G connectivity, and may have limited literacy. Every UI decision must account for this.
> Kasb must work on a Tecno Spark 10 on 3G in a Casablanca market.

---

## §6 — Data Model (core entities)

```typescript
// packages/core/src/types.ts

type Money = number  // integer centimes (MAD). NEVER a float.

type Role = 'owner' | 'admin' | 'partner'  // owner = business owner

type BusinessCategory = 'commerce' | 'services' | 'artisanat' | 'construction' | 'food' | 'beauty' | 'other'

type EntryType = 'income' | 'expense'

type EntryCategory =
  | 'sales'           // Ventes
  | 'stock_purchase'  // Achats stock
  | 'rent'            // Loyer
  | 'transport'       // Transport
  | 'staff'           // Personnel
  | 'loan_repayment'  // Remboursement prêt
  | 'equipment'       // Équipement
  | 'utilities'       // Eau/Électricité
  | 'other_income'    // Autre revenu
  | 'other_expense'   // Autre dépense

type EntrySource = 'manual' | 'voice' | 'ocr' | 'sync'

type User = {
  id: string
  phone: string                 // primary identifier (Moroccan format: +2126XXXXXXXX)
  name: string
  role: Role
  city?: string
  language: 'dz' | 'fr' | 'ar' // Darija / French / Arabic
  isActive: boolean
  phoneVerified: boolean
  createdAt: Date
}

type BusinessProfile = {
  id: string
  userId: string
  name: string                  // "Épicerie Hassan" or just "Hassan"
  category: BusinessCategory
  city: string
  neighborhood?: string
  hasFixedPremises: boolean
  isAutoEntrepreneur: boolean
  rnaNumber?: string            // RNAE registration number (if AE)
  monthlyRevenuEstimate?: Money // self-declared at signup
  createdAt: Date; updatedAt: Date
}

type CashEntry = {
  id: string
  businessId: string
  type: EntryType               // income or expense
  amount: Money                 // always positive; type determines sign
  category: EntryCategory
  description?: string
  clientId?: string             // linked to customer (for debt tracking)
  receiptPhotoKey?: string      // R2 key (private)
  entryDate: Date               // when the transaction happened (user-set)
  source: EntrySource
  syncedAt?: Date               // null if created offline, set after sync
  offlineId?: string            // client-generated ID for offline dedup
  createdAt: Date
}

type Customer = {
  id: string
  businessId: string
  name: string                  // first name or nickname
  phone?: string
  outstandingDebt: Money        // total owed to business
  lastTransactionAt?: Date
  createdAt: Date
}

type DebtEntry = {
  id: string
  customerId: string
  businessId: string
  amount: Money                 // positive = customer owes; negative = repayment
  description?: string
  entryDate: Date
  createdAt: Date
}

type CreditScore = {
  id: string
  businessId: string
  score: number                 // 0–100
  components: ScoreComponents
  eligiblePartners: string[]    // partner IDs where score qualifies
  computedAt: Date
  monthsOfData: number          // data richness indicator
}

type ScoreComponents = {
  revenueConsistency: number    // 0-30: how regular is monthly revenue
  expenseControl: number        // 0-25: expense/revenue ratio health
  growthTrend: number           // 0-20: revenue growth over months
  debtRecoveryRate: number      // 0-15: % of customer debts collected
  dataRichness: number          // 0-10: how complete and recent the data is
}

type MicrofinancePartner = {
  id: string
  name: string                  // "Al Amana", "Fondep", "Ardi"
  logoUrl: string
  minScore: number              // minimum Kasb score to qualify
  products: LoanProduct[]
  cities: string[]
  contactPhone: string
  websiteUrl?: string
  active: boolean
}

type LoanProduct = {
  id: string
  partnerId: string
  name: string
  minAmount: Money; maxAmount: Money
  maxDurationMonths: number
  interestRateApprox: number    // indicative annual rate
  targetCategory?: BusinessCategory
  description: string
}

type CreditApplication = {
  id: string
  businessId: string
  partnerId: string
  productId?: string
  requestedAmount: Money
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'withdrawn'
  scoreAtApplication: number
  submittedAt: Date
  updatedAt: Date
}

type AERegistrationProgress = {
  id: string
  businessId: string
  steps: AEStep[]
  completedAt?: Date
  rnaNumber?: string
  createdAt: Date
}

type AEStep = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'done' | 'skipped'
  completedAt?: Date
}

type StockItem = {
  id: string
  businessId: string
  name: string
  unit: string                  // "pièce", "kg", "litre", "carton"
  purchasePrice: Money
  sellingPrice: Money
  currentStock: number
  lowStockThreshold: number
  supplierId?: string
  createdAt: Date; updatedAt: Date
}

type AuditLog = {
  id: string
  actorUserId: string
  entity: string; entityId: string
  action: 'create' | 'update' | 'delete' | 'sync' | 'score_compute'
  before?: unknown; after?: unknown; at: Date
}
```

---

## §7 — Roles & Permissions

| Capability | owner | admin | partner |
|---|---|---|---|
| Create / view own cash entries | ✅ | ✅ | — |
| View own credit score | ✅ | ✅ | — |
| Apply to microfinance partner | ✅ | ✅ | — |
| View AE guide + registration | ✅ | ✅ | — |
| Manage own stock | ✅ | ✅ | — |
| Manage own customers / debts | ✅ | ✅ | — |
| View partner dashboard (leads) | — | ✅ | ✅ (own leads) |
| Manage partner products | — | ✅ | ✅ (own) |
| Compute / adjust credit scores | — | ✅ | — |
| View platform KPIs | — | ✅ | limited |
| Fraud flag review | — | ✅ | — |

---

## §8 — Seed / Demo Data

- 5 business profiles: 1 épicerie (commerce, Casablanca), 1 coiffeur (services, Rabat),
  1 artisan (artisanat, Fès), 1 restaurateur (food, Marrakech), 1 électricien (construction, Tanger)
- Each with 90 days of realistic cash entries (income + expenses; seasonal patterns)
- Credit scores computed for all 5 (range: 45–82)
- 3 microfinance partners seeded (Al Amana, Fondep, Ardi) with sample products
- 2 customer debt books
- 1 AE registration in progress
- Demo: hassan@+212600000001 (OTP: 123456 in dev) — épicier, Casablanca, score 72

---

## §9 — Design Identity

- **Aesthetic**: Friendly, approachable, market-stall warmth. Saffron yellow + dark indigo +
  warm white. The energy of a Moroccan souk, not a bank. Zellige-inspired geometric accents.
- **Colors**: Saffron/gold primary (#E8A020) — money, optimism, Morocco.
  Deep indigo secondary (#2D2D6B) — trust, professionalism, night-market depth.
  White surfaces, warm gray backgrounds.
- **Typography**: "Rubik" for latin (geometric, very readable, includes Arabic subset).
  "Noto Kufi Arabic" for Darija/Arabic text — essential for target audience.
  Minimum body size 16px — larger than typical apps (readability).
- **Icons**: Large, recognizable (a MAD coin, a phone, an arrow up/down). No ambiguous icons.
- **Big tap targets**: All interactive elements ≥ 48px. No small text links.
- **Color for money**: Green = income (+), Red = expense (-). Always consistent.
- **Mobile-first at 375px**: Design at 375px. No desktop-first compromise.

---

## §10 — UX Principles

1. **One tap to record**: home screen has [+Vente] and [-Dépense] as hero actions
2. **Darija first**: interface speaks the user's language — not formal Arabic, not French
3. **Works offline**: if connection drops at the market, nothing is lost
4. **No financial jargon**: "Votre argent de ce mois" not "Flux de trésorerie mensuel"
5. **Celebrate progress**: the credit score improves visibly — users get dopamine from tracking
6. **Formalization as choice, not pressure**: AE guide is accessible but never pushy
7. **Forgiveness**: wrong entry? Fix it easily. No locked periods.
8. **WhatsApp-native**: receipts sharable with one tap; the user's clients expect WhatsApp

---

## §11 — Legal & Financial Integrity

1. **CNDP (Law 09-08)**: phone number + financial data is personal data. Encrypted at rest. Role-gated. Export + deletion on request.
2. **Credit score transparency**: score formula is documented and disclosed to users. No black box.
3. **Partner data sharing**: cash flow summary sent to microfinance partner ONLY with explicit user consent at application time. No bulk sharing.
4. **No lending on platform**: Kasb is a lead-generation tool for licensed microfinance institutions. Kasb itself never extends credit. This is critical for regulatory compliance.
5. **Receipt photos**: private R2 bucket. Served via signed URLs. Business owner only.
6. **Financial entries are append-only**: corrections create a new entry, not in-place edits. Audit trail always preserved.
7. **Offline sync idempotency**: client-generated `offlineId` prevents duplicates. Replaying a sync never double-counts.

---

## §12 — Definition of Done (v0.1 — 22 items)

- [ ] Auth: phone OTP signup/login (Infobip); session carries role; email as backup
- [ ] Business profile: create, edit, category, city, AE status
- [ ] Cash book: add income/expense entries (manual, voice, OCR photo)
- [ ] Cash book: edit/delete with audit trail (append-only corrections)
- [ ] Cash book: offline-first — works with no signal; syncs when connected
- [ ] Daily/weekly/monthly summaries with charts
- [ ] Customer debt book: add client, record credit sale, record payment
- [ ] WhatsApp receipt: one-tap share of entry as formatted WhatsApp message
- [ ] Credit score: computed from 3+ months of data; 5 components displayed
- [ ] Microfinance marketplace: partner cards + eligibility + apply
- [ ] Application tracking: status updates for submitted credit applications
- [ ] AE pathway: readiness quiz + income simulation + registration wizard steps
- [ ] Stock tracker: add items, record sales (deducts stock), low-stock alerts
- [ ] Admin dashboard: KPIs (DAU, entries/day, scores computed, applications)
- [ ] Partner dashboard: assigned leads, application status management
- [ ] Notifications: in-app for score improvement, low stock, debt reminders
- [ ] PWA: installable, offline capable, push notifications enabled
- [ ] Darija fully translated; French fully translated; RTL correct
- [ ] `pnpm build` passes, zero TS errors; `pnpm test` all green; `pnpm lint` clean
- [ ] Demo seed loads; demo user sees 90 days of data + credit score
- [ ] Deploy: Vercel + managed Postgres OR `docker compose up -d` end-to-end

---

## §13 — Sprint Roadmap

| Sprint | Goal |
|---|---|
| **Sprint 0** | Scaffold: monorepo, Postgres+Drizzle+RLS, Phone OTP auth, PWA setup, Docker, CI |
| **Sprint 1** | Data model + Business profiles + demo seed |
| **Sprint 2** | Cash book: manual entry + summaries + charts |
| **Sprint 3** | Offline-first PWA + sync + voice entry + OCR receipts |
| **Sprint 4** | Customer debt book + WhatsApp receipt sharing |
| **Sprint 5** | Credit score engine + microfinance marketplace + applications |
| **Sprint 6** | AE pathway + stock tracker + notifications |
| **Sprint 7** | Admin/partner dashboards + i18n Darija/FR + a11y + security + deploy → v0.1 ship |

---

## §14 — Repository Structure

```
kasb/
├── CLAUDE.md
├── .claude/
├── apps/
│   └── web/                        ← Next.js 15 PWA
│       └── src/app/
│           ├── [locale]/(public)/  ← Landing + signup
│           ├── [locale]/(owner)/   ← Main app (cash book, credit, AE, stock)
│           ├── [locale]/(admin)/   ← Admin dashboard
│           └── [locale]/(partner)/ ← Partner dashboard
├── packages/
│   ├── core/        ← Money, Role, RBAC, Zod schemas
│   ├── db/          ← Drizzle schema, migrations, RLS, seed
│   ├── cashbook/    ← Entry logic, summaries, offline sync handler
│   ├── credit/      ← Score algorithm, partner matching
│   ├── inventory/   ← Stock tracker logic
│   ├── whatsapp/    ← Receipt formatter + wa.me deep link generator
│   └── notifications/ ← In-app + push (PWA) notifications
└── .env.example
```

---

## §15 — Auth & Access Model

- **Primary**: Phone number + OTP via Infobip (6-digit, 5-min expiry)
- **Secondary**: Email + password (Argon2id) for users who prefer it
- Session: `{ userId, role, businessId }` — role server-side only
- Three roles: owner / admin / partner
- `withRole(session, allowedRoles, handler)` server action factory
- Offline entries: created with client-generated `offlineId` (UUID); synced when online
- Partner data access: partner can only see leads assigned to them
