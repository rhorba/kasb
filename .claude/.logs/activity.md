# activity
<!-- append-only log — completed tasks + milestones -->

### 2026-06-04 SPRINT_SNAPSHOT — Sprint 0

**Goal**: Scaffold + Phone OTP Auth + RBAC + RLS + PWA Setup

#### CI Gates
- `pnpm lint` (Biome): ✅ PASS — 76 files checked, 0 errors
- `pnpm test` (Vitest): ✅ PASS — 22/22 tests (16 RBAC + 6 OTP lockout)
- `pnpm -r typecheck` (tsc): ✅ PASS — 9/9 workspaces clean (0 errors)
- `pnpm build` (Next.js): ✅ PASS — 24 static pages generated, SW registered

#### Critical Security Tests
- OTP lockout (MAX_ATTEMPTS=3): ✅ PASS
- Role isolation (owner/admin/partner): ✅ PASS
- Offline sync idempotency: N/A — Sprint 3
- Credit score tests: N/A — Sprint 5

#### DoD — Sprint 0 (4/4)
- [x] Phone OTP signup/login works (Infobip in prod, MockOtpService "123456" in dev/CI)
- [x] PWA installable: manifest.json + service worker registered (public/sw.js)
- [x] Role isolation test passes (rbac.test.ts — 16 tests green)
- [x] Darija strings load; `pnpm test`/`lint` clean; `pnpm build` passes

#### Tasks Completed (S0-01 → S0-18, all 18)
| Task | Description | Status |
|---|---|---|
| S0-01 | pnpm monorepo workspace scaffold | ✅ |
| S0-02 | Next.js 15 + TS strict + Biome + next-pwa + next-intl | ✅ |
| S0-03 | packages/core: Money, Role, RBAC, Zod schemas | ✅ |
| S0-04 | packages/db: Drizzle schema (13 tables, 7 enums) + full types | ✅ |
| S0-05 | RLS: withUserContext helper in packages/db/src/rls.ts | ✅ |
| S0-06 | DB init.sql + rls.sql (app role + all RLS policies) | ✅ |
| S0-07 | Auth.js v5 + phone OTP + email secondary; session {userId, role, businessId} | ✅ |
| S0-08 | withAction() server action factory + requireSession() | ✅ |
| S0-09 | Signup/signin flow: phone → OTP → session → owner layout guard | ✅ |
| S0-10 | next-intl dz/fr/ar routing + locale-aware navigation utilities | ✅ |
| S0-11 | Tailwind v4 saffron/indigo tokens + shadcn/ui + CSS variables | ✅ |
| S0-12 | App shell: bottom nav (active state), home hero buttons | ✅ |
| S0-13 | PWA: manifest.json + SVG icons + service worker + metadata | ✅ |
| S0-14 | Docker Compose (postgres + web + worker + caddy) + Dockerfile + Caddyfile | ✅ |
| S0-15 | pg-boss worker: SCORE_COMPUTE, SYNC_PROCESS, LOW_STOCK_ALERT, DEBT_REMINDER queues | ✅ |
| S0-16 | GitHub Actions CI: lint + typecheck + test (postgres:16-alpine) + build jobs | ✅ |
| S0-17 | Tests: 22/22 green (rbac.test.ts x16, otp-lockout.test.ts x6) | ✅ |
| S0-18 | Sprint 0 snapshot | ✅ |

#### Known Technical Decisions
- `withRole()` made `async` so synchronous throw wraps as rejected Promise (enables `.rejects.toBeInstanceOf()` in tests)
- `output: standalone` gated on `DOCKER_BUILD` env var via spread to satisfy `exactOptionalPropertyTypes: true`
- pg-boss v10 work() handlers receive `Job[]` array (not single Job) — handlers use `jobs[0]?.data`
- Worker tsconfig: `"types": ["node"]` added to access Node.js globals
- `biome-ignore` suppressions on `noNonNullAssertion` for DATABASE_URL in drizzle.config.ts and client.ts (startup-time assertions, correct by design)

---

### 2026-06-04 SPRINT_SNAPSHOT — Sprint 1

**Goal**: Data Model + Business Profiles + Demo Seed

#### CI Gates (GitHub run 26950342898)
- `pnpm lint` (Biome): ✅ PASS — 80 files, 0 errors
- `pnpm test` (Vitest): ✅ PASS — 48/48 (22 Sprint 0 + 26 new)
- `pnpm -r typecheck` (tsc): ✅ PASS — 9/9 workspaces
- `pnpm build` (Next.js): ✅ PASS

#### Critical Security Tests
- OTP lockout (MAX_ATTEMPTS=3): ✅ PASS (Sprint 0 tests retained)
- Role isolation (owner/admin/partner): ✅ PASS
- Partner sees only own leads (RLS SQL assertion): ✅ PASS
- Append-only DELETE blocked (RLS SQL assertion): ✅ PASS
- Offline sync idempotency: N/A — Sprint 3
- Credit score component sum: ✅ PASS (seed integrity tests)

#### DoD — Sprint 1 (4/4)
- [x] All tables with RLS; DELETE blocked on cash_entries (cash_entries_no_delete policy)
- [x] Business profile create/edit; demo seed loads (pnpm seed)
- [x] offlineId unique constraint: cash_entries_offline_dedup UNIQUE(business_id, offline_id)
- [x] FR + Darija strings for profile; pnpm build/test/lint green

#### Tasks Completed (S1-01 → S1-08, all 8)
| Task | Description | Status |
|---|---|---|
| S1-01 | DBA: 14 tables, 8 enums, migrations 0000+0001; notifications added | ✅ |
| S1-02 | Security: partner isolation (app.current_partner), cash_entries no-delete, users sign-up insert | ✅ |
| S1-03 | Backend: getMyProfile + createProfile + updateProfile server actions | ✅ |
| S1-04 | Frontend: ProfileForm (create/edit) + ProfilePage | ✅ |
| S1-05 | Demo seed: 5 businesses, ~600 entries, 3 MFI partners, scores 45–82 | ✅ |
| S1-06 | i18n: Darija/FR/AR profile strings (neighborhood, rnaNumber, createTitle, etc.) | ✅ |
| S1-07 | Tests: 26 new tests — schema validation, RBAC actions, RLS SQL, seed integrity | ✅ |
| S1-08 | Sprint 1 snapshot | ✅ |

#### Key Technical Decisions
- `partner_org_id uuid` added to users (migration 0001) — links partner-role users to their MFI org
- `withUserContext` extended with `partnerOrgId?` parameter → sets `app.current_partner` in Postgres
- `KasbSession` + Auth.js JWT/session augmented with `partnerOrgId`
- Seed bypasses RLS via session-level `set_config('app.current_role', 'admin', false)`
- Seed generates ~600 entries with deterministic pseudo-random amounts (Math.sin hash)
- `biome.json` ignores `**/migrations/**` (Drizzle-generated JSON not hand-written)
