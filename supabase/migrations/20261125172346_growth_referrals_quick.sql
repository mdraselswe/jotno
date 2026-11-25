CREATE TYPE "public"."consult_kind" AS ENUM('full', 'quick');--> statement-breakpoint
CREATE TYPE "public"."quick_status" AS ENUM('pending_payment', 'open', 'claimed', 'credited', 'used', 'refunded', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."payment_purpose" ADD VALUE 'quick';--> statement-breakpoint
CREATE TABLE "points" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quick_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"patient_id" uuid,
	"species_id" integer,
	"summary" text NOT NULL,
	"photos" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "quick_status" DEFAULT 'pending_payment' NOT NULL,
	"fee" integer NOT NULL,
	"commission" integer NOT NULL,
	"points_used" integer DEFAULT 0 NOT NULL,
	"payment_id" uuid,
	"provider_id" uuid,
	"consult_id" uuid,
	"opened_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"credit_used_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quick_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referrals" (
	"referee_id" uuid PRIMARY KEY NOT NULL,
	"referrer_id" uuid NOT NULL,
	"code" text NOT NULL,
	"device_id" text,
	"status" text DEFAULT 'ok' NOT NULL,
	"flag_reason" text,
	"activated_at" timestamp with time zone,
	"first_paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consults" ADD COLUMN "kind" "consult_kind" DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "consults" ADD COLUMN "points_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "consults" ADD COLUMN "upgraded_from" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "points_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "duty_start" integer;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "duty_end" integer;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_requests" ADD CONSTRAINT "quick_requests_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_requests" ADD CONSTRAINT "quick_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_requests" ADD CONSTRAINT "quick_requests_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_requests" ADD CONSTRAINT "quick_requests_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_requests" ADD CONSTRAINT "quick_requests_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_requests" ADD CONSTRAINT "quick_requests_consult_id_consults_id_fk" FOREIGN KEY ("consult_id") REFERENCES "public"."consults"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_profiles_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "points_user_idx" ON "points" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "points_ref_idx" ON "points" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "quick_requests_status_idx" ON "quick_requests" USING btree ("status","opened_at");--> statement-breakpoint
CREATE INDEX "quick_requests_owner_idx" ON "quick_requests" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id","created_at");