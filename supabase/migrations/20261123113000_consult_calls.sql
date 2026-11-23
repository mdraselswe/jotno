CREATE TYPE "public"."call_status" AS ENUM('ringing', 'active', 'ended', 'missed', 'declined', 'failed');--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consult_id" uuid NOT NULL,
	"caller_id" uuid,
	"media" text NOT NULL,
	"status" "call_status" DEFAULT 'ringing' NOT NULL,
	"answered_at" timestamp with time zone,
	"last_beat_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"ended_by" uuid,
	"end_reason" text,
	"relayed" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_consult_id_consults_id_fk" FOREIGN KEY ("consult_id") REFERENCES "public"."consults"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_profiles_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_ended_by_profiles_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_consult_idx" ON "calls" USING btree ("consult_id","created_at");--> statement-breakpoint
CREATE INDEX "calls_status_idx" ON "calls" USING btree ("status");