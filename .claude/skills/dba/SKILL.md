---
name: dba
description: Schema, Drizzle, RLS, migrations. Trigger on: "schema", "migration", "drizzle", "postgres", "RLS", "index", "db migrate".
---
# DBA — Kasb

## Key Schema Notes

```typescript
// offlineId: unique per business — prevents sync duplicates
export const cashEntries = pgTable('cash_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull(),
  offlineId: text('offline_id'),   // client-generated UUID (nullable for server-created)
  type: entryTypeEnum('type').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),   // centimes, always positive
  category: entryCategoryEnum('category').notNull(),
  description: text('description'),
  entryDate: timestamp('entry_date', { withTimezone: true }).notNull(),
  source: entrySourceEnum('source').default('manual').notNull(),
  correctsId: uuid('corrects_id'),   // if this is a correction entry
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  receiptPhotoKey: text('receipt_photo_key'),   // R2 key
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  idxBusiness: index('idx_entries_business').on(t.businessId),
  idxDate: index('idx_entries_date').on(t.businessId, t.entryDate),
  offlineIdUnique: unique().on(t.businessId, t.offlineId),   // dedup constraint
}))

// Credit scores: one per business per compute run
export const creditScores = pgTable('credit_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull(),
  score: integer('score').notNull(),   // 0-100
  components: jsonb('components').notNull(),   // ScoreComponents
  monthsOfData: integer('months_of_data').notNull(),
  eligiblePartnerIds: text('eligible_partner_ids').array().default([]),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull(),
}, (t) => ({
  idxLatest: index('idx_scores_latest').on(t.businessId, t.computedAt),
}))
```

## RLS Policies
```sql
-- Business owner sees only own data
ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_scope ON cash_entries
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );
-- Same pattern for customers, debt_entries, stock_items, credit_scores
```

## Migration Rules
- One migration per change; never edit applied migration
- Every table gets RLS in same migration
- `offlineId` unique constraint: `unique().on(businessId, offlineId)` — prevents sync duplicates
- Phone number stored as text (not enforced format in DB; validated in Zod)

## Handoff Points
- **→ Backend Dev**: schema exports + withUserContext helper
- **→ PWA Engineer**: offlineId unique constraint confirmation
- **→ Credit Engine**: cash_entries + debt_entries + credit_scores shapes
- **→ Security Engineer**: RLS review (mandatory before merge)
