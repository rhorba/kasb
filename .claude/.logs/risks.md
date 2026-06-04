# risks

## RISK-000 — Offline sync duplicate entries (standing, critical)
- **Risk**: Sync replay creates duplicate financial records.
- **Severity**: Critical (corrupts user's financial data, destroys trust).
- **Mitigation**: offlineId unique constraint per (businessId, offlineId). Server deduplicates. Standing tests.

## RISK-001 — OTP brute force
- **Risk**: Attacker enumerates phone numbers + guesses OTP.
- **Severity**: High (account takeover).
- **Mitigation**: 5-min expiry; 3-attempt lockout; rate-limit 3 OTPs/phone/hour; bcrypt hash stored (not plaintext).

## RISK-002 — Credit data shared without consent
- **Risk**: Partner sees user cash flow data without explicit consent.
- **Severity**: Critical (CNDP violation, trust destruction).
- **Mitigation**: Consent required at application time. No bulk partner access. Partner RLS scoped to own leads only.

## RISK-003 — Kasb perceived as lending
- **Risk**: Regulatory risk if platform is seen as unlicensed credit provider.
- **Severity**: Critical (regulatory shutdown).
- **Mitigation**: Clear UX messaging ("Kasb vous connecte à des partenaires agréés. Kasb ne prête pas."). No payment processing for loans.
