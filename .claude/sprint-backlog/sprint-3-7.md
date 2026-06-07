# Sprint 3 — Offline-First PWA + Sync + Voice + OCR

**Duration**: 2 sessions | **Depends on**: Sprint 2

## Must
- [x] S3-01 — PWA Engineer: IndexedDB schema (cash_entries_local, sync_queue, customers_local) + idb library setup — **PWA Engineer**
- [x] S3-02 — PWA Engineer: offline create entry → IndexedDB → sync queue → POST /api/sync when online — **PWA Engineer**
- [x] S3-03 — Backend: POST /api/sync endpoint (auth required, businessId from session, offlineId dedup) — **Backend Dev**
- [x] S3-04 — PWA Engineer: voice entry (Web Speech API, ar-MA locale, Darija number parsing) — **PWA Engineer**
- [x] S3-05 — PWA Engineer: receipt OCR (photo → Vision API → ReceiptDraft pre-fill → user confirms) — **PWA Engineer**
- [x] S3-06 — Frontend: sync status indicator (offline badge / pending N / syncing / synced) — **Frontend Dev**
- [x] S3-07 — Tester: offline→online idempotency (replay same offlineId → 1 entry), voice fixtures, OCR confidence gate — **Tester**
- [x] S3-08 — Sprint 3 snapshot → ask for Sprint 4

---

# Sprint 4 — Customer Debt Book + WhatsApp Receipts

**Duration**: 1 session | **Depends on**: Sprint 3

## Must
- [x] S4-01 — Backend: customer + debt entry actions (add customer, record credit sale, record repayment) — **Backend Dev**
- [x] S4-02 — Frontend: customer list + debt balance + transaction history — **Frontend Dev**
- [x] S4-03 — Frontend: WhatsApp receipt — format entry as plain text → `wa.me/?text=...` deep link — **Frontend Dev**
- [x] S4-04 — packages/whatsapp: `formatReceipt(entry, business)` → WhatsApp-friendly string (Darija + FR) — **Backend Dev**
- [x] S4-05 — pg-boss: `debt.reminders` job — customers with unpaid debt > 7 days → in-app notification — **Backend Dev**
- [x] S4-06 — Tester: debt book math, WhatsApp link format, reminder job idempotency — **Tester**
- [x] S4-07 — Sprint 4 snapshot → ask for Sprint 5

---

# Sprint 5 — Credit Score + Microfinance Marketplace

**Duration**: 2 sessions | **Depends on**: Sprint 4

## Must
- [ ] S5-01 — Credit Engine: `computeCreditScore()` — 5 components, documented formula — **Credit Engine**
- [ ] S5-02 — Credit Engine: `matchPartners()` — filter eligible partners by score + city — **Credit Engine**
- [ ] S5-03 — Backend: `score.sweep` pg-boss job (nightly; skip if < 30 entries/30 days) — **Backend Dev**
- [ ] S5-04 — Frontend: score dashboard (score ring + 5 component bars + "what this means" explainer) — **Frontend Dev**
- [ ] S5-05 — Frontend: score progress page (how to improve each component, days until next milestone) — **Frontend Dev**
- [ ] S5-06 — Backend: microfinance partner + product seed + listing — **Backend Dev**
- [ ] S5-07 — Frontend: partner cards (name, logo, score required, loan range, eligibility badge) — **Frontend Dev**
- [ ] S5-08 — Backend: credit application action (consent check, score snapshot, status tracking) — **Backend Dev**
- [ ] S5-09 — Frontend: application form (requested amount) + consent text + status tracker — **Frontend Dev**
- [ ] S5-10 — Tester: score formula (component sum = total), partner matching, consent required before apply — **Tester**
- [ ] S5-11 — Sprint 5 snapshot → ask for Sprint 6

---

# Sprint 6 — AE Pathway + Stock Tracker + Notifications

**Duration**: 1–2 sessions | **Depends on**: Sprint 5

## Must
- [x] S6-01 — Backend: AE registration progress actions (steps CRUD, save progress) — **Backend Dev**
- [x] S6-02 — Frontend: AE readiness quiz + income simulation (uses cash book data) — **Frontend Dev**
- [x] S6-03 — Frontend: AE registration wizard (5 steps: quiz → simulation → RNAE link → declaration guide → done) — **Frontend Dev**
- [x] S6-04 — Backend: stock item actions (create, update stock, record sale deduction) — **Backend Dev**
- [x] S6-05 — Frontend: stock tracker (item list + current levels + low-stock highlight) — **Frontend Dev**
- [x] S6-06 — pg-boss: `stock.alerts` job → low stock → push notification — **Backend Dev**
- [x] S6-07 — PWA Engineer: push notification subscription + VAPID setup — **PWA Engineer**
- [x] S6-08 — Content Editor: complete dz.json + fr.json sweep; zero gaps — **Content Editor**
- [x] S6-09 — Tester: AE simulation math, stock deduction, push notification delivery — **Tester**
- [x] S6-10 — Sprint 6 snapshot → ask for Sprint 7

---

# Sprint 7 — Admin/Partner Dashboards + Security + Deploy → v0.1 SHIP

**Duration**: 1–2 sessions | **Depends on**: Sprint 6

## Must
- [ ] S7-01 — Frontend: admin dashboard — KPIs (DAU, entries/day, scores computed, credit apps, formalization rate) — **Frontend Dev**
- [ ] S7-02 — Frontend: partner dashboard — assigned leads, application status, update — **Frontend Dev**
- [ ] S7-03 — Security: OTP hardening — 5-min expiry, 3-attempt lockout, rate-limit — **Security Engineer**
- [ ] S7-04 — Security: phone PII audit — not in logs, not in partner API responses, encrypted at rest — **Security Engineer**
- [ ] S7-05 — Security: append-only enforcement + audit-log coverage on financial mutations — **Security Engineer**
- [ ] S7-06 — Security: partner isolation — sees only own leads (RLS) — **Security Engineer**
- [ ] S7-07 — Tech Lead: Lighthouse audit — PWA score, TTI on 3G, offline smoke — **Tech Lead**
- [ ] S7-08 — DevOps: deploy path A (Vercel + Neon) + B (`docker compose up -d`) — **DevOps**
- [ ] S7-09 — Deployment: verify both paths; offline smoke on deployed version — **Deployment**
- [ ] S7-10 — Tester: full regression + offline + OTP + credit + partner isolation + E2E — **Tester**
- [ ] S7-11 — README.md + .env.example complete — **Project Manager**
- [ ] S7-12 — Final DoD: all 22 items ✅ — **Project Monitor** → v0.1 SHIPPED

## DoD — Sprint 7 (= v0.1 SHIPPED)
- [ ] Phone OTP: 5-min expiry + 3-attempt lockout + rate-limit proven
- [ ] Offline sync idempotency: tested and passing
- [ ] Cash entries append-only: no DELETE by owner; correction flow works
- [ ] Credit score: transparent formula; consent before partner share
- [ ] Kasb never lends: no payment processing on platform
- [ ] Partner isolation: RLS tested
- [ ] PWA: installable, offline-capable, push notifications
- [ ] Darija + French complete; RTL correct
- [ ] Lighthouse PWA score ≥ 90; TTI on 3G < 4s
- [ ] `pnpm build` 0 errors; `pnpm test` green; `pnpm lint` clean; gitleaks passes
