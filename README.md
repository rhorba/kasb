# Kasb — كسب

**Gérez votre argent. Accédez au crédit. Formalisez votre activité.**
_دير الحساب ديالك. وصّل للقرض. رسمي النشاط ديالك._

Kasb is a mobile-first fintech PWA for Morocco's 2 million informal businesses —
a digital cash book, alternative credit score, and auto-entrepreneur pathway.
Built on HCP 2023/2024 informal sector survey data.

---

## The Problem We Solve

According to HCP (Enquête Nationale sur le Secteur Informel 2023/2024):
- **2.03 million informal production units** (UPI) in Morocco
- **85.5% are solo operators** — one person, no employees, no formal accounting
- Only **1.7% have auto-entrepreneur status** despite simple registration
- Main barrier to credit: **no financial history** (no bank account, no records)

The trap: no records → no credit → can't grow → stay informal.
Kasb breaks this cycle.

---

## Quick Start (Development)

### Prerequisites
- Node.js >= 20, pnpm >= 9, Docker + Docker Compose

```bash
git clone https://github.com/your-org/kasb.git && cd kasb
cp .env.example .env   # fill in AUTH_SECRET, INFOBIP_API_KEY, R2 keys
pnpm install
docker compose up -d postgres   # standard postgres:16-alpine (no pgvector needed)
pnpm db:migrate
pnpm db:seed
pnpm dev   # http://localhost:3000
```

### Demo Credentials
| Role | Phone | OTP (dev) |
|---|---|---|
| Business owner (épicier) | +212600000001 | 123456 |
| Admin | +212600000099 | 123456 |
| Partner (Al Amana) | +212600000088 | 123456 |

---

## Docker Compose (Production)

```bash
cp .env.example .env   # set AUTH_SECRET, INFOBIP keys, R2 keys, VAPID keys
docker compose up -d   # postgres + web + worker + caddy (TLS on port 443)
```

First deploy: the `docker-entrypoint-initdb.d/` scripts apply migrations + RLS automatically.

## Architecture

```
kasb/
├── apps/web/              Next.js 15 PWA (offline-first)
│   ├── (public)/          Landing + signup
│   ├── (owner)/           Cash book, credit, AE guide, stock
│   ├── (admin)/           Admin dashboard + KPIs
│   └── (partner)/         Partner dashboard + leads
└── packages/
    ├── core/              Money type, RBAC, Zod schemas
    ├── db/                Drizzle schema + migrations + RLS
    ├── cashbook/          Entry logic, summaries, offline sync handler
    ├── credit/            Score algorithm (5 components, statistical)
    ├── inventory/         Stock tracker
    ├── whatsapp/          Receipt formatter + wa.me deep link
    └── notifications/     In-app + push (PWA VAPID) + Infobip OTP
```

Stack: Next.js 15, TypeScript strict, Tailwind v4, PostgreSQL 16 + RLS (no pgvector),
Auth.js v5 + Infobip OTP (phone-first), next-pwa + IndexedDB (offline-first),
Web Speech API (voice entry), pg-boss, Cloudflare R2

---

## What makes Kasb different

| | Naql (transport SaaS) | Mahara (gig marketplace) | Riaya (childcare) | **Kasb** |
|---|---|---|---|---|
| Auth | Email | Email + Google | Email + Google | **Phone OTP first** |
| Offline | Mobile app (React Native) | No | No | **PWA (IndexedDB + sync)** |
| DB extra | — | pgvector | pgvector | **None (SQL aggregates)** |
| Voice input | No | No | No | **Yes (Web Speech API)** |
| WhatsApp | No | No | No | **Receipt sharing** |
| Credit | No | No | No | **Yes (alternative score)** |

---

## Security Model

- **Phone OTP**: 5-min expiry, 3-attempt lockout, Argon2id hash stored, never plaintext
- **Append-only entries**: cash entries cannot be deleted (RLS blocks DELETE). Corrections via correcting entry.
- **Credit data**: never shared with partners without explicit user consent at application time
- **Partner isolation**: each partner sees only their own leads (RLS)
- **Kasb never lends**: lead-gen only for licensed microfinance institutions

---

## Performance Targets

| Metric | Target |
|---|---|
| Lighthouse PWA score | ≥ 90 |
| Time to Interactive (3G) | < 4s |
| Cash entry (offline) | 0ms (IndexedDB) |
| App shell JS (gzipped) | < 100kb |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres (RLS-bound app role) |
| `AUTH_SECRET` | 32-byte random (openssl rand -hex 32) |
| `INFOBIP_API_KEY` | OTP SMS delivery (use `mock` in dev) |
| `INFOBIP_BASE_URL` | Infobip API endpoint |
| `R2_PRIVATE_*` | Cloudflare R2 private (receipt photos) |
| `PAYMENT_GATEWAY` | `none` in v0.1 (no payments on platform) |
| `VAPID_EMAIL` | Contact email for VAPID push (e.g. `admin@kasb.ma`) |
| `VAPID_PUBLIC_KEY` | Web Push public key (generate: `node -e "require('web-push').generateVAPIDKeys()"`) |
| `VAPID_PRIVATE_KEY` | Web Push private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` — must be client-accessible |

---

## Impact Tracking

Kasb tracks a unique platform KPI: **formalization events** — business owners who
completed auto-entrepreneur registration after using Kasb for 3+ months.
This is shared with potential government/NGO partners (HCP, OFPTT, CRI regional).

---

v0.1 — Built with Claude Code · Powered by HCP 2023/2024 Informal Sector Survey Data
