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
    // 1. Ensure system_role enum and essential user columns exist
    await sqlClient.unsafe(`ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'user';`);
    await sqlClient.unsafe(`ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'patient';`);
    await sqlClient.unsafe(`ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'doctor';`);
    await sqlClient.unsafe(`ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'researcher';`);
    await sqlClient.unsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;`);

    // 2. Clean up legacy orphaned tables that do not exist in current schema
    await sqlClient.unsafe(`
      DROP TABLE IF EXISTS "meditation_history", "meditation_contents", "wellness_plan_tasks", "wellness_plans" CASCADE;
    `);

    // 3. Check for and recreate any outdated tables whose schema evolved
    // Mood tracking
    try {
      await sqlClient.unsafe(`SELECT "mood_type" FROM "mood_tracking" LIMIT 1;`);
    } catch {
      console.log('Outdated or missing mood_tracking table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "mood_tracking" CASCADE;`);
    }

    // Journals
    try {
      await sqlClient.unsafe(`SELECT "ai_sentiment" FROM "journals" LIMIT 1;`);
    } catch {
      console.log('Outdated journals table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "journals" CASCADE;`);
    }
    await sqlClient.unsafe(`ALTER TABLE "journals" ADD COLUMN IF NOT EXISTS "entry_date" timestamp DEFAULT now() NOT NULL;`);
    await sqlClient.unsafe(`ALTER TABLE "doctor_reviews" ADD COLUMN IF NOT EXISTS "appointment_id" text;`);

    // Emergency & Trusted Contacts
    try {
      await sqlClient.unsafe(`SELECT "risk_level" FROM "crisis_events" LIMIT 1;`);
    } catch {
      console.log('Outdated crisis_events table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "crisis_events" CASCADE;`);
    }
    try {
      await sqlClient.unsafe(`SELECT "contact_name" FROM "trusted_contacts" LIMIT 1;`);
    } catch {
      console.log('Outdated trusted_contacts table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "trusted_contacts" CASCADE;`);
    }

    // Counseling
    try {
      await sqlClient.unsafe(`SELECT "session_type" FROM "counseling_sessions" LIMIT 1;`);
    } catch {
      console.log('Outdated counseling_sessions table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "counseling_messages" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "counseling_sessions" CASCADE;`);
    }

    // Appointments & Visit summary
    try {
      await sqlClient.unsafe(`SELECT "consultation_type" FROM "appointments" LIMIT 1;`);
    } catch {
      console.log('Outdated appointments table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "patient_doctor_visit_summary" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "appointments" CASCADE;`);
    }

    // Therapy programs
    try {
      await sqlClient.unsafe(`SELECT "resource_type" FROM "therapy_programs" LIMIT 1;`);
    } catch {
      console.log('Outdated therapy_programs table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "user_therapy_progress" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "therapy_programs" CASCADE;`);
    }

    // Assessments
    try {
      await sqlClient.unsafe(`SELECT "total_questions" FROM "assessments" LIMIT 1;`);
    } catch {
      console.log('Outdated assessments table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "assessment_results" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "assessment_questions" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "assessments" CASCADE;`);
    }

    // Community groups
    try {
      await sqlClient.unsafe(`SELECT "group_name" FROM "community_groups" LIMIT 1;`);
    } catch {
      console.log('Outdated community tables detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_comments" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_post_likes" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_posts" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_group_members" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "community_groups" CASCADE;`);
    }

    // 4. Discover and execute all migration files in sorted order
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

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigration();
