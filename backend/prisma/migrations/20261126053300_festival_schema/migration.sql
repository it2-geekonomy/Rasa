-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('RESERVED_SEATING', 'GENERAL_ADMISSION');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PERFORMANCE', 'WORKSHOP', 'EXHIBITION', 'WELLNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('SEAT_BASED', 'CAPACITY_BASED', 'FREE_ENTRY');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'OPEN', 'SOLD_OUT', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('NORMAL', 'WHEELCHAIR');

-- CreateEnum
CREATE TYPE "AllocationOwner" AS ENUM ('RASA', 'BOOKMYSHOW', 'VENUE', 'VIP');

-- CreateEnum
CREATE TYPE "EventSeatStatus" AS ENUM ('AVAILABLE', 'BLOCKED', 'HELD', 'BOOKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('SUCCESS', 'REJECTED');

-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "venue_type" "VenueType" NOT NULL,
    "description" TEXT,
    "total_capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seating_sections" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "section_name" VARCHAR(100) NOT NULL,
    "section_code" VARCHAR(30) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "layout_metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seating_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "row_label" VARCHAR(10) NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "seat_label" VARCHAR(30) NOT NULL,
    "seat_type" "SeatType" NOT NULL DEFAULT 'NORMAL',
    "x_position" DOUBLE PRECISION,
    "y_position" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "event_type" "EventType" NOT NULL,
    "booking_mode" "BookingMode" NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "banner_image" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sessions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "session_name" VARCHAR(150),
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "capacity" INTEGER,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "booking_open_at" TIMESTAMPTZ(3),
    "booking_close_at" TIMESTAMPTZ(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_seats" (
    "id" UUID NOT NULL,
    "event_session_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "allocation_owner" "AllocationOwner" NOT NULL DEFAULT 'RASA',
    "status" "EventSeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hold_expires_at" TIMESTAMPTZ(3),
    "hold_token" VARCHAR(64),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "event_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_reference" VARCHAR(50) NOT NULL,
    "event_session_id" UUID NOT NULL,
    "customer_name" VARCHAR(150) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "booking_status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "booked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_seats" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "event_seat_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL DEFAULT 'RAZORPAY',
    "razorpay_order_id" VARCHAR(150),
    "razorpay_payment_id" VARCHAR(150),
    "razorpay_signature" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_tickets" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "event_session_id" UUID NOT NULL,
    "booking_seat_id" UUID,
    "ticket_number" VARCHAR(100) NOT NULL,
    "qr_token" VARCHAR(255) NOT NULL,
    "attendee_name" VARCHAR(150) NOT NULL,
    "attendee_email" VARCHAR(255),
    "attendee_phone" VARCHAR(20),
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_checkins" (
    "id" UUID NOT NULL,
    "booking_ticket_id" UUID NOT NULL,
    "scanned_by" UUID,
    "checkin_status" "CheckinStatus" NOT NULL,
    "checked_in_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ticket_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_key" ON "venues"("name");

-- CreateIndex
CREATE UNIQUE INDEX "seating_sections_venue_id_section_code_key" ON "seating_sections"("venue_id", "section_code");

-- CreateIndex
CREATE UNIQUE INDEX "seats_section_id_row_label_seat_number_key" ON "seats"("section_id", "row_label", "seat_number");

-- CreateIndex
CREATE UNIQUE INDEX "seats_section_id_seat_label_key" ON "seats"("section_id", "seat_label");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "event_sessions_event_id_idx" ON "event_sessions"("event_id");

-- CreateIndex
CREATE INDEX "event_sessions_venue_id_start_at_idx" ON "event_sessions"("venue_id", "start_at");

-- CreateIndex
CREATE INDEX "event_sessions_status_idx" ON "event_sessions"("status");

-- CreateIndex
CREATE INDEX "event_seats_event_session_id_status_idx" ON "event_seats"("event_session_id", "status");

-- CreateIndex
CREATE INDEX "event_seats_allocation_owner_idx" ON "event_seats"("allocation_owner");

-- CreateIndex
CREATE INDEX "event_seats_hold_token_idx" ON "event_seats"("hold_token");

-- CreateIndex
CREATE UNIQUE INDEX "event_seats_event_session_id_seat_id_key" ON "event_seats"("event_session_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "bookings_customer_email_idx" ON "bookings"("customer_email");

-- CreateIndex
CREATE INDEX "bookings_customer_phone_idx" ON "bookings"("customer_phone");

-- CreateIndex
CREATE INDEX "bookings_event_session_id_booking_status_idx" ON "bookings"("event_session_id", "booking_status");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "booking_seats_event_seat_id_idx" ON "booking_seats"("event_seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_booking_id_event_seat_id_key" ON "booking_seats"("booking_id", "event_seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "booking_tickets_booking_seat_id_key" ON "booking_tickets"("booking_seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_tickets_ticket_number_key" ON "booking_tickets"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "booking_tickets_qr_token_key" ON "booking_tickets"("qr_token");

-- CreateIndex
CREATE INDEX "booking_tickets_booking_id_idx" ON "booking_tickets"("booking_id");

-- CreateIndex
CREATE INDEX "booking_tickets_event_session_id_status_idx" ON "booking_tickets"("event_session_id", "status");

-- CreateIndex
CREATE INDEX "ticket_checkins_booking_ticket_id_checked_in_at_idx" ON "ticket_checkins"("booking_ticket_id", "checked_in_at");

-- AddForeignKey
ALTER TABLE "seating_sections" ADD CONSTRAINT "seating_sections_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "seating_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_seats" ADD CONSTRAINT "event_seats_event_session_id_fkey" FOREIGN KEY ("event_session_id") REFERENCES "event_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_seats" ADD CONSTRAINT "event_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_session_id_fkey" FOREIGN KEY ("event_session_id") REFERENCES "event_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_event_seat_id_fkey" FOREIGN KEY ("event_seat_id") REFERENCES "event_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_tickets" ADD CONSTRAINT "booking_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_tickets" ADD CONSTRAINT "booking_tickets_event_session_id_fkey" FOREIGN KEY ("event_session_id") REFERENCES "event_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_tickets" ADD CONSTRAINT "booking_tickets_booking_seat_id_fkey" FOREIGN KEY ("booking_seat_id") REFERENCES "booking_seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_checkins" ADD CONSTRAINT "ticket_checkins_booking_ticket_id_fkey" FOREIGN KEY ("booking_ticket_id") REFERENCES "booking_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business checks Prisma cannot express in the schema
ALTER TABLE "event_sessions"
ADD CONSTRAINT "chk_session_time"
CHECK ("end_at" > "start_at");

ALTER TABLE "event_sessions"
ADD CONSTRAINT "chk_session_capacity"
CHECK (capacity IS NULL OR capacity > 0);

ALTER TABLE "event_seats"
ADD CONSTRAINT "chk_event_seat_price"
CHECK (price >= 0);

ALTER TABLE "bookings"
ADD CONSTRAINT "chk_booking_quantity"
CHECK (quantity > 0);

ALTER TABLE "bookings"
ADD CONSTRAINT "chk_booking_amounts"
CHECK (
  subtotal >= 0
  AND discount_amount >= 0
  AND total_amount >= 0
);

ALTER TABLE "booking_seats"
ADD CONSTRAINT "chk_booking_seat_price"
CHECK (price >= 0);

ALTER TABLE "payments"
ADD CONSTRAINT "chk_payment_amount"
CHECK (amount >= 0);

CREATE UNIQUE INDEX "unique_successful_ticket_checkin"
ON "ticket_checkins" ("booking_ticket_id")
WHERE "checkin_status" = 'SUCCESS';
