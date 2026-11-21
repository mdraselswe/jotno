/**
 * Database schema (Drizzle). One source of truth for tables; `pnpm db:generate`
 * writes SQL migrations to supabase/migrations.
 *
 * Generic model: a `provider` is a VET today (MBBS later), a `patient` is an
 * ANIMAL today (HUMAN later). Money is integer poisha. Time is timestamptz (UTC).
 *
 * RLS is on for every table and there are no policies unless the browser reads
 * the table directly (chat via Supabase Realtime). Everything else goes through
 * the server, which checks permissions in features/<name>/server.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  doublePrecision,
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const tstz = (name: string) => timestamp(name, { withTimezone: true });
const point = (name: string) => geometry(name, { type: "point", mode: "xy", srid: 4326 });

// ── Enums ───────────────────────────────────────────────────────────────────
export const userRole = pgEnum("user_role", ["owner", "vet", "admin"]);
export const providerType = pgEnum("provider_type", ["VET", "MBBS"]);
export const providerStatus = pgEnum("provider_status", [
  "draft",
  "pending",
  "verified",
  "rejected",
  "suspended",
]);
export const patientKind = pgEnum("patient_kind", ["ANIMAL", "HUMAN"]);
export const sex = pgEnum("sex", ["male", "female", "unknown"]);
export const areaKind = pgEnum("area_kind", ["upazila", "thana"]);
export const questionStatus = pgEnum("question_status", ["open", "answered", "hidden"]);
export const consultStatus = pgEnum("consult_status", [
  "pending_payment",
  "active",
  "closed",
  "refunded",
  "cancelled",
]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "cancelled", "refunded"]);
export const paymentPurpose = pgEnum("payment_purpose", ["consult", "appointment", "featured", "order"]);
export const ledgerKind = pgEnum("ledger_kind", ["charge", "commission", "vet_payable", "refund", "payout"]);
export const healthKind = pgEnum("health_kind", ["vaccine", "deworm", "checkup"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export const articleStatus = pgEnum("article_status", ["draft", "published"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
]);

// ── People ──────────────────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: userRole("role").notNull().default("owner"),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  avatarPath: text("avatar_path"),
  locale: text("locale").notNull().default("bn"),
  /** Where the person lives, for "vets near me" (no FK: reference tables are seeded after). */
  homeDistrictId: integer("home_district_id"),
  homeAreaId: integer("home_area_id"),
  onboarded: boolean("onboarded").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
}).enableRLS();

// ── Places and animals (reference data) ─────────────────────────────────────
export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameBn: text("name_bn").notNull(),
}).enableRLS();

export const districts = pgTable(
  "districts",
  {
    id: serial("id").primaryKey(),
    divisionId: integer("division_id")
      .notNull()
      .references(() => divisions.id),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
  },
  (t) => [index("districts_division_idx").on(t.divisionId)],
).enableRLS();

/** Upazilas and city thanas (Mirpur, Dhanmondi…): what people call "area". */
export const areas = pgTable(
  "areas",
  {
    id: serial("id").primaryKey(),
    districtId: integer("district_id")
      .notNull()
      .references(() => districts.id),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    kind: areaKind("kind").notNull(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
  },
  (t) => [index("areas_district_idx").on(t.districtId)],
).enableRLS();

export const species = pgTable("species", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameBn: text("name_bn").notNull(),
  sort: integer("sort").notNull().default(0),
}).enableRLS();

export const breeds = pgTable(
  "breeds",
  {
    id: serial("id").primaryKey(),
    speciesId: integer("species_id")
      .notNull()
      .references(() => species.id),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
  },
  (t) => [index("breeds_species_idx").on(t.speciesId)],
).enableRLS();

