# sessions
<!-- append-only log -->

## SESSION_START — PROJECT INITIALIZED
Sprint: 0 — Ready to start
Status: Fresh project. Framework scaffolded. All S0 tasks pending.
Goal: `pnpm dev` works, Phone OTP auth works, PWA manifest + service worker registered,
Postgres+RLS running, role isolation proven.
Key difference from Naql/Mahara/Riaya: NO pgvector (credit uses SQL aggregates).
Use postgres:16-alpine in Docker AND CI. Primary auth = phone OTP via Infobip.
Next: S0-01 (workspace) → S0-07 (Phone OTP auth) → S0-13 (PWA manifest)
