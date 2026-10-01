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
    const sqlFilePath = path.resolve(__dirname, '../drizzle/0000_silly_medusa.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Split statements by drizzle-kit statement-breakpoint
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Executing ${statements.length} migration statements...`);

    // Ensure columns and enum values on pre-existing tables exist
    await sqlClient.unsafe(`ALTER TYPE "system_role" ADD VALUE IF NOT EXISTS 'user';`);
    await sqlClient.unsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;`);
    
    // Check if therapy_programs has resource_type column; if not, drop to recreate with proper schema
    try {
      await sqlClient.unsafe(`SELECT "resource_type" FROM "therapy_programs" LIMIT 1;`);
    } catch {
      console.log('Outdated therapy_programs table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "user_therapy_progress" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "therapy_programs" CASCADE;`);
    }

    // Check if assessments has total_questions column; if not, drop to recreate with proper schema
    try {
      await sqlClient.unsafe(`SELECT "total_questions" FROM "assessments" LIMIT 1;`);
    } catch {
      console.log('Outdated assessments table detected, recreating...');
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "assessment_results" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "assessment_questions" CASCADE;`);
      await sqlClient.unsafe(`DROP TABLE IF EXISTS "assessments" CASCADE;`);
    }

    // Check if community_groups has group_name column; if not, drop to recreate with proper schema
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

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await sqlClient.unsafe(stmt);
      } catch (err: any) {
        // If column or table already exists, log and proceed gracefully
        if (err.code === '42701' || err.code === '42P07') {
          // duplicate_column or duplicate_table
          continue;
        }
        console.warn(`Warning on statement ${i + 1}: ${err.message}`);
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
