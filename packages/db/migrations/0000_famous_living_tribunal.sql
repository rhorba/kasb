CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'sync', 'score_compute');--> statement-breakpoint
CREATE TYPE "public"."business_category" AS ENUM('commerce', 'services', 'artisanat', 'construction', 'food', 'beauty', 'other');--> statement-breakpoint
CREATE TYPE "public"."credit_application_status" AS ENUM('submitted', 'reviewing', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."entry_category" AS ENUM('sales', 'stock_purchase', 'rent', 'transport', 'staff', 'loan_repayment', 'equipment', 'utilities', 'other_income', 'other_expense');--> statement-breakpoint
CREATE TYPE "public"."entry_source" AS ENUM('manual', 'voice', 'ocr', 'sync');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('score_improvement', 'low_stock', 'debt_reminder', 'sync_complete', 'other');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'partner');--> statement-breakpoint
CREATE TABLE "ae_registration_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"rna_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ae_registration_progress_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "business_category" NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text,
	"has_fixed_premises" boolean NOT NULL,
	"is_auto_entrepreneur" boolean DEFAULT false NOT NULL,
	"rna_number" text,
	"monthly_revenue_estimate" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"offline_id" text,
	"type" "entry_type" NOT NULL,
	"amount" bigint NOT NULL,
	"category" "entry_category" NOT NULL,
	"description" text,
	"client_id" uuid,
	"entry_date" timestamp with time zone NOT NULL,
	"source" "entry_source" DEFAULT 'manual' NOT NULL,
	"corrects_id" uuid,
	"synced_at" timestamp with time zone,
	"receipt_photo_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_entries_offline_dedup" UNIQUE("business_id","offline_id")
);
--> statement-breakpoint
CREATE TABLE "credit_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"product_id" uuid,
	"requested_amount" bigint NOT NULL,
	"status" "credit_application_status" DEFAULT 'submitted' NOT NULL,
	"score_at_application" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"components" jsonb NOT NULL,
	"months_of_data" integer NOT NULL,
	"eligible_partner_ids" text[] DEFAULT '{}' NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"outstanding_debt" bigint DEFAULT 0 NOT NULL,
	"last_transaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debt_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"description" text,
	"entry_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_amount" bigint NOT NULL,
	"max_amount" bigint NOT NULL,
	"max_duration_months" integer NOT NULL,
	"interest_rate_bps" integer NOT NULL,
	"target_category" "business_category",
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microfinance_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text NOT NULL,
	"min_score" integer NOT NULL,
	"cities" text[] DEFAULT '{}' NOT NULL,
	"contact_phone" text NOT NULL,
	"website_url" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"purchase_price" bigint NOT NULL,
	"selling_price" bigint NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 0 NOT NULL,
	"supplier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'owner' NOT NULL,
	"city" text,
	"language" text DEFAULT 'dz' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ae_registration_progress" ADD CONSTRAINT "ae_registration_progress_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_client_id_customers_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_corrects_id_cash_entries_id_fk" FOREIGN KEY ("corrects_id") REFERENCES "public"."cash_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_partner_id_microfinance_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."microfinance_partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_product_id_loan_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."loan_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_scores" ADD CONSTRAINT "credit_scores_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_entries" ADD CONSTRAINT "debt_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_entries" ADD CONSTRAINT "debt_entries_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_products" ADD CONSTRAINT "loan_products_partner_id_microfinance_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."microfinance_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "idx_business_profiles_user" ON "business_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_entries_business" ON "cash_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_entries_date" ON "cash_entries" USING btree ("business_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_credit_apps_business" ON "credit_applications" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_credit_apps_partner" ON "credit_applications" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_scores_latest" ON "credit_scores" USING btree ("business_id","computed_at");--> statement-breakpoint
CREATE INDEX "idx_customers_business" ON "customers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_debt_entries_customer" ON "debt_entries" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_debt_entries_business" ON "debt_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_loan_products_partner" ON "loan_products" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_otp_phone" ON "otp_codes" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_stock_items_business" ON "stock_items" USING btree ("business_id");