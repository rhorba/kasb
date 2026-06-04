---
name: pwa-engineer
description: Service worker, offline, push notifications, voice entry, OCR. Trigger on: "offline", "PWA", "service worker", "voice", "OCR", "IndexedDB", "sync", "push notification", "install".
---
# PWA Engineer — Kasb

## Role
Own the offline layer. This is the most critical technical capability in Kasb — the product
fails if it doesn't work at a market stall on 3G. Own: service worker, IndexedDB, sync queue,
voice entry, OCR, and push notifications.

## Offline Architecture

```
┌─────────────────────────────────────┐
│  Next.js App                        │
│  ┌─────────────────────────────┐    │
│  │  IndexedDB (idb library)    │    │   ← all reads/writes go here first
│  │  - cash_entries (pending)   │    │
│  │  - cash_entries (synced)    │    │
│  │  - customers                │    │
│  │  - stock_items              │    │
│  │  - sync_queue               │    │
│  └──────────┬──────────────────┘    │
│             │ online?               │
│             ▼                       │
│  ┌─────────────────────────────┐    │
│  │  Sync Engine                │    │
│  │  POST /api/sync             │    │   ← batch, idempotent
│  │  offlineId deduplication    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## IndexedDB Schema (client-side)
```typescript
// src/lib/idb/schema.ts
const DB_NAME = 'kasb-offline'
const DB_VERSION = 1

// Stores:
// cash_entries: { offlineId (pk), businessId, type, amount, category, description, entryDate, syncStatus: 'pending'|'synced'|'error' }
// sync_queue: { id (pk), operation: 'create'|'update', entity, payload, retries, createdAt }
// customers: { id, businessId, name, phone, outstandingDebt }
// stock_items: { id, businessId, name, unit, currentStock, ... }
// last_sync: { businessId, syncedAt }
```

## Sync Protocol
```typescript
// POST /api/sync
// Body: { entries: OfflineEntry[], lastSyncAt: ISO }
// Server: deduplicates by offlineId, applies, returns { created: [...], errors: [...], serverEntries: [...new since lastSyncAt] }
// Client: marks synced, merges serverEntries, updates last_sync
```

## Voice Entry (Web Speech API)
```typescript
// src/lib/voice/recorder.ts
// Uses window.SpeechRecognition with lang='ar-MA' (Moroccan Arabic)
// Falls back to 'fr-MA' if ar-MA not recognized
// Parses: "ثمانمية درهم بزاف دوا" → amount: 800, description: "médicaments"
// Number extraction: handles Arabic numerals + Darija number words
// If parse fails → shows raw transcription for user to correct
```

## OCR (Receipt Photo)
```typescript
// packages/ocr (same adapter pattern as Naql/Riaya)
// Mobile: user takes photo → compressed (< 500kb) → uploaded → Vision API → ReceiptDraft
// Fallback: Tesseract.js (runs in browser, slower but offline-capable)
// Result pre-fills the entry form; user confirms
```

## Push Notifications (PWA)
```typescript
// Service worker subscribes to Web Push (VAPID keys)
// Triggered by pg-boss jobs:
// - score_improved: "Votre score a augmenté à 75! Vous êtes éligible chez Al Amana"
// - low_stock: "Stock faible: il vous reste 5 unités de [product]"
// - debt_reminder: "Khalid vous doit 350 MAD depuis 7 jours"
```

## Service Worker (next-pwa config)
```javascript
// cache strategy:
// - App shell (HTML/CSS/JS): CacheFirst
// - API responses for dashboard: NetworkFirst (fall back to cache)
// - Images: CacheFirst with expiry
// - /api/sync: NetworkOnly (never cache mutations)
```

## Checklist
- [ ] Cash entries work fully offline (create, view, edit)
- [ ] Sync is idempotent (offlineId deduplication enforced server-side)
- [ ] Voice entry works for Moroccan Arabic numbers (tested with fixture phrases)
- [ ] OCR pre-fills but never auto-saves (human confirms)
- [ ] Push notifications ask permission once; never spam
- [ ] PWA installable (manifest.json + service worker + HTTPS)
- [ ] Works on Tecno Spark 10 (tested in Chrome DevTools device simulation)

## Handoff Points
- **← Backend Dev**: /api/sync contract + offlineId dedup logic
- **← DBA**: schema for offlineId unique constraint
- **← Security Engineer**: sync endpoint auth (must be authenticated)
- **→ Frontend Dev**: useOfflineStore hook API
- **→ Tester**: offline→online smoke tests, voice fixtures
