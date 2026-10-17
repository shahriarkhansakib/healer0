import { db, therapyPrograms, eq } from './index';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../apps/web/.env.local') });
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5455/healer_db';

async function updateDb() {
  const sql = postgres(connectionString, { max: 1 });
  console.log('Adding columns to therapy_programs if not exist...');
  await sql.unsafe(`
    ALTER TABLE "therapy_programs" ADD COLUMN IF NOT EXISTS "session_count" integer DEFAULT 8 NOT NULL;
    ALTER TABLE "therapy_programs" ADD COLUMN IF NOT EXISTS "duration_weeks" integer DEFAULT 8 NOT NULL;
    ALTER TABLE "therapy_programs" ADD COLUMN IF NOT EXISTS "daily_minutes" integer DEFAULT 25 NOT NULL;
    ALTER TABLE "therapy_programs" ADD COLUMN IF NOT EXISTS "emoji" text DEFAULT '🌿' NOT NULL;
    ALTER TABLE "therapy_programs" ADD COLUMN IF NOT EXISTS "gradient_style" text DEFAULT 'emerald' NOT NULL;
  `);
  await sql.end();

  console.log('Seeding / updating the 8 therapy programs from user screenshots...');
  const programsData = [
    {
      title: 'Emotional Regulation',
      emoji: '🎭',
      gradientStyle: 'purple',
      resourceType: 'Therapy',
      category: 'DBT',
      description: 'DBT-informed skills to understand, name, and guide your emotions instead of fighting them.',
      difficultyLevel: 'Intermediate',
      durationMinutes: 25,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
    },
    {
      title: 'Self-Esteem Building',
      emoji: '💪',
      gradientStyle: 'emerald',
      resourceType: 'Therapy',
      category: 'CBT',
      description: 'Replace the inner critic with self-compassion and build a grounded sense of your own worth.',
      difficultyLevel: 'Beginner',
      durationMinutes: 25,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
    },
    {
      title: 'Behavioral Activation',
      emoji: '🎯',
      gradientStyle: 'teal',
      resourceType: 'Therapy',
      category: 'CBT',
      description: 'Use action to drive mood — schedule meaningful activities and build momentum to overcome depressive inertia.',
      difficultyLevel: 'Intermediate',
      durationMinutes: 25,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
    },
    {
      title: 'Acceptance & Commitment Therapy',
      emoji: '🌿',
      gradientStyle: 'green',
      resourceType: 'Therapy',
      category: 'ACT',
      description: 'Accept difficult thoughts and feelings while committing to actions aligned with your deepest values.',
      difficultyLevel: 'Advanced',
      durationMinutes: 30,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 30,
    },
    {
      title: 'Dialectical Behavior Therapy',
      emoji: '⚖️',
      gradientStyle: 'blue',
      resourceType: 'Therapy',
      category: 'DBT',
      description: 'Build a life worth living using DBT skills across mindfulness, distress tolerance, and interpersonal effectiveness.',
      difficultyLevel: 'Advanced',
      durationMinutes: 35,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 35,
    },
    {
      title: 'Positive Psychology',
      emoji: '⭐',
      gradientStyle: 'lime',
      resourceType: 'Therapy',
      category: 'Focus',
      description: 'Cultivate strengths, gratitude, and meaning to flourish and thrive—not just survive.',
      difficultyLevel: 'Beginner',
      durationMinutes: 20,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 20,
    },
    {
      title: 'Sleep Improvement Program',
      emoji: '😴',
      gradientStyle: 'ocean',
      resourceType: 'Relaxation',
      category: 'Sleep',
      description: 'Evidence-based sleep hygiene and relaxation practices to restore restful, restorative sleep.',
      difficultyLevel: 'Beginner',
      durationMinutes: 15,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 15,
    },
    {
      title: 'Relationship Therapy',
      emoji: '💕',
      gradientStyle: 'mint',
      resourceType: 'Therapy',
      category: 'Anxiety',
      description: 'Understand patterns and build deeper connection, trust, and healthy interpersonal boundaries.',
      difficultyLevel: 'Intermediate',
      durationMinutes: 25,
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
    },
  ];

  for (const prog of programsData) {
    const existing = await db.query.therapyPrograms.findFirst({
      where: eq(therapyPrograms.title, prog.title),
    });
    if (existing) {
      await db.update(therapyPrograms).set(prog).where(eq(therapyPrograms.id, existing.id));
      console.log('Updated:', prog.title);
    } else {
      await db.insert(therapyPrograms).values(prog);
      console.log('Inserted:', prog.title);
    }
  }

  console.log('All programs seeded successfully!');
  process.exit(0);
}

updateDb().catch(e => { console.error(e); process.exit(1); });
