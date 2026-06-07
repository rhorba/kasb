-- ============================================================
-- Kasb RLS Policies — run as superuser after every migration.
-- The app sets `app.current_user` (UUID) and `app.current_role`
-- (owner | admin | partner) via set_config at query time.
-- withUserContext() in rls.ts wraps this in a transaction.
-- ============================================================

-- ── users ────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Sign-up INSERT: allowed for owner-role users (no session context yet).
-- App layer (Zod + OTP) validates phone uniqueness and role assignment.
CREATE POLICY users_signup_insert ON users
  FOR INSERT WITH CHECK (role = 'owner');

CREATE POLICY users_own_scope ON users
  USING (
    id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── business_profiles ────────────────────────────────────────
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY business_profiles_owner_scope ON business_profiles
  USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── Helper: owned businesses for the current user ─────────────
-- Used by all child-table policies below.
-- Inlined as a subquery for clarity (optimizer will cache it).

-- ── cash_entries ─────────────────────────────────────────────
ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY cash_entries_owner_scope ON cash_entries
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );

-- Append-only invariant: no DELETE ever — corrections use correctsId.
CREATE POLICY cash_entries_no_delete ON cash_entries
  FOR DELETE USING (false);

-- ── customers ────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_owner_scope ON customers
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── debt_entries ─────────────────────────────────────────────
ALTER TABLE debt_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY debt_entries_owner_scope ON debt_entries
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── credit_scores ────────────────────────────────────────────
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores FORCE ROW LEVEL SECURITY;

CREATE POLICY credit_scores_owner_scope ON credit_scores
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── credit_applications ───────────────────────────────────────
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_applications FORCE ROW LEVEL SECURITY;

-- owner: own applications only
-- admin: all applications
-- partner: ONLY applications addressed to their org (app.current_partner)
CREATE POLICY credit_applications_scope ON credit_applications
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
    OR (
      current_setting('app.current_role', true) = 'partner'
      AND partner_id::text = current_setting('app.current_partner', true)
    )
  );

-- ── ae_registration_progress ──────────────────────────────────
ALTER TABLE ae_registration_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ae_registration_progress FORCE ROW LEVEL SECURITY;

CREATE POLICY ae_progress_owner_scope ON ae_registration_progress
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── stock_items ───────────────────────────────────────────────
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items FORCE ROW LEVEL SECURITY;

CREATE POLICY stock_items_owner_scope ON stock_items
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = current_setting('app.current_user', true)::uuid
    )
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── microfinance_partners ────────────────────────────────────
-- Active partners are publicly readable; all writes require admin.
ALTER TABLE microfinance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE microfinance_partners FORCE ROW LEVEL SECURITY;

CREATE POLICY partners_public_read ON microfinance_partners
  FOR SELECT USING (
    active = true
    OR current_setting('app.current_role', true) = 'admin'
  );

CREATE POLICY partners_admin_write ON microfinance_partners
  FOR ALL USING (current_setting('app.current_role', true) = 'admin');

-- ── loan_products ─────────────────────────────────────────────
ALTER TABLE loan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_products FORCE ROW LEVEL SECURITY;

CREATE POLICY loan_products_public_read ON loan_products
  FOR SELECT USING (
    partner_id IN (SELECT id FROM microfinance_partners WHERE active = true)
    OR current_setting('app.current_role', true) = 'admin'
  );

CREATE POLICY loan_products_admin_write ON loan_products
  FOR ALL USING (current_setting('app.current_role', true) = 'admin');

-- ── audit_logs ───────────────────────────────────────────────
-- Admins read all; users can only insert (for service-layer writes).
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY audit_logs_actor_insert ON audit_logs
  FOR INSERT WITH CHECK (
    actor_user_id = current_setting('app.current_user', true)::uuid
  );

-- ── notifications ────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_user_scope ON notifications
  USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── push_subscriptions ───────────────────────────────────────
-- Users manage only their own subscriptions; service layer uses elevated creds for delivery.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_user_scope ON push_subscriptions
  USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );

-- ── otp_codes ────────────────────────────────────────────────
-- No RLS — managed exclusively by the auth service layer
-- which connects with elevated credentials before setting app context.
