CREATE TABLE "bvc_register" (
	"reg_key" text PRIMARY KEY NOT NULL,
	"reg_no" text NOT NULL,
	"name_bn" text,
	"name_key" text,
	"division" text,
	"source_id" uuid,
	"page" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bvc_register" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bvc_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"published_on" date,
	"file_hash" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bvc_sources_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
ALTER TABLE "bvc_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "name_nid_bn" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "name_nid_key" text;--> statement-breakpoint
ALTER TABLE "bvc_register" ADD CONSTRAINT "bvc_register_source_id_bvc_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."bvc_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bvc_register_name_idx" ON "bvc_register" USING btree ("name_key");--> statement-breakpoint
-- Server only: the app reads these through the database connection, never through the API.
REVOKE ALL ON "bvc_register", "bvc_sources" FROM anon, authenticated;
