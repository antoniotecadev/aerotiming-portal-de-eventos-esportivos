-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('atleta', 'organizador', 'admin');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BI', 'PASSAPORTE');

-- CreateEnum
CREATE TYPE "TShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('rascunho', 'brevemente', 'inscricoes_abertas', 'inscricoes_encerradas', 'a_decorrer', 'terminado', 'cancelado');

-- CreateEnum
CREATE TYPE "EventStaffRole" AS ENUM ('organizador', 'staff');

-- CreateEnum
CREATE TYPE "RoutePointType" AS ENUM ('partida', 'chegada', 'agua', 'abastecimento', 'medico', 'controlo');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pagamento_pendente', 'confirmada', 'cancelada', 'expirada');

-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('por_levantar', 'levantado');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('multicaixa_express', 'transferencia', 'deposito', 'kwik');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pendente', 'em_analise', 'confirmado', 'rejeitado', 'expirado', 'cancelado', 'reembolsado');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('terminou', 'desistiu', 'desclassificado', 'nao_partiu');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('principal', 'oficial', 'apoio');

-- CreateEnum
CREATE TYPE "BannerKind" AS ENUM ('evento', 'publicidade', 'memoria');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'atleta',
    "birth_date" DATE,
    "gender" "Gender",
    "document_type" "DocumentType",
    "document_number" TEXT,
    "province" TEXT,
    "city" TEXT,
    "club" TEXT,
    "tshirt" "TShirtSize",
    "blood_type" TEXT,
    "emergency_name" TEXT,
    "emergency_phone" TEXT,
    "emergency_relation" TEXT,
    "notify_sms" BOOLEAN NOT NULL DEFAULT true,
    "notify_email" BOOLEAN NOT NULL DEFAULT true,
    "notify_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "url" TEXT,
    "tier" "SponsorTier" NOT NULL DEFAULT 'apoio',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "cta_label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "kind" "BannerKind" NOT NULL DEFAULT 'evento',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "edition" INTEGER NOT NULL DEFAULT 1,
    "category_slug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "map_url" TEXT,
    "poster_url" TEXT NOT NULL,
    "cover_url" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'rascunho',
    "registration_opens" DATE NOT NULL,
    "registration_closes" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "highlights" TEXT[],
    "organizer_name" TEXT NOT NULL,
    "organizer_phone" TEXT NOT NULL,
    "organizer_email" TEXT NOT NULL,
    "kit_location" TEXT NOT NULL,
    "kit_address" TEXT NOT NULL,
    "kit_items" TEXT[],
    "kit_notes" TEXT[],
    "regulation_pdf_url" TEXT,
    "payment_accounts" JSONB,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "results_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff" (
    "event_id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" "EventStaffRole" NOT NULL DEFAULT 'organizador',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("event_id","profile_id")
);

-- CreateTable
CREATE TABLE "event_distances" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distance_km" DECIMAL(7,3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "total_slots" INTEGER NOT NULL,
    "slots_taken" INTEGER NOT NULL DEFAULT 0,
    "min_age" INTEGER NOT NULL DEFAULT 0,
    "elevation_gain" INTEGER NOT NULL DEFAULT 0,
    "time_limit" TEXT,
    "bib_start" INTEGER NOT NULL DEFAULT 1,
    "next_bib" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_distances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_tiers" (
    "id" TEXT NOT NULL,
    "distance_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "until" DATE NOT NULL,
    "price" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_routes" (
    "id" TEXT NOT NULL,
    "distance_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "path" JSONB NOT NULL,
    "elevation" JSONB NOT NULL,
    "gpx_url" TEXT,

    CONSTRAINT "event_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_points" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "km" DECIMAL(7,3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoutePointType" NOT NULL,

    CONSTRAINT "route_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_pickups" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,

    CONSTRAINT "kit_pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_items" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_sections" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "items" TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "regulation_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sponsors" (
    "event_id" TEXT NOT NULL,
    "sponsor_id" TEXT NOT NULL,

    CONSTRAINT "event_sponsors_pkey" PRIMARY KEY ("event_id","sponsor_id")
);

-- CreateTable
CREATE TABLE "event_alerts" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" UUID,
    "phone" TEXT,
    "email" TEXT,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "distance_id" TEXT NOT NULL,
    "user_id" UUID,
    "bib" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pagamento_pendente',
    "price" INTEGER NOT NULL,
    "price_tier_label" TEXT NOT NULL,
    "athlete_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" DATE NOT NULL,
    "age_group" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "province" TEXT NOT NULL,
    "club" TEXT NOT NULL DEFAULT 'Individual',
    "nationality" TEXT NOT NULL DEFAULT 'Angola',
    "tshirt" "TShirtSize" NOT NULL,
    "emergency_name" TEXT NOT NULL,
    "emergency_phone" TEXT NOT NULL,
    "emergency_relation" TEXT,
    "blood_type" TEXT,
    "medical_notes" TEXT,
    "accepted_rules_at" TIMESTAMPTZ(3) NOT NULL,
    "health_declaration_at" TIMESTAMPTZ(3) NOT NULL,
    "kit_status" "KitStatus" NOT NULL DEFAULT 'por_levantar',
    "kit_picked_up_at" TIMESTAMPTZ(3),
    "kit_picked_up_by_id" UUID,
    "created_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pendente',
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "payer_name" TEXT,
    "payer_phone" TEXT,
    "transaction_ref" TEXT,
    "proof_url" TEXT,
    "proof_hash" TEXT,
    "proof_uploaded_at" TIMESTAMPTZ(3),
    "notes" TEXT,
    "review_note" TEXT,
    "expires_at" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "confirmed_by_id" UUID,
    "provider" TEXT,
    "provider_ref" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "distance_id" TEXT NOT NULL,
    "registration_id" TEXT,
    "bib" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "age_group" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Angola',
    "position" INTEGER,
    "position_gender" INTEGER,
    "position_age_group" INTEGER,
    "chip_time_ms" INTEGER,
    "gun_time_ms" INTEGER,
    "status" "ResultStatus" NOT NULL DEFAULT 'terminou',
    "splits" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles"("phone");

