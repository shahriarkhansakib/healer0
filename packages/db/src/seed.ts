import { db } from './index';
import { users, accounts } from './schema/auth';
import { wellnessRules } from './schema/wellness';
import { therapyPrograms } from './schema/therapy';
import { assessments, assessmentQuestions } from './schema/assessments';
import { communityGroups } from './schema/community';
import { eq } from 'drizzle-orm';
import { scrypt } from 'crypto';

function generateKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
      },
      (err, buff) => {
        if (err) return reject(err);
        resolve(buff);
      }
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

async function main() {
  const superAdminPassword = await hashPassword('password123');
  const adminPassword = await hashPassword('password123');

  // 1. Seed super_admin
  const existingSuperAdmin = await db.query.users.findFirst({ where: eq(users.email, 'superadmin@healer.app') });
  if (!existingSuperAdmin) {
    const [user] = await db.insert(users).values({
      name: 'Super Admin',
      email: 'superadmin@healer.app',
      emailVerified: true,
      role: 'super_admin',
      status: 'active',
    }).returning();
    
    if (user) {
      await db.insert(accounts).values({
        userId: user.id,
        accountId: 'superadmin@healer.app',
        providerId: 'credential',
        password: superAdminPassword,
      });
    }
  } else {
    await db.update(accounts)
      .set({ password: superAdminPassword })
      .where(eq(accounts.accountId, 'superadmin@healer.app'));
  }

  // 2. Seed admin
  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, 'admin@healer.app') });
  if (!existingAdmin) {
    const [user] = await db.insert(users).values({
      name: 'Admin',
      email: 'admin@healer.app',
      emailVerified: true,
      role: 'admin',
      status: 'active',
    }).returning();
    
    if (user) {
      await db.insert(accounts).values({
        userId: user.id,
        accountId: 'admin@healer.app',
        providerId: 'credential',
        password: adminPassword,
      });
    }
  } else {
    await db.update(accounts)
      .set({ password: adminPassword })
      .where(eq(accounts.accountId, 'admin@healer.app'));
  }

  // 3. Seed Deterministic Wellness Rules (Table 13 from PDF specification)
  const existingRules = await db.query.wellnessRules.findMany();
  if (existingRules.length === 0) {
    await db.insert(wellnessRules).values([
      {
        conditionType: 'Stress',
        minimumValue: 8,
        recommendedGoal: 'Reduce Stress',
        recommendedActivity: 'Breathing Exercise',
        priority: 'High',
      },
      {
        conditionType: 'Anxiety',
        minimumValue: 7,
        recommendedGoal: 'Manage Anxiety',
        recommendedActivity: 'Relaxation Exercise',
        priority: 'High',
      },
      {
        conditionType: 'Sleep',
        minimumValue: 4,
        recommendedGoal: 'Improve Sleep',
        recommendedActivity: 'Sleep Routine',
        priority: 'Medium',
      },
      {
        conditionType: 'Mood',
        minimumValue: null,
        recommendedGoal: 'Improve Mood',
        recommendedActivity: 'Journaling',
        priority: 'Medium',
      },
    ]);
  }

  // 4. Seed Clinical Therapy Programs (Table 6 from PDF specification)
  const existingPrograms = await db.query.therapyPrograms.findMany();
  if (existingPrograms.length === 0) {
    await db.insert(therapyPrograms).values([
      {
        title: 'CBT Anxiety Control',
        resourceType: 'Therapy',
        category: 'Anxiety',
        description: 'Evidence-based cognitive behavioral therapy exercises for interrupting negative thought loops.',
        difficultyLevel: 'Intermediate',
        durationMinutes: 15,
      },
      {
        title: 'Calm Breathing & Box Meditation',
        resourceType: 'Meditation',
        category: 'Anxiety',
        description: 'Guided 4-4-4-4 box breathing technique to lower heart rate and reduce physiological panic.',
        difficultyLevel: 'Beginner',
        durationMinutes: 10,
      },
      {
        title: 'Sleep Relaxation & Wind Down',
        resourceType: 'Relaxation',
        category: 'Sleep',
        description: 'Progressive muscle relaxation and binaural sleep soundscapes for deeper REM restorative cycles.',
        difficultyLevel: 'Beginner',
        durationMinutes: 20,
      },
      {
        title: 'Better Sleep Program',
        resourceType: 'Therapy',
        category: 'Sleep',
        description: 'Comprehensive 7-day sleep hygiene protocols, circadian alignment, and bedtime journaling.',
        difficultyLevel: 'Beginner',
        durationMinutes: 25,
      },
    ]);
  }

  // 5. Seed Standardized Assessments & Questions (Tables 8 & 9 from PDF specification)
  const existingAssessments = await db.query.assessments.findMany();
  if (existingAssessments.length === 0) {
    const [as1] = await db.insert(assessments).values({
      title: 'Depression Screening Test (PHQ-9)',
      category: 'Depression',
      description: 'Measures clinical depression severity, cognitive fatigue, and loss of interest in activities.',
      totalQuestions: 2,
    }).returning();

    if (as1) {
      await db.insert(assessmentQuestions).values([
        {
          assessmentId: as1.id,
          questionText: 'Feeling tired, fatigued, or having little energy?',
          optionA: 'Never',
          optionB: 'Several days',
          optionC: 'More than half the days',
          optionD: 'Nearly every day',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 1,
        },
        {
          assessmentId: as1.id,
          questionText: 'Little interest or pleasure in doing everyday activities?',
          optionA: 'Never',
          optionB: 'Several days',
          optionC: 'More than half the days',
          optionD: 'Nearly every day',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 2,
        },
      ]);
    }

    const [as2] = await db.insert(assessments).values({
      title: 'Anxiety Assessment (GAD-7)',
      category: 'Anxiety',
      description: 'Screens for generalized anxiety symptoms, persistent rumination, and somatic nervousness.',
      totalQuestions: 2,
    }).returning();

    if (as2) {
      await db.insert(assessmentQuestions).values([
        {
          assessmentId: as2.id,
          questionText: 'Do you feel excessive worry that is difficult to control?',
          optionA: 'Not at all',
          optionB: 'Mild (Several days)',
          optionC: 'Moderate (Half days)',
          optionD: 'Severe (Nearly daily)',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 1,
        },
        {
          assessmentId: as2.id,
          questionText: 'Do you experience restlessness or find it difficult to sit still and relax?',
          optionA: 'Not at all',
          optionB: 'Rarely',
          optionC: 'Frequently',
          optionD: 'Almost constantly',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 2,
        },
      ]);
    }
  }

  // 6. Seed Community Groups (Table 16 from PDF specification)
  const existingGroups = await db.query.communityGroups.findMany();
  if (existingGroups.length === 0) {
    await db.insert(communityGroups).values([
      {
        groupName: 'Anxiety Support & Recovery',
        topic: 'Anxiety Recovery',
        description: 'A compassionate, peer-supported safe haven for individuals managing panic and anxiety.',
        anonymousAllowed: true,
      },
      {
        groupName: 'Student & Academic Stress',
        topic: 'Academic Pressure',
        description: 'Discuss exam pressure, university expectations, and healthy work-life boundaries.',
        anonymousAllowed: true,
      },
      {
        groupName: 'Sleep Improvement & Insomnia',
        topic: 'Sleep Improvement',
        description: 'Techniques, bedtime routines, and support for restoring natural sleep cycles.',
        anonymousAllowed: true,
      },
    ]);
  }

  console.log('Seeding completed successfully with clinical models and initial datasets.');
}

main().catch(console.error).finally(() => process.exit(0));
