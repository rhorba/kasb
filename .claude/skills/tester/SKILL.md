---
name: tester
description: QA. AUTO-TRIGGERED after every code task. Vitest + Playwright + offline smoke. Trigger after any code task.
---
# Tester — Kasb

## AUTO-TRIGGER: any code task done → run tests immediately

## Tests That Matter Most

### 1. Offline Sync Idempotency (CRITICAL)
```typescript
test('sync replay does not duplicate cash entry', async () => {
  const offlineId = uuid()
  await syncEntries([{ offlineId, amount: 30000, type: 'income', ... }])
  await syncEntries([{ offlineId, amount: 30000, type: 'income', ... }]) // replay
  const entries = await getCashEntries(businessId)
  expect(entries.filter(e => e.offlineId === offlineId)).toHaveLength(1)
})
```

### 2. Credit Score Edge Cases
```typescript
test('score not computed with < 30 entries', () => {
  const entries = buildEntries(15) // below threshold
  const score = computeCreditScore(businessId, entries, [])
  expect(score).toBeNull() // not enough data
})
test('score components sum to total', () => {
  const entries = buildEntries(90, { consistent: true })
  const score = computeCreditScore(businessId, entries, [])
  const { revenueConsistency, expenseControl, growthTrend, debtRecoveryRate, dataRichness } = score.components
  expect(revenueConsistency + expenseControl + growthTrend + debtRecoveryRate + dataRichness).toBe(score.score)
})
```

### 3. Partner Data Isolation
```typescript
test('partner A cannot see partner B leads', async () => {
  const [app1, app2] = await seedApplications([partnerA, partnerB])
  await asPartner(partnerB, async () => {
    const apps = await getApplications()
    expect(apps.every(a => a.partnerId === partnerB.id)).toBe(true)
  })
})
```

### 4. Append-Only Entries
```typescript
test('cash entry cannot be deleted by owner', async () => {
  const entry = await createEntry(owner)
  await expect(deleteEntry(entry.id, ownerSession)).rejects.toMatchObject({ status: 403 })
})
```

### 5. OTP Security
```typescript
test('OTP expires after 5 minutes', async () => {
  await requestOTP(phone)
  vi.advanceTimersByTime(5 * 60 * 1000 + 1)
  await expect(verifyOTP(phone, validOTP)).rejects.toThrow('expired')
})
test('lockout after 3 failed attempts', async () => {
  for (let i = 0; i < 3; i++) await verifyOTP(phone, 'WRONG').catch(() => {})
  await expect(verifyOTP(phone, validOTP)).rejects.toThrow('locked')
})
```

### 6. E2E Critical Paths (Playwright)
- signup (phone OTP) → record 3 entries → see daily summary
- record entry offline (service worker) → go online → sync → entry appears in DB
- 30+ entries → credit score visible → apply to partner → consent flow
- WhatsApp receipt: entry recorded → receipt formatted → wa.me link correct

## Handoff Points
- **← all code tasks**: auto-triggered
- **→ Project Monitor**: test results
- **→ Deployment**: green light
