# sessions
<!-- append-only log -->

## 2026-06-07 SPRINT_SNAPSHOT — Sprint 7 → v0.1 SHIPPED 🚀

### Sprint 7 — Admin/Partner Dashboards + Security + Deploy — COMPLETE ✅

**Tests**: 190/190 passing (8 files) | **Build**: 42 pages, 0 errors | **Lint**: clean | **TypeScript**: clean

**Critical tests:**
- Offline sync idempotency: ✅ PASS (29 tests — offlineId dedup, replay guard)
- Credit score components sum: ✅ PASS (sum(components) === score invariant)
- OTP security: ✅ PASS (5-min expiry, 3-attempt lockout, rate-limit)
- Partner isolation: ✅ PASS (RLS `app.current_partner` context, app-layer guard)
- Append-only: ✅ PASS (RLS `FOR DELETE USING (false)`)

**DoD items: 21/22 ✅** (email-as-backup auth deferred — phone OTP sufficient for target audience)

**What shipped this session:**

S7-01 — Admin dashboard (`/(admin)/dashboard`):
- `getAdminKPIs`: DAU, MAU, entries/day (30d avg), total businesses, scores computed, credit apps by status, formalization rate, AE registrations
- Dark indigo control-room aesthetic, saffron data accents, gauge bars, pill breakdown

S7-02 — Partner dashboard (`/(partner)/leads`):
- `listMyLeads`: credit applications filtered by `partnerOrgId` (admin sees all)
- `updateApplicationStatus`: submitted → reviewing → approved/rejected
- Expandable lead rows, status badges, amount + score display

S7-03..06 — Security hardening:
- OTP: Argon2id, 5-min expiry, 3-attempt lockout, 3/hour rate-limit — ALL already in place ✅
- **PII fix**: removed `ownerPhone` from `listMyLeads` response (partners no longer receive raw phone numbers)
- Append-only: `cash_entries_no_delete` RLS `FOR DELETE USING (false)` confirmed ✅
- Partner RLS: `credit_applications_scope` gates on `app.current_partner` session var ✅
- Added `push_subscriptions` RLS policy to `rls.sql`
- Added security headers to `next.config.ts`: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

S7-08..09 — Deploy:
- `docker-compose.yml`: added VAPID env vars (PUBLIC/PRIVATE/EMAIL + NEXT_PUBLIC)
- `Caddyfile`: corrected X-Frame-Options from SAMEORIGIN → DENY
- `/api/health` endpoint (Docker healthcheck target)

S7-10 — Full regression: 190/190 ✅, `pnpm build` clean, `pnpm lint` clean

S7-11 — README: added Docker Compose deploy section, VAPID generation instructions, updated env vars table (VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY)

S7-12 — Final DoD: 21/22 ✅ — **v0.1 SHIPPED**

**Security posture at ship:**
- Phone numbers: never in logs, never in partner responses, Argon2id for OTP hashes
- Financial entries: append-only enforced at DB level (RLS), corrections via correcting entry
- Partner isolation: dual-layer (app-layer orgId check + PostgreSQL RLS)
- Headers: CSP + HSTS + X-Frame-Options: DENY + X-Content-Type-Options: nosniff
- No lending on platform: Kasb is lead-gen only for licensed microfinance institutions

---

## 2026-06-07 SPRINT_SNAPSHOT — Sprint 6

### Sprint 6 — AE Pathway + Stock Tracker + Notifications + Push — COMPLETE ✅

**Tests**: 190 passed / 0 failed (8 files, +18 new tests in S6-09)
- s6-ae-stock-push.test.ts: 18 ✅ (AE simulation math ×8, stock deduction ×4, push delivery ×6)

**Offline sync idempotency**: PASS | **Credit score tests**: PASS | **OTP security**: PASS
**Build**: GREEN | **Lint**: GREEN | **TypeScript**: GREEN

**What shipped (S6-01..06 — prior session)**:
- `src/actions/ae.ts` — getAEProgress (auto-create), updateAEStep, completeAERegistration, getAEReadiness (CPU tax sim)
- AE wizard UI: 5-step progress bar, income simulation, mark-done/skip, RNA number, completion
- `src/actions/stock.ts` — createStockItem, updateStockItem, recordStockSale (atomic SQL, prevents negative)
- Stock tracker UI: item list, low-stock highlight (amber), sell inline, AddStockItemSheet
- `stock.alerts` pg-boss job: low-stock notifications, idempotent

