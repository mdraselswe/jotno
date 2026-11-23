CREATE TABLE "product_categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER POLICY "consults_participants_read" ON "consults" TO authenticated USING ((select auth.uid()) = owner_id or provider_id in (select public.my_provider_ids()));--> statement-breakpoint
ALTER POLICY "messages_participants_read" ON "messages" TO authenticated USING (exists (select 1 from public.consults c where c.id = consult_id and ((select auth.uid()) = c.owner_id or c.provider_id in (select public.my_provider_ids()))));--> statement-breakpoint
-- The categories that used to live in src/content/shop.ts; admins edit them now.
INSERT INTO "product_categories" ("slug", "name_en", "name_bn", "sort") VALUES
	('food', 'Food', 'খাবার', 10),
	('grooming', 'Grooming & litter', 'গ্রুমিং ও লিটার', 20),
	('accessories', 'Beds & leashes', 'বেড ও লিশ', 30),
	('toys', 'Toys', 'খেলনা', 40),
	('dress', 'Dresses', 'পোশাক', 50)
ON CONFLICT ("slug") DO NOTHING;
