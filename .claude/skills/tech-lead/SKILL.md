---
name: tech-lead
description: Architecture, ADRs, stack. Trigger on: "architecture", "ADR", "tech stack", "refactor".
---
# Tech Lead — Kasb

## Stack (FINAL — CLAUDE.md §5)
| Concern | Choice |
|---|---|
| Web | Next.js 15 App Router + TypeScript strict |
| PWA | next-pwa + service worker (offline-first) |
| DB | PostgreSQL 16 + Drizzle ORM + RLS |
| Auth | Auth.js v5 + Infobip OTP adapter (phone-first) |
| Money | Integer centimes, `Money` type |
| Credit | Statistical algorithm in packages/credit (no external ML) |
| Offline | IndexedDB (idb) + sync queue → POST /api/sync |
| Voice | Web Speech API (browser-native, Moroccan Arabic locale) |
| OCR | Google Vision adapter + Tesseract.js fallback in packages/ocr stub |
| WhatsApp | wa.me deep link (v0.1) — format: `wa.me/?text=...` |
| Jobs | pg-boss (score sweep, stock alerts, debt reminders) |
| SMS/OTP | Infobip via packages/notifications |
| Storage | Cloudflare R2 (private for receipt photos) |
| i18n | next-intl (dz/fr/ar) — Darija primary |

## Key ADRs

### ADR-01: Phone OTP as primary auth (not email)
85.5% of UPIs are solo operators on Android phones. Email auth creates drop-off. Phone OTP
is what Moroccan users expect (M-Wallet, CIH Mobile, CMI all use it). Email is a fallback.

### ADR-02: Offline-first with IndexedDB + server sync
Cash entries created on device first (IndexedDB), queued for sync. Client generates `offlineId`
(UUID). Server deduplicates by `offlineId`. A sync retry never creates duplicates.
This is non-negotiable — 55.3% of UPIs work without fixed premises (often no stable WiFi).

### ADR-03: Entries are append-only (no in-place edit)
Financial records are immutable once created. Corrections = new entry with `corrects_id` reference.
This preserves audit trail and is what accountants expect. User sees "net" view; raw data is always intact.

### ADR-04: Credit score is statistical + transparent
No external ML API. Score computed from DB data: 5 components, each with documented formula.
Displayed to user with component breakdown. Regulatorily safer (no black-box algorithmic lending).

### ADR-05: Kasb is a lead-gen platform, not a lender
Kasb sends qualified leads (cash flow summary + score) to licensed microfinance partners.
Kasb never holds, transfers, or guarantees funds. This is the regulatory boundary.

## Data Flow
```
User opens app → IndexedDB has cached data → shows immediately (offline OK)
User records sale → IndexedDB → sync queue → POST /api/sync when online → deduplicated insert
pg-boss nightly → recomputes credit score for active users
User clicks "Demander un crédit" → consents → cash flow summary exported → partner receives lead
```

## Performance Budget (hard limits)
- First Contentful Paint on 3G: < 2s
- Time to Interactive on 3G: < 4s
- Cash book main screen JS: < 100kb gzipped
- Offline: full cash book usable with zero network