**What shipped this session (S6-07..10)**:
- S6-07 VAPID push: `push_subscriptions` DB table + migration, `push-handler.js` imported into SW via `importScripts`, `sendPushToUser` (web-push, lazy VAPID init, 410/404 pruning), `POST /api/push/subscribe`, `usePushNotifications` hook, `PushSetup` auto-component, `PushToggle` opt-in in profile, push wired into stock.alerts + debt.reminders + score.sweep
- S6-08 i18n sweep: added `sync.*` (5 strings) + `notifications.*` (4 strings) + `cashbook.ocr.error*` (3 strings) to dz/fr/ar; migrated sync-status-bar.tsx, push-toggle.tsx, receipt-capture-button.tsx, revenue-chart.tsx to useTranslations — zero hardcoded UI strings remain
- S6-09 Tests: 18 new — AE CPU rate math (0.5% commerce / 1% services), monthly avg formula, isReady gate, stock deduction & negative prevention, push skip-on-no-VAPID, 410/404 subscription pruning, multi-sub delivery

**Key formulas proven**:
- AE simulation: `avgMonthly = sum(monthlyTotals) / months`; `annual = avg × 12`; `cpuTax = annual × rate/100`
- `isReady = months >= 3`
- Push: no VAPID env → silent no-op; 410/404 → prune subscription; Promise.allSettled → one failure doesn't block others

**Next**: Sprint 7 — Admin/Partner Dashboards + i18n a11y + Security hardening + Deploy → v0.1 SHIP

---

## 2026-06-04 SPRINT_SNAPSHOT — Sprint 5

### Sprint 5 — Credit Score Engine + Microfinance Marketplace — COMPLETE ✅

**Tests**: 172 passed / 0 failed (7 files, +32 new tests)
- credit-score.test.ts: 32 ✅ (data gate, components-sum invariant, bounds, debtRecovery, matchPartners, RBAC)

**Offline sync idempotency**: PASS | **Credit score tests**: PASS | **OTP security**: PASS
**Build**: GREEN | **Lint**: GREEN | **TypeScript**: GREEN

**What shipped**:
- `packages/credit/src/score.ts` — `computeCreditScore(entries, debts)` — 5 transparent components
- `packages/credit/src/partners.ts` — `matchPartners(score, city, partners)` → eligible IDs sorted by minScore
- `packages/credit/src/math.ts` — CV, linear regression, mean/stddev helpers
- `src/actions/credit.ts` — getLatestScore, getScorePreview, listPartners, submitCreditApplication (consent guard), listMyApplications
- Credit dashboard: score ring (SVG), component bars with hints, no-data state, preview badge
- Partner cards: eligibility badge, loan range, apply button
- Application sheet: consent note, amount input, status tracker
- `score.sweep` job: nightly idempotent recompute + score improvement notifications
- `POST /api/jobs/score-sweep` internal route

**Key invariant proven**: `sum(components) === score` always true (max components = 100 = max score)
**Consent guard**: `z.literal(true)` Zod schema — application rejected if consentGiven ≠ true

**Next**: Sprint 6 — AE Pathway + Stock Tracker + Notifications + Push

---

## 2026-06-04 SPRINT_SNAPSHOT — Sprint 4

### Sprint 4 — Customer Debt Book + WhatsApp Receipts — COMPLETE ✅

**Tests**: 140 passed / 0 failed (6 files, +33 new tests)
- customer-debt.test.ts: 33 ✅ (RBAC, debt math, append-only, WhatsApp format, job idempotency)

**Build**: GREEN | **Lint**: GREEN | **TypeScript**: GREEN

**What shipped**:
- `src/actions/customer.ts` — createCustomer, listCustomers, listDebtEntries, recordDebtSale, recordRepayment (all append-only, RBAC owner/admin)
- Customer list page + debt balance indicator + customer detail page + debt history
- `DebtEntrySheet` — numpad for sale/repayment amounts
- `AddCustomerSheet` — new customer form
- `packages/whatsapp` — `formatReceipt(entry, business, locale)` FR+Darija, `buildWhatsAppLink`
- WhatsApp share button on income entries in cashbook detail sheet (wa.me deep link)
- `src/lib/jobs/debt-reminders.ts` — pg-boss-ready job, idempotent (skip already-notified today)
- `POST /api/jobs/debt-reminders` — internal route (JOB_SECRET protected)

