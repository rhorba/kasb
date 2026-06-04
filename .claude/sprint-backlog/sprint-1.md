# Sprint 1 — Data Model + Business Profiles + Demo Seed

**Duration**: 1–2 sessions | **Depends on**: Sprint 0

## Must
- [ ] S1-01 — DBA: full schema — `cash_entries` (with offlineId unique constraint), `customers`, `debt_entries`, `stock_items`, `credit_scores`, `microfinance_partners`, `loan_products`, `credit_applications`, `ae_registration_progress`, `notifications`, `audit_logs` — all with RLS — **DBA** → Security
- [ ] S1-02 — Security: review RLS — owner sees only own entries; partner sees only own leads — **Security** → Backend
- [ ] S1-03 — Backend: business profile actions (create, update, get) — **Backend Dev**
- [ ] S1-04 — Frontend: business profile create/edit (category, city, AE status) — **Frontend Dev**
- [ ] S1-05 — DBA + Backend: demo seed — 5 businesses, 90 days of entries each, credit scores computed, 3 partners seeded — **DBA**
- [ ] S1-06 — Content Editor: Darija + FR strings for profile fields, categories, cities — **Content Editor**
- [ ] S1-07 — Tester: role isolation on all new tables; append-only DELETE blocked test — **Tester**
- [ ] S1-08 — Sprint 1 snapshot → ask for Sprint 2

## DoD — Sprint 1
- [ ] All tables with RLS; DELETE blocked on cash_entries by owner
- [ ] Business profile create/edit; demo seed loads
- [ ] offlineId unique constraint in place
- [ ] FR + Darija strings; `pnpm build`/`test`/`lint` green
