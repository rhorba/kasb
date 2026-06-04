# Sprint 0 — Scaffold + Phone OTP Auth + RBAC + RLS + PWA Setup

**Goal**: `pnpm dev` works. Phone OTP auth working. PWA installable (manifest + service worker). Role isolation proven by test.

**Status**: ✅ COMPLETE (2026-06-04)

**Duration**: 1–2 sessions | **Auto-handoff**: ENABLED

## Must
- [x] S0-01 — pnpm workspace: `apps/web`, `packages/core|db|cashbook|credit|inventory|whatsapp|notifications` — **Tech Lead** ✅
- [x] S0-02 — `apps/web` Next.js 15 + TypeScript strict + Biome + next-pwa setup — **Tech Lead** ✅
- [x] S0-03 — `packages/core`: `Money` type, `Role` enum (owner/admin/partner), RBAC, Zod schemas — **Tech Lead** ✅
- [x] S0-04 — `packages/db`: Drizzle config + full schema (13 tables, 7 enums) — **DBA** ✅
- [x] S0-05 — RLS: `withUserContext` helper; policies on all tables — **DBA** → Security ✅
- [x] S0-06 — DB init SQL: RLS-bound app role (postgres:16-alpine) — **DBA** → DevOps ✅
- [x] S0-07 — Auth.js v5 + Infobip OTP adapter: phone+OTP primary; email+password secondary; session `{ userId, role, businessId }` — **Security Engineer** ✅
- [x] S0-08 — `withRole()` server action factory + `requireSession()` — **Backend Dev** ✅
- [x] S0-09 — Signup: phone → OTP → session → profile guard — **Backend Dev** ✅
- [x] S0-10 — next-intl dz/fr/ar + `[locale]` layout + Darija as default — **Frontend Dev** ✅
- [x] S0-11 — Tailwind v4 + saffron/indigo tokens + shadcn/ui + 48px tap target globals — **UI Designer** ✅
- [x] S0-12 — App shell: bottom nav (4 tabs), home screen with [+Vente] [−Dépense] hero buttons — **Frontend Dev** ✅
- [x] S0-13 — PWA: manifest.json (name: Kasb, colors, icons), service worker (app shell cache), installable — **PWA Engineer** ✅
- [x] S0-14 — Docker Compose (postgres:16-alpine + web + worker + caddy) + .env.example — **DevOps** ✅
- [x] S0-15 — pg-boss worker: queues (SCORE_COMPUTE, SYNC_PROCESS, LOW_STOCK_ALERT, DEBT_REMINDER) — **DevOps** ✅
- [x] S0-16 — GitHub Actions CI (lint + typecheck + test + build; postgres:16-alpine) — **DevOps** ✅
- [x] S0-17 — **Tester**: role isolation (16 tests) + OTP 3-attempt lockout (6 tests) — **Tester** ✅
- [x] S0-18 — Sprint 0 snapshot — **Project Monitor** ✅

## DoD — Sprint 0 (4/4 ✅)
- [x] Phone OTP signup/login works (Infobip in prod, mock in dev/CI)
- [x] PWA installable: manifest.json + service worker registered
- [x] Role isolation test passes
- [x] Darija strings load; `pnpm test`/`lint` clean; `pnpm build` passes