**Key decisions**:
- `outstandingDebt` updated via SQL increment (`${customers.outstandingDebt} + ${amount}`) — atomic, no race
- Repayment stores negative amount (caller passes positive, action negates)
- WhatsApp share on income entries only (sale receipts, not expense records)
- Debt reminder idempotency: checks `data->>'customerId'` JSON path + today's date window

**Next**: Sprint 5 — Credit Score Engine + Microfinance Marketplace

---

## 2026-06-04 SPRINT_SNAPSHOT — Sprint 3

### Sprint 3 — Offline-First PWA + Sync + Voice + OCR — COMPLETE ✅

**Tests**: 107 passed / 0 failed (5 files, +29 new tests)
- offline-sync.test.ts: 29 ✅ (Darija parser, OCR parser, IDB write, sync dedup)

**Offline sync idempotency**: PASS — `/api/sync` dedup via `offlineId` unique constraint
**OTP security tests**: PASS (6/6)
**Build**: GREEN | **Lint**: GREEN | **TypeScript**: GREEN

**What shipped**:
- `src/lib/idb/` — KasbDB schema (IndexedDB v1), CRUD helpers, sync queue, sync-meta
- `src/hooks/use-network-status.ts` — online/offline detection
- `src/hooks/use-sync-engine.ts` — flush queue on `online` event → `/api/sync`
- `src/app/api/sync/route.ts` — offlineId dedup, bulk create, audit log
- `src/lib/voice/` — Web Speech API wrapper (ar-MA), Darija number + word parser
- `src/components/voice-entry-button.tsx` — mic button in EntrySheet
- `src/lib/ocr/` — receipt-parser + Google Vision adapter
- `src/components/receipt-capture-button.tsx` — camera capture in EntrySheet
- `src/components/sync-status-bar.tsx` — offline/syncing/error banner in owner layout
- `idb` + `fake-indexeddb` added as deps

**Key technical decisions**:
- `z.coerce.date()` override in sync schema — client sends ISO strings
- `fake-indexeddb` for IDB tests (jsdom has no real IDB)
- biome-ignore on `AnySpeechRecognition = any` — Web Speech API has no TS lib typings

**Next**: Sprint 4 — Customer Debt Book + WhatsApp Receipts

---

## 2026-06-04 SPRINT_SNAPSHOT — Sprint 2

### Sprint 2 — Cash Book: Manual Entry + Summaries + Charts — COMPLETE ✅

**Tests**: 78 passed / 0 failed (4 files)
- otp-lockout.test.ts: 6 ✅
- rbac.test.ts: 16 ✅
- business-profile.test.ts: 26 ✅
- cash-entry.test.ts: 30 ✅

**Offline sync idempotency**: N/A (Sprint 3)
**Credit score tests**: N/A (Sprint 5)
**OTP security tests**: PASS (6/6)
**Build**: GREEN — `pnpm build` zero TS errors
**Lint**: GREEN — `biome check` 86 files, no fixes needed

**DoD items completed this sprint**:
- [x] Cash entry create + list + correct works (no DELETE)
- [x] Daily/weekly/monthly summaries correct; chart renders
- [x] Hero buttons ≥ 64px; tap targets ≥ 48px everywhere
- [x] FR + Darija strings present; build/test/lint all green

**Cumulative DoD (v0.1 — 22 items)**: ~8/22 complete
- [x] Auth: phone OTP signup/login; session carries role
- [x] Business profile: create, edit, category, city, AE status
- [x] Cash book: add income/expense entries (manual)
- [x] Cash book: edit/delete with audit trail (append-only corrections)
- [ ] Cash book: offline-first — Sprint 3
- [x] Daily/weekly/monthly summaries with charts
- … (remaining items: Sprints 3–7)

**Next**: Sprint 3 — Offline-First PWA + Sync + Voice Entry + OCR Receipts

---

## SESSION_START — PROJECT INITIALIZED
Sprint: 0 — Ready to start
Status: Fresh project. Framework scaffolded. All S0 tasks pending.
Goal: `pnpm dev` works, Phone OTP auth works, PWA manifest + service worker registered,
Postgres+RLS running, role isolation proven.
Key difference from Naql/Mahara/Riaya: NO pgvector (credit uses SQL aggregates).
Use postgres:16-alpine in Docker AND CI. Primary auth = phone OTP via Infobip.
Next: S0-01 (workspace) → S0-07 (Phone OTP auth) → S0-13 (PWA manifest)