// ── Providers (vets) ────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  districtId: integer("district_id").references(() => districts.id),
  areaId: integer("area_id").references(() => areas.id),
  createdAt: createdAt(),
}).enableRLS();

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: providerType("type").notNull().default("VET"),
    status: providerStatus("status").notNull().default("draft"),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    title: text("title"),
    bio: text("bio"),
    qualifications: text("qualifications"),
    registrationNo: text("registration_no"),
    registrationBody: text("registration_body").notNull().default("BVC"),
    experienceYears: integer("experience_years"),
    /** Chat consult fee in poisha. */
    consultFee: integer("consult_fee").notNull().default(30000),
    /** Clinic visit fee in poisha (appointments). */
    visitFee: integer("visit_fee").notNull().default(50000),
    organizationId: uuid("organization_id").references(() => organizations.id),
    clinicName: text("clinic_name"),
    address: text("address"),
    districtId: integer("district_id").references(() => districts.id),
    areaId: integer("area_id").references(() => areas.id),
    location: point("location"),
    phonePublic: text("phone_public"),
    availableNow: boolean("available_now").notNull().default(false),
    availableUntil: tstz("available_until"),
    emergency24x7: boolean("emergency_24x7").notNull().default(false),
    homeVisit: boolean("home_visit").notNull().default(false),
    photoPath: text("photo_path"),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    consultCount: integer("consult_count").notNull().default(0),
    completeness: integer("completeness").notNull().default(0),
    rejectionReason: text("rejection_reason"),
    submittedAt: tstz("submitted_at"),
    verifiedAt: tstz("verified_at"),
    lastSeenAt: tstz("last_seen_at"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("providers_search_idx").on(t.status, t.districtId, t.areaId),
    index("providers_location_idx").using("gist", t.location),
  ],
).enableRLS();

export const providerSpecies = pgTable(
  "provider_species",
  {
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    speciesId: integer("species_id")
      .notNull()
      .references(() => species.id),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.speciesId] })],
).enableRLS();

export const providerDocuments = pgTable("provider_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  path: text("path").notNull(),
  createdAt: createdAt(),
}).enableRLS();

/** Weekly opening hours for appointments (minutes from midnight, Dhaka time). */
export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    slotMinutes: integer("slot_minutes").notNull().default(20),
  },
  (t) => [index("availability_provider_idx").on(t.providerId)],
).enableRLS();

export const featuredSlots = pgTable(
  "featured_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    districtId: integer("district_id").references(() => districts.id),
    areaId: integer("area_id").references(() => areas.id),
    speciesId: integer("species_id").references(() => species.id),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    source: text("source").notNull().default("manual"),
    paymentId: uuid("payment_id"),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("featured_active_idx").on(t.endsAt, t.districtId)],
).enableRLS();

export const providerStatsDaily = pgTable(
  "provider_stats_daily",
  {
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
    calls: integer("calls").notNull().default(0),
    chats: integer("chats").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.day] })],
).enableRLS();

// ── Patients (pets) ─────────────────────────────────────────────────────────
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: patientKind("kind").notNull().default("ANIMAL"),
    name: text("name").notNull(),
    speciesId: integer("species_id").references(() => species.id),
    breedId: integer("breed_id").references(() => breeds.id),
    sex: sex("sex").notNull().default("unknown"),
    birthDate: date("birth_date"),
    weightGrams: integer("weight_grams"),
    color: text("color"),
    photoPath: text("photo_path"),
    notes: text("notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("patients_owner_idx").on(t.ownerId)],
).enableRLS();

export const healthRecords = pgTable(
  "health_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    kind: healthKind("kind").notNull(),
    title: text("title").notNull(),
    givenOn: date("given_on"),
    dueOn: date("due_on"),
    note: text("note"),
    remindedAt: tstz("reminded_at"),
    createdAt: createdAt(),
  },
  (t) => [index("health_patient_idx").on(t.patientId), index("health_due_idx").on(t.dueOn)],
).enableRLS();

// ── Q&A ─────────────────────────────────────────────────────────────────────
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    speciesId: integer("species_id").references(() => species.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    photoPath: text("photo_path"),
    status: questionStatus("status").notNull().default("open"),
    answerCount: integer("answer_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("questions_list_idx").on(t.status, t.createdAt)],
).enableRLS();

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("answers_question_idx").on(t.questionId)],
).enableRLS();

export const answerVotes = pgTable(
  "answer_votes",
  {
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.answerId, t.userId] })],
).enableRLS();

// ── Consults (paid chat) ────────────────────────────────────────────────────
const isParticipant = sql`(select auth.uid()) = owner_id or (select auth.uid()) = (select p.profile_id from public.providers p where p.id = provider_id)`;