-- CreateIndex
CREATE INDEX "banners_active_sort_order_idx" ON "banners"("active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_date_idx" ON "events"("status", "date");

-- CreateIndex
CREATE INDEX "events_category_slug_date_idx" ON "events"("category_slug", "date");

-- CreateIndex
CREATE INDEX "events_province_date_idx" ON "events"("province", "date");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at");

-- CreateIndex
CREATE INDEX "event_staff_profile_id_idx" ON "event_staff"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_distances_event_id_code_key" ON "event_distances"("event_id", "code");

-- CreateIndex
CREATE INDEX "price_tiers_distance_id_until_idx" ON "price_tiers"("distance_id", "until");

-- CreateIndex
CREATE UNIQUE INDEX "event_routes_distance_id_key" ON "event_routes"("distance_id");

-- CreateIndex
CREATE INDEX "route_points_route_id_idx" ON "route_points"("route_id");

-- CreateIndex
CREATE INDEX "kit_pickups_event_id_idx" ON "kit_pickups"("event_id");

-- CreateIndex
CREATE INDEX "schedule_items_event_id_idx" ON "schedule_items"("event_id");

-- CreateIndex
CREATE INDEX "regulation_sections_event_id_idx" ON "regulation_sections"("event_id");

-- CreateIndex
CREATE INDEX "event_sponsors_sponsor_id_idx" ON "event_sponsors"("sponsor_id");

-- CreateIndex
CREATE INDEX "event_alerts_event_id_sent_at_idx" ON "event_alerts"("event_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_code_key" ON "registrations"("code");

-- CreateIndex
CREATE INDEX "registrations_event_id_status_idx" ON "registrations"("event_id", "status");

-- CreateIndex
CREATE INDEX "registrations_distance_id_status_idx" ON "registrations"("distance_id", "status");

-- CreateIndex
CREATE INDEX "registrations_user_id_idx" ON "registrations"("user_id");

-- CreateIndex
CREATE INDEX "registrations_phone_idx" ON "registrations"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_event_id_bib_key" ON "registrations"("event_id", "bib");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_active_document_key" ON "registrations"("event_id", "document_number") WHERE (status IN ('pagamento_pendente', 'confirmada'));

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_ref_key" ON "payments"("provider_ref");

-- CreateIndex
CREATE INDEX "payments_registration_id_idx" ON "payments"("registration_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_expires_at_idx" ON "payments"("status", "expires_at");

-- CreateIndex
CREATE INDEX "payments_transaction_ref_idx" ON "payments"("transaction_ref");

-- CreateIndex
CREATE INDEX "payments_proof_hash_idx" ON "payments"("proof_hash");

-- CreateIndex
CREATE UNIQUE INDEX "results_registration_id_key" ON "results"("registration_id");

-- CreateIndex
CREATE INDEX "results_event_id_distance_id_position_idx" ON "results"("event_id", "distance_id", "position");

-- CreateIndex
CREATE INDEX "results_distance_id_gender_position_gender_idx" ON "results"("distance_id", "gender", "position_gender");

-- CreateIndex
CREATE UNIQUE INDEX "results_event_id_bib_key" ON "results"("event_id", "bib");

-- CreateIndex
CREATE INDEX "contact_messages_handled_created_at_idx" ON "contact_messages"("handled", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_category_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "categories"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_distances" ADD CONSTRAINT "event_distances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_distance_id_fkey" FOREIGN KEY ("distance_id") REFERENCES "event_distances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_routes" ADD CONSTRAINT "event_routes_distance_id_fkey" FOREIGN KEY ("distance_id") REFERENCES "event_distances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_points" ADD CONSTRAINT "route_points_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "event_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_pickups" ADD CONSTRAINT "kit_pickups_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation_sections" ADD CONSTRAINT "regulation_sections_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_alerts" ADD CONSTRAINT "event_alerts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_alerts" ADD CONSTRAINT "event_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_distance_id_fkey" FOREIGN KEY ("distance_id") REFERENCES "event_distances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_distance_id_fkey" FOREIGN KEY ("distance_id") REFERENCES "event_distances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
