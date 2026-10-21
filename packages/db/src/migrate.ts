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

    // Ensure researcher_profiles columns exist
    await sqlClient.unsafe(`ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "full_name" text;`);
    await sqlClient.unsafe(`ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "email" text;`);
    await sqlClient.unsafe(`ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "designation" text DEFAULT 'Principal Investigator';`);
    await sqlClient.unsafe(`ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'Verified';`);
    await sqlClient.unsafe(`ALTER TABLE "researcher_profiles" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "researcher_mode_enabled" boolean DEFAULT false NOT NULL;`);

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

    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "doctor_id" text;`);
    await sqlClient.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "doctor_notes" text;`);
    try {
      await sqlClient.unsafe(`ALTER TABLE "appointments" ALTER COLUMN "psychologist_id" DROP NOT NULL;`);
    } catch {}

    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "doctor_id" text;`);
    try {
      await sqlClient.unsafe(`ALTER TABLE "prescriptions" ALTER COLUMN "psychologist_id" DROP NOT NULL;`);
    } catch {}

    await sqlClient.unsafe(`ALTER TABLE "session_notes" ADD COLUMN IF NOT EXISTS "doctor_id" text;`);
    try {
      await sqlClient.unsafe(`ALTER TABLE "session_notes" ALTER COLUMN "psychologist_id" DROP NOT NULL;`);
    } catch {}

    await sqlClient.unsafe(`ALTER TABLE "counseling_sessions" ADD COLUMN IF NOT EXISTS "doctor_id" text;`);
    try {
      await sqlClient.unsafe(`ALTER TABLE "counseling_sessions" ALTER COLUMN "psychologist_id" DROP NOT NULL;`);
    } catch {}

    try {
      await sqlClient.unsafe(`ALTER TABLE "patient_records" ALTER COLUMN "psychologist_id" DROP NOT NULL;`);
    } catch {}

    await sqlClient.unsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "appointment_id" text;`);
    await sqlClient.unsafe(`ALTER TABLE "session_notes" ADD COLUMN IF NOT EXISTS "appointment_id" text;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "appointment_id" text;`);
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

    // 3. Ensure researcher domain tables exist
    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "researcher_dashboard_summaries" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL UNIQUE REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "active_projects" integer DEFAULT 0 NOT NULL,
        "total_participants" integer DEFAULT 0 NOT NULL,
        "completed_surveys" integer DEFAULT 0 NOT NULL,
        "collected_records" integer DEFAULT 0 NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_projects" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "project_title" text NOT NULL,
        "research_area" text NOT NULL,
        "description" text NOT NULL,
        "start_date" timestamp,
        "end_date" timestamp,
        "status" text DEFAULT 'Active' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_participants" (
        "id" text PRIMARY KEY NOT NULL,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
        "participant_code" text NOT NULL,
        "age_group" text NOT NULL,
        "gender" text NOT NULL,
        "eligibility_status" text DEFAULT 'Eligible' NOT NULL,
        "consent_status" text DEFAULT 'Consented' NOT NULL,
        "joined_date" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "participant_screening" (
        "id" text PRIMARY KEY NOT NULL,
        "participant_id" text NOT NULL REFERENCES "research_participants"("id") ON DELETE CASCADE,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "criteria" text NOT NULL,
        "result" text NOT NULL,
        "screened_date" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_surveys" (
        "id" text PRIMARY KEY NOT NULL,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "description" text,
        "form_url" text,
        "embed_url" text,
        "total_questions" integer DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'Published' NOT NULL,
        "created_date" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "survey_questions" (
        "id" text PRIMARY KEY NOT NULL,
        "survey_id" text NOT NULL REFERENCES "research_surveys"("id") ON DELETE CASCADE,
        "question_text" text NOT NULL,
        "question_type" text NOT NULL,
        "options" jsonb,
        "order_index" integer DEFAULT 1 NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_data_collection" (
        "id" text PRIMARY KEY NOT NULL,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "participant_id" text REFERENCES "research_participants"("id") ON DELETE SET NULL,
        "data_type" text NOT NULL,
        "data_value" jsonb NOT NULL,
        "collected_date" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_analytics" (
        "id" text PRIMARY KEY NOT NULL,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "analysis_type" text NOT NULL,
        "result_summary" text NOT NULL,
        "generated_report" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "participant_matching_requests" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "target_group" text NOT NULL,
        "criteria" jsonb NOT NULL,
        "matched_count" integer DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'Completed' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "matched_participants" (
        "id" text PRIMARY KEY NOT NULL,
        "matching_request_id" text NOT NULL REFERENCES "participant_matching_requests"("id") ON DELETE CASCADE,
        "participant_id" text NOT NULL REFERENCES "research_participants"("id") ON DELETE CASCADE,
        "match_score" text NOT NULL,
        "reason" text NOT NULL,
        "approval_status" text DEFAULT 'Approved' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "literature_search_history" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "search_keyword" text NOT NULL,
        "filters" jsonb,
        "result_count" integer DEFAULT 0 NOT NULL,
        "searched_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_papers" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "authors" text NOT NULL,
        "journal_name" text NOT NULL,
        "publication_year" integer NOT NULL,
        "paper_url" text,
        "added_date" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "collaboration_network" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "connected_researcher_id" text,
        "connected_researcher_name" text NOT NULL,
        "connected_institution" text NOT NULL,
        "collaboration_type" text NOT NULL,
        "status" text DEFAULT 'Active' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_collaboration_messages" (
        "id" text PRIMARY KEY NOT NULL,
        "collaboration_id" text NOT NULL REFERENCES "collaboration_network"("id") ON DELETE CASCADE,
        "sender_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sender_name" text NOT NULL,
        "message" text NOT NULL,
        "sent_time" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "research_reports" (
        "id" text PRIMARY KEY NOT NULL,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "report_title" text NOT NULL,
        "summary" text NOT NULL,
        "file_url" text,
        "generated_date" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "researcher_permissions" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "project_id" text NOT NULL REFERENCES "research_projects"("id") ON DELETE CASCADE,
        "data_access_type" text NOT NULL,
        "approval_status" text DEFAULT 'Approved' NOT NULL,
        "approved_date" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "researcher_settings" (
        "id" text PRIMARY KEY NOT NULL,
        "researcher_id" text NOT NULL UNIQUE REFERENCES "researcher_profiles"("id") ON DELETE CASCADE,
        "notification_enabled" boolean DEFAULT true NOT NULL,
        "language" text DEFAULT 'en' NOT NULL,
        "privacy_mode" boolean DEFAULT true NOT NULL,
        "is_enabled" boolean DEFAULT true NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // 4. Ensure community schema consistency
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

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "community_groups" (
        "id" text PRIMARY KEY NOT NULL,
        "group_name" text NOT NULL,
        "topic" text NOT NULL,
        "description" text,
        "avatar_emoji" text DEFAULT '💬',
        "anonymous_allowed" boolean DEFAULT true NOT NULL,
        "requires_approval" boolean DEFAULT false NOT NULL,
        "is_hidden" boolean DEFAULT false NOT NULL,
        "is_invite_only" boolean DEFAULT false NOT NULL,
        "invite_code" text UNIQUE,
        "creator_id" text REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await sqlClient.unsafe(`
      CREATE TABLE IF NOT EXISTS "community_group_members" (
        "id" text PRIMARY KEY NOT NULL,
        "group_id" text NOT NULL REFERENCES "community_groups"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "anonymous_name" text,
        "avatar_color" text,
        "joined_date" timestamp DEFAULT now() NOT NULL,
        "member_status" text DEFAULT 'Active' NOT NULL,
        "role" text DEFAULT 'member' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

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