export const consults = pgTable(
  "consults",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    status: consultStatus("status").notNull().default("pending_payment"),
    fee: integer("fee").notNull(),
    commission: integer("commission").notNull(),
    summary: text("summary").notNull(),
    openedAt: tstz("opened_at"),
    firstReplyAt: tstz("first_reply_at"),
    closesAt: tstz("closes_at"),
    closedAt: tstz("closed_at"),
    closeReason: text("close_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    index("consults_owner_idx").on(t.ownerId),
    index("consults_provider_idx").on(t.providerId, t.status),
    pgPolicy("consults_participants_read", {
      for: "select",
      to: authenticatedRole,
      using: isParticipant,
    }),
  ],
).enableRLS();

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consultId: uuid("consult_id")
      .notNull()
      .references(() => consults.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => profiles.id, { onDelete: "set null" }),
    /** null sender = system message (opened, closed, refunded). */
    body: text("body"),
    imagePath: text("image_path"),
    readAt: tstz("read_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("messages_consult_idx").on(t.consultId, t.createdAt),
    pgPolicy("messages_participants_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.consults c where c.id = consult_id and ((select auth.uid()) = c.owner_id or (select auth.uid()) = (select p.profile_id from public.providers p where p.id = c.provider_id)))`,
    }),
  ],
).enableRLS();

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consultId: uuid("consult_id").references(() => consults.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("reviews_provider_idx").on(t.providerId, t.createdAt),
    uniqueIndex("reviews_consult_uq").on(t.consultId),
    uniqueIndex("reviews_appointment_uq").on(t.appointmentId),
  ],
).enableRLS();

// ── Appointments ────────────────────────────────────────────────────────────
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    status: appointmentStatus("status").notNull().default("pending_payment"),
    /** Paid online (booking fee); the visit fee is paid at the clinic. */
    bookingFee: integer("booking_fee").notNull(),
    visitFee: integer("visit_fee").notNull(),
    reason: text("reason"),
    remindedAt: tstz("reminded_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("appointments_owner_idx").on(t.ownerId),
    uniqueIndex("appointments_slot_uq")
      .on(t.providerId, t.startsAt)
      .where(sql`status in ('pending_payment', 'confirmed', 'completed')`),
  ],
).enableRLS();

// ── Money ───────────────────────────────────────────────────────────────────
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    purpose: paymentPurpose("purpose").notNull(),
    refId: uuid("ref_id").notNull(),
    amount: integer("amount").notNull(),
    gateway: text("gateway").notNull(),
    /** The gateway's own transaction id; unique so a repeated IPN never credits twice. */
    gatewayTxId: text("gateway_tx_id").unique(),
    sessionKey: text("session_key"),
    status: paymentStatus("status").notNull().default("pending"),
    raw: jsonb("raw"),
    paidAt: tstz("paid_at"),
    createdAt: createdAt(),
  },
  (t) => [index("payments_ref_idx").on(t.purpose, t.refId)],
).enableRLS();

/**
 * Every money event is a row; balances are sums, never a stored number.
 * Signed amounts: vet balance = sum(amount) of vet_payable + payout rows for
 * that provider whose available_at has passed (payouts are negative).
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: ledgerKind("kind").notNull(),
    providerId: uuid("provider_id").references(() => providers.id),
    paymentId: uuid("payment_id").references(() => payments.id),
    refId: uuid("ref_id"),
    amount: integer("amount").notNull(),
    availableAt: tstz("available_at"),
    memo: text("memo"),
    createdAt: createdAt(),
  },
  (t) => [index("ledger_provider_idx").on(t.providerId, t.kind)],
).enableRLS();

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => providers.id),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  reference: text("reference"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: createdAt(),
}).enableRLS();

// ── Content ─────────────────────────────────────────────────────────────────
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull(),
    speciesId: integer("species_id").references(() => species.id),
    status: articleStatus("status").notNull().default("draft"),
    publishedAt: tstz("published_at"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("articles_list_idx").on(t.status, t.publishedAt)],
).enableRLS();

// ── Shop ────────────────────────────────────────────────────────────────────
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    descriptionEn: text("description_en"),
    descriptionBn: text("description_bn"),
    category: text("category").notNull(),
    speciesId: integer("species_id").references(() => species.id),
    price: integer("price").notNull(),
    compareAt: integer("compare_at"),
    stock: integer("stock").notNull().default(0),
    imagePath: text("image_path"),
    active: boolean("active").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("products_list_idx").on(t.active, t.category)],
).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    status: orderStatus("status").notNull().default("pending_payment"),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    total: integer("total").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    districtId: integer("district_id").references(() => districts.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
).enableRLS();

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  qty: integer("qty").notNull(),
}).enableRLS();

// ── Platform ────────────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").$type<Record<string, string | number>>().notNull().default({}),
    readAt: tstz("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
).enableRLS();

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)],
).enableRLS();

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: tstz("window_start").notNull(),
  count: integer("count").notNull().default(0),
}).enableRLS();

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").references(() => profiles.id, { onDelete: "set null" }),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  reason: text("reason").notNull(),
  resolvedAt: tstz("resolved_at"),
  createdAt: createdAt(),
}).enableRLS();
