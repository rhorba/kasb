---
name: security-engineer
description: Auth (OTP), role isolation, PII (phone/financial data), sync security. Trigger on: "security", "OTP", "auth", "PII", "RBAC", "role", "sync", "CSP".
---
# Security Engineer — Kasb

## Threat Surface
| Component | Threat | Mitigation |
|---|---|---|
| **Phone OTP auth** | OTP brute force / replay | 5-min expiry; 3 attempts then 15-min lockout; rate-limit per phone |
| **Credit data** | Partner sees user data without consent | Explicit consent required at application time; no bulk partner access |
| **Sync endpoint** | Unauthenticated bulk injection | Authenticated; businessId from session only; offlineId dedup |
| **Financial entries** | Tampering with append-only history | `correctsId` for corrections; no DELETE on cash_entries |
| Phone number PII | Phone number leaked | Encrypted at rest; never in logs; not exposed to partner API |
| **Partner dashboard** | Partner sees another partner's leads | RLS: partner sees only CreditApplications with their partnerId |
| Offline data | Local IndexedDB tampered | Server is source of truth; re-sync overwrites conflicts |

## OTP Security
```typescript
// packages/notifications/src/otp.ts
// - Generate 6-digit OTP
// - Store as bcrypt hash in DB (not plaintext)
// - Expire after 5 minutes
// - Max 3 attempts; lockout on 4th
// - Rate limit: 3 OTPs per phone per hour
// - OTP in URL params/logs: NEVER
```

## No DELETE on Cash Entries (append-only enforcement)
```sql
-- RLS policy prevents DELETE even by row owner
CREATE POLICY no_delete ON cash_entries FOR DELETE USING (false);
-- Only admin can truly delete (soft delete via status field)
```

## Pre-Deploy Checklist (Sprint 7)
- [ ] OTP: 5-min expiry, 3-attempt lockout, rate-limited per phone
- [ ] Phone number never in logs/errors
- [ ] Cash entries: no DELETE by owner; corrections via correctsId
- [ ] Sync endpoint: businessId from session only; offlineId dedup
- [ ] Partner: sees only own leads (RLS)
- [ ] Credit data: consent required before partner share
- [ ] Receipt photos: private R2; signed URL; owner-only
- [ ] Secrets in `.env`; gitleaks in CI
- [ ] CSP + security headers
