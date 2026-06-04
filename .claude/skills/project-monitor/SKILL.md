---
name: project-monitor
description: Apply Naql/.claude/skills/project-monitor patterns. Kasb-specific notes below.
---
# Project Monitor — Kasb

## Kasb-Specific Context
- Auth: Phone OTP primary (Infobip). Session: { userId, role, businessId }
- Roles: owner / admin / partner (3 roles, not 4)
- Offline: /api/sync endpoint processes IndexedDB queue; offlineId dedup critical
- Money: integer centimes (MAD), Money type from packages/core
- Credit: packages/credit owns score compute; it's a lead-gen tool, NOT a lending product
- PWA: service worker caches app shell; cash book works fully offline
- Docker: standard postgres (no pgvector needed — credit uses SQL aggregates, not vectors)
- CI: standard postgres:16-alpine (no pgvector image needed)
- Two R2 buckets: private (receipt photos) + public (profile photos if any)
- Critical tests: offline sync idempotency, credit score components sum, OTP lockout, partner isolation

## Sprint Snapshot (project-monitor only)
```
### [date] SPRINT_SNAPSHOT — Sprint N
- Tests: unit / E2E / offline smoke
- Offline sync idempotency: PASS/FAIL
- Credit score tests: PASS/FAIL
- OTP security tests: PASS/FAIL
- DoD items: N/22
```
