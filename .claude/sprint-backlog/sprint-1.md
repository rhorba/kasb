# Sprint 1 — Data Model + Business Profiles + Demo Seed

**Status**: ✅ COMPLETE (2026-06-04)
**Duration**: 1 session | **Depends on**: Sprint 0

## Must
- [x] S1-01 — DBA: full schema — 14 tables, 8 enums, migrations 0000 (initial) + 0001 (partner_org_id) — **DBA** ✅
- [x] S1-02 — Security: RLS hardening — partner isolation (app.current_partner), append-only (cash_entries_no_delete), sign-up insert policy — **Security** ✅
- [x] S1-03 — Backend: business profile actions (getMyProfile, createProfile, updateProfile) — **Backend Dev** ✅
- [x] S1-04 — Frontend: business profile create/edit UI (ProfileForm + ProfilePage) — **Frontend Dev** ✅
- [x] S1-05 — Demo seed: 5 businesses, ~600 entries, 3 MFI partners, credit scores 45–82, 2 customers, 1 AE progress — **DBA** ✅
- [x] S1-06 — i18n: Darija/FR/AR profile strings (neighborhood, rnaNumber, createTitle, etc.) — **Content Editor** ✅
- [x] S1-07 — Tests: 26 new tests (schema, RBAC actions, RLS SQL assertions, seed integrity) — **Tester** ✅
- [x] S1-08 — Sprint 1 snapshot — **Project Monitor** ✅

## DoD — Sprint 1 (4/4 ✅)
- [x] All tables with RLS; DELETE blocked on cash_entries by owner
- [x] Business profile create/edit; demo seed loads
- [x] offlineId unique constraint in place
- [x] FR + Darija strings; `pnpm build`/`test`/`lint` green

## Test count at end of Sprint 1
- 48/48 passing (22 from Sprint 0 + 26 new)
- CI: ✅ all 4 jobs green (GitHub run 26950342898)
