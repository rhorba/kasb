# decisions

## ADR-01: Phone OTP primary auth (not email)
85.5% of informal business owners are solo operators on Android phones. Email creates friction.
Infobip OTP (Moroccan phone numbers) is the right auth path. Email as fallback only.

## ADR-02: Offline-first with IndexedDB + server sync
55.3% of UPIs have no fixed premises. Offline is the default, not the exception.
Client-generated offlineId prevents sync duplicates.

## ADR-03: Entries are append-only
Financial records immutable once created. Corrections via correctsId reference.
Audit trail always preserved. DELETE blocked by RLS on cash_entries.

## ADR-04: Credit score is statistical SQL, no pgvector
Score computed from SQL aggregates: revenue consistency, expense ratio, growth trend, debt recovery.
No vector search needed (caregivers search ≠ credit scoring). Standard postgres:16-alpine works.

## ADR-05: Kasb is a lead-gen platform, not a lender
Regulatory boundary. Kasb generates qualified leads for licensed microfinance institutions.
No payment processing, no credit extension, no interest.
