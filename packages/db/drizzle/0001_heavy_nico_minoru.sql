ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'patient';--> statement-breakpoint
ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'doctor';--> statement-breakpoint
ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'researcher';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_qualifications" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"degree" text NOT NULL,
	"institution" text NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"patient_id" text,
	"patient_name" text DEFAULT 'Anonymous Patient' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"auto_accept_booking" boolean DEFAULT false NOT NULL,
	"notification_enabled" boolean DEFAULT true NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"duty_start_time" text DEFAULT '08:00' NOT NULL,
	"duty_end_time" text DEFAULT '17:00' NOT NULL,
	"off_day" text DEFAULT 'Sunday' NOT NULL,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctor_settings_doctor_id_unique" UNIQUE("doctor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_records" (
	"id" text PRIMARY KEY NOT NULL,
	"doctor_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"condition" text NOT NULL,
	"medical_history" text,
	"previous_sessions" integer DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'Low' NOT NULL,
	"allergies" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prescriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text,
	"doctor_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"title" text NOT NULL,
	"medications" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text,
	"doctor_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"session_summary" text NOT NULL,
	"clinical_impressions" text,
	"diagnosis" text,
	"treatment_plan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patient_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_doctor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_doctor_visit_summary" DROP CONSTRAINT IF EXISTS "patient_doctor_visit_summary_patient_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_doctor_visit_summary" DROP CONSTRAINT IF EXISTS "patient_doctor_visit_summary_doctor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "consultation_type" SET DEFAULT 'In-person';--> statement-breakpoint
ALTER TABLE "counseling_sessions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ALTER COLUMN "session_type" SET DEFAULT 'Mental Health';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "patient_name" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reason" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "start_at" timestamp;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "end_at" timestamp;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD COLUMN IF NOT EXISTS "doctor_id" text;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD COLUMN IF NOT EXISTS "patient_id" text;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD COLUMN IF NOT EXISTS "patient_name" text;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_qualifications" ADD CONSTRAINT "doctor_qualifications_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_patient_id_patient_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_settings" ADD CONSTRAINT "doctor_settings_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_patient_id_patient_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patient_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_patient_id_patient_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
