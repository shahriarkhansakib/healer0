import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../apps/web/.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5455/healer_db';

async function runMigration() {
  const sqlClient = postgres(connectionString, { max: 1 });
  console.log('Connecting to database:', connectionString.replace(/:[^:@]+@/, ':***@'));

  try {
    // 1. Discover and execute all baseline migration files in sorted order
    const drizzleDir = path.resolve(__dirname, '../drizzle');
    const sqlFiles = fs
      .readdirSync(drizzleDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${sqlFiles.length} migration file(s): ${sqlFiles.join(', ')}`);

    for (const sqlFile of sqlFiles) {
      const sqlFilePath = path.join(drizzleDir, sqlFile);
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`Executing ${statements.length} statements from ${sqlFile}...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await sqlClient.unsafe(stmt);
        } catch (err: any) {
          // If column, table, enum value or constraint already exists, proceed gracefully
          if (
            err.code === '42701' || // duplicate_column
            err.code === '42P07' || // duplicate_table
            err.code === '42710' || // duplicate_object
            err.message?.includes('already exists')
          ) {
            continue;
          }
          console.warn(`Warning on statement ${i + 1} of ${sqlFile}: ${err.message}`);
        }
      }
    }

    // 2. Ensure schema enhancements and extensions exist
    await sqlClient.unsafe(`ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "license_number" text;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "hospital_affiliation" text;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "consultation_reason" text;`);
    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "appointment_status" text DEFAULT 'Scheduled' NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "session_duration_minutes" integer DEFAULT 50 NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "title" text DEFAULT 'Treatment Plan' NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "patient_name" text;`);
    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "medications" jsonb DEFAULT '[]'::jsonb NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "notes" text;`);
    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`ALTER TABLE "patient_doctor_visit_summary" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "patient_doctor_visit_summary" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "off_day" text DEFAULT 'Sunday' NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "bio" text;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "duty_start_time" text DEFAULT '08:00' NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "duty_end_time" text DEFAULT '17:00' NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "auto_accept_booking" boolean DEFAULT true NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "notification_enabled" boolean DEFAULT true NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en' NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_settings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`ALTER TABLE "doctor_qualifications" ADD COLUMN IF NOT EXISTS "degree" text NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_qualifications" ADD COLUMN IF NOT EXISTS "institution" text NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_qualifications" ADD COLUMN IF NOT EXISTS "year" integer NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_qualifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_qualifications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "patient_name" text NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "rating" integer NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "comment" text;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT true NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "therapy_programs" (
        "id" text PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "resource_type" text NOT NULL,
        "category" text NOT NULL,
        "description" text NOT NULL,
        "difficulty_level" text NOT NULL,
        "duration_minutes" integer NOT NULL,
        "session_count" integer DEFAULT 1 NOT NULL,
        "duration_weeks" integer DEFAULT 1 NOT NULL,
        "daily_minutes" integer DEFAULT 15 NOT NULL,
        "emoji" text DEFAULT '🌿',
        "gradient_style" text DEFAULT 'teal',
        "audio_url" text,
        "video_url" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "therapy_progress" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "resource_id" text NOT NULL REFERENCES "therapy_programs"("id") ON DELETE CASCADE,
        "start_time" timestamp DEFAULT now() NOT NULL,
        "completion_time" timestamp,
        "status" text DEFAULT 'In Progress' NOT NULL,
        "progress_percentage" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "wellness_rules" (
        "id" text PRIMARY KEY NOT NULL,
        "condition_type" text NOT NULL,
        "minimum_value" integer,
        "recommended_goal" text NOT NULL,
        "recommended_activity" text NOT NULL,
        "priority" text DEFAULT 'Medium' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "emergency_alerts" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "alert_type" text NOT NULL,
        "latitude" numeric,
        "longitude" numeric,
        "status" text DEFAULT 'Active' NOT NULL,
        "notified_contacts" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // 3. Ensure community schema consistency
    const legacyPostsExist = await sqlClient.unsafe(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'community_posts';
    `);
    if (legacyPostsExist.length > 0) {
      console.log('Detected legacy community schema with posts/comments. Migrating to real-time chat...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_comments" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_posts" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_group_members" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_groups" CASCADE;`);
    }

    await sqlClient.unsafe(`ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "avatar_emoji" text DEFAULT '💬';`);
    await sqlClient.unsafe(`ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "requires_approval" boolean DEFAULT false NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "creator_id" text;`);
    await sqlClient.unsafe(`ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "is_invite_only" boolean DEFAULT false NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "community_groups" ADD COLUMN IF NOT EXISTS "invite_code" text;`);
    await sqlClient.unsafe(`UPDATE "community_groups" SET "invite_code" = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) WHERE "invite_code" IS NULL;`);
    await sqlClient.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "community_groups_invite_code_unique" ON "community_groups" ("invite_code");`);
    await sqlClient.unsafe(`ALTER TABLE "community_group_members" ADD COLUMN IF NOT EXISTS "anonymous_name" text;`);
    await sqlClient.unsafe(`ALTER TABLE "community_group_members" ADD COLUMN IF NOT EXISTS "avatar_color" text;`);
    await sqlClient.unsafe(`ALTER TABLE "community_group_members" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'member' NOT NULL;`);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "community_messages" (
        "id" text PRIMARY KEY NOT NULL,
        "group_id" text NOT NULL REFERENCES "community_groups"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "anonymous_name" text NOT NULL DEFAULT 'Anonymous Member',
        "avatar_color" text NOT NULL DEFAULT 'sky',
        "message_text" text NOT NULL,
        "message_type" text NOT NULL DEFAULT 'text',
        "reply_to_id" text,
        "reply_to_text" text,
        "reply_to_sender" text,
        "ai_moderation_status" text NOT NULL DEFAULT 'Approved',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "doctor_patient_messages" (
        "id" text PRIMARY KEY NOT NULL,
        "patient_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "doctor_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sender_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sender_role" text NOT NULL,
        "message_text" text NOT NULL,
        "attachment_url" text,
        "is_read" boolean DEFAULT false NOT NULL,
        "read_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "doctor_patient_messages_thread_idx" ON "doctor_patient_messages" ("patient_user_id", "doctor_user_id");
      CREATE INDEX IF NOT EXISTS "doctor_patient_messages_created_at_idx" ON "doctor_patient_messages" ("created_at");
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigration();
