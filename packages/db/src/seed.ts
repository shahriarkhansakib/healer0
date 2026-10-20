import { db } from './index';
import { users, accounts } from './schema/auth';
import { doctorProfiles, patientProfiles } from './schema/medical';
import { 
  doctorQualifications, doctorReviews, doctorSettings, 
  patientRecords, sessionNotes, prescriptions 
} from './schema/doctor';
import { appointments } from './schema/consultations';
import { counselingSessions } from './schema/counseling';
import { wellnessRules } from './schema/wellness';
import { therapyPrograms } from './schema/therapy';
import { assessments, assessmentQuestions } from './schema/assessments';
import { doctorPatientMessages } from './schema/messages';
import { eq } from 'drizzle-orm';
import { scrypt } from 'crypto';
import fs from 'fs';
import path from 'path';

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
  const commonPassword = await hashPassword('password123');

  // 1. Seed super_admin
  let superAdminUser = await db.query.users.findFirst({ where: eq(users.email, 'superadmin@healer.app') });
  if (!superAdminUser) {
    [superAdminUser] = await db.insert(users).values({
      name: 'Super Admin',
      email: 'superadmin@healer.app',
      emailVerified: true,
      role: 'super_admin',
      status: 'active',
    }).returning();
    
    if (superAdminUser) {
      await db.insert(accounts).values({
        userId: superAdminUser.id,
        accountId: 'superadmin@healer.app',
        providerId: 'credential',
        password: commonPassword,
      });
    }
  } else {
    await db.update(accounts)
      .set({ password: commonPassword })
      .where(eq(accounts.accountId, 'superadmin@healer.app'));
  }

  // 2. Seed admin
  let adminUser = await db.query.users.findFirst({ where: eq(users.email, 'admin@healer.app') });
  if (!adminUser) {
    [adminUser] = await db.insert(users).values({
      name: 'Admin',
      email: 'admin@healer.app',
      emailVerified: true,
      role: 'admin',
      status: 'active',
    }).returning();
    
    if (adminUser) {
      await db.insert(accounts).values({
        userId: adminUser.id,
        accountId: 'admin@healer.app',
        providerId: 'credential',
        password: commonPassword,
      });
    }
  } else {
    await db.update(accounts)
      .set({ password: commonPassword })
      .where(eq(accounts.accountId, 'admin@healer.app'));
  }

  // 3. Seed doctor
  let doctorUser = await db.query.users.findFirst({ where: eq(users.email, 'doctor@healer.app') });
  if (!doctorUser) {
    [doctorUser] = await db.insert(users).values({
      name: 'Dr. Asif Mahmud',
      email: 'doctor@healer.app',
      emailVerified: true,
      role: 'doctor',
      status: 'active',
    }).returning();

    await db.insert(accounts).values({
      userId: doctorUser.id,
      accountId: 'doctor@healer.app',
      providerId: 'credential',
      password: commonPassword,
    });
  } else {
    await db.update(accounts)
      .set({ password: commonPassword })
      .where(eq(accounts.accountId, 'doctor@healer.app'));
  }

  let doctorProf = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, doctorUser.id) });
  if (!doctorProf) {
    [doctorProf] = await db.insert(doctorProfiles).values({
      userId: doctorUser.id,
      specialization: 'Psychiatry & Behavioral Health',
      licenseNumber: 'MD-948201-BD',
      hospitalAffiliation: 'Central Neuroscience & Mental Health Institute',
    }).returning();
  }

  // Seed Doctor Qualifications
  const existingQuals = await db.query.doctorQualifications.findMany({ where: eq(doctorQualifications.doctorId, doctorProf.id) });
  if (existingQuals.length === 0) {
    await db.insert(doctorQualifications).values([
      { doctorId: doctorProf.id, degree: 'MBBS (Clinical Medicine)', institution: 'Dhaka Medical College', year: 2012 },
      { doctorId: doctorProf.id, degree: 'FCPS (Psychiatry)', institution: 'BCPS Bangladesh', year: 2017 },
      { doctorId: doctorProf.id, degree: 'Fellowship in Cognitive Behavioral Therapy', institution: 'King\'s College London', year: 2020 },
    ]);
  }

  // Seed Doctor Settings
  const existingSettings = await db.query.doctorSettings.findFirst({ where: eq(doctorSettings.doctorId, doctorProf.id) });
  if (!existingSettings) {
    await db.insert(doctorSettings).values({
      doctorId: doctorProf.id,
      autoAcceptBooking: true,
      notificationEnabled: true,
      language: 'en',
      dutyStartTime: '08:00',
      dutyEndTime: '17:00',
      offDay: 'Sunday',
      bio: 'Senior Consultant Psychiatrist specializing in generalized anxiety disorders, depression therapy, and clinical neuro-rehabilitation.',
    });
  }

  // 3b. Seed Additional Verified Doctors
  const additionalDoctors = [
    {
      name: 'Dr. Farhana Rahman',
      email: 'doctor2@healer.app',
      specialization: 'Clinical Psychology & Cognitive Therapy',
      licenseNumber: 'MD-832104-BD',
      hospitalAffiliation: 'Center for Cognitive Behavioral Health',
      dutyStartTime: '09:00',
      dutyEndTime: '17:00',
      offDay: 'Friday',
      bio: 'Specialist in evidence-based cognitive behavioral therapy, acute trauma recovery, emotional regulation frameworks, and mindfulness-based stress reduction.',
      qualifications: [
        { degree: 'B.Sc (Hons) Clinical Psychology', institution: 'University of Dhaka', year: 2013 },
        { degree: 'M.S. in Clinical Psychology', institution: 'University of Dhaka', year: 2015 },
        { degree: 'Ph.D. in Cognitive Neuropsychology', institution: 'University of Melbourne', year: 2020 },
      ],
      reviews: [
        { patientName: 'Sarah J.', rating: 5, comment: 'Dr. Farhana provided a safe, non-judgmental space and gave me actionable breathing exercises that immediately eased my panic symptoms.' },
        { patientName: 'Michael C.', rating: 5, comment: 'Exceptional clinician. Her CBT frameworks are clear, empathetic, and genuinely life-changing.' },
      ],
    },
    {
      name: 'Dr. Tanvir Ahmed',
      email: 'doctor3@healer.app',
      specialization: 'Neuropsychiatry & Sleep Disorders',
      licenseNumber: 'MD-741908-BD',
      hospitalAffiliation: 'National Institute of Mental Health & Neurosciences',
      dutyStartTime: '10:00',
      dutyEndTime: '18:00',
      offDay: 'Saturday',
      bio: 'Consultant Neuropsychiatrist focusing on severe refractory mood disorders, circadian rhythm alignment, chronic insomnia, and neurological sleep cycle restoration.',
      qualifications: [
        { degree: 'MBBS', institution: 'Chittagong Medical College', year: 2011 },
        { degree: 'MD (Psychiatry)', institution: 'BSMMU Bangladesh', year: 2017 },
        { degree: 'Fellowship in Sleep Medicine', institution: 'International Neuropsychiatric Association (INA)', year: 2021 },
      ],
      reviews: [
        { patientName: 'David M.', rating: 5, comment: 'Dr. Tanvir identified the root cause of my chronic insomnia after years of struggle. Cannot recommend him enough.' },
        { patientName: 'Emily D.', rating: 4, comment: 'Very knowledgeable on neurological sleep cycles and safe medication tapering.' },
      ],
    },
    {
      name: 'Dr. Tasneem Kabir',
      email: 'doctor4@healer.app',
      specialization: 'Child, Adolescent & Family Psychiatry',
      licenseNumber: 'MD-652390-BD',
      hospitalAffiliation: 'Apollo Mind Health Center',
      dutyStartTime: '08:30',
      dutyEndTime: '16:30',
      offDay: 'Wednesday',
      bio: 'Dedicated to adolescent behavioral health, family systemic counseling, academic anxiety management, and neurodevelopmental support.',
      qualifications: [
        { degree: 'MBBS', institution: 'Sir Salimullah Medical College', year: 2014 },
        { degree: 'FCPS (Child & Adolescent Psychiatry)', institution: 'BCPS Bangladesh', year: 2019 },
      ],
      reviews: [
        { patientName: 'Lisa A.', rating: 5, comment: 'Extremely patient, compassionate, and gentle. Guided our family through difficult transitions with immense skill.' },
        { patientName: 'Michael C.', rating: 5, comment: 'Wonderful bedside manner. Explained teenage emotional dynamics in a way that truly resonated.' },
      ],
    },
  ];

  for (const doc of additionalDoctors) {
    let dUser = await db.query.users.findFirst({ where: eq(users.email, doc.email) });
    if (!dUser) {
      [dUser] = await db.insert(users).values({
        name: doc.name,
        email: doc.email,
        emailVerified: true,
        role: 'doctor',
        status: 'active',
      }).returning();

      await db.insert(accounts).values({
        userId: dUser.id,
        accountId: doc.email,
        providerId: 'credential',
        password: commonPassword,
      });
    }

    let dProf = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, dUser.id) });
    if (!dProf) {
      [dProf] = await db.insert(doctorProfiles).values({
        userId: dUser.id,
        specialization: doc.specialization,
        licenseNumber: doc.licenseNumber,
        hospitalAffiliation: doc.hospitalAffiliation,
      }).returning();
    }

    const docQuals = await db.query.doctorQualifications.findMany({ where: eq(doctorQualifications.doctorId, dProf.id) });
    if (docQuals.length === 0) {
      await db.insert(doctorQualifications).values(
        doc.qualifications.map(q => ({
          doctorId: dProf.id,
          degree: q.degree,
          institution: q.institution,
          year: q.year,
        }))
      );
    }

    const docSet = await db.query.doctorSettings.findFirst({ where: eq(doctorSettings.doctorId, dProf.id) });
    if (!docSet) {
      await db.insert(doctorSettings).values({
        doctorId: dProf.id,
        autoAcceptBooking: true,
        notificationEnabled: true,
        language: 'en',
        dutyStartTime: doc.dutyStartTime,
        dutyEndTime: doc.dutyEndTime,
        offDay: doc.offDay,
        bio: doc.bio,
      });
    }

    const docRevs = await db.query.doctorReviews.findMany({ where: eq(doctorReviews.doctorId, dProf.id) });
    if (docRevs.length === 0) {
      await db.insert(doctorReviews).values(
        doc.reviews.map(r => ({
          doctorId: dProf.id,
          patientName: r.patientName,
          rating: r.rating,
          comment: r.comment,
        }))
      );
    }
  }

  // 4. Patient Accounts & Clinical Activity
  // Note: All patient accounts, appointments, prescriptions, and session notes are created
  // organically through user self-registration and clinical consultations. No fake patient data is seeded.

  // 10. Seed Deterministic Wellness Rules (Table 13 from PDF specification)
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

  // 11. Seed Clinical Therapy Programs (Table 6 from PDF specification)
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

  // 12. Seed Standardized Assessments & MCQ Questions from JSON (24 Assessments / 329 Questions)
  const existingQuestions = await db.query.assessmentQuestions.findMany();
  const needsReseed = existingQuestions.length < 329 || existingQuestions.some(q => q.questionCode === 'src_ds_01' && /[\u0980-\u09FF]/.test(q.questionText));
  if (needsReseed) {
    await db.delete(assessmentQuestions);
    await db.delete(assessments);

    const questions174Path = path.join(__dirname, 'data', 'healer_assessments_174_questions.json');
    const uploadedQuestionnairesPath = path.join(__dirname, 'data', 'healer_uploaded_questionnaires_original_numbering.json');

    const categoryMap: Record<string, string> = {
      depression: 'Depression',
      anxiety: 'Anxiety',
      stress: 'Stress',
      burnout: 'Occupational & Burnout',
      self_esteem: 'Self-Esteem',
      emotional_intelligence: 'Emotional Intelligence',
      personality: 'Personality',
      sleep_quality: 'Sleep Quality',
      relationship_satisfaction: 'Relationships',
      resilience: 'Resilience',
      life_satisfaction: 'Life Satisfaction',
      social_anxiety: 'Social Anxiety',
      ocd: 'Obsessive-Compulsive',
      adhd: 'ADHD & Focus',
      autism: 'Autism & Neurodiversity',
      ptsd: 'Trauma & PTSD',
      iq: 'Reasoning & Cognition',
      src_dass21: 'Depression & Anxiety',
      src_ds: 'Depression',
      src_as: 'Anxiety',
      src_duocs: 'Obsessive-Compulsive',
      src_sias: 'Social Anxiety',
      src_marital: 'Relationships',
      src_love_obsession: 'Relationships',
    };

    const uploadedTitles: Record<string, string> = {
      src_dass21: 'Depression Anxiety Stress Scale (DASS-21)',
      src_ds: 'Depression Scale (DS)',
      src_as: 'Anxiety Scale (AS)',
      src_duocs: 'Dhaka University OCD Scale (DUOCS)',
      src_sias: 'Social Interaction Anxiety Scale (SIAS)',
      src_marital: 'Locke-Wallace Marital Adjustment Test (MAT)',
      src_love_obsession: 'Love Obsessed Lover Checklist',
    };

    const uploadedDescriptions: Record<string, string> = {
      src_dass21: 'Measures depression, anxiety, and tension/stress levels over the past week.',
      src_ds: 'Standardized psychological evaluation of depressive symptoms and emotional well-being.',
      src_as: 'Comprehensive assessment of physiological, cognitive, and somatic anxiety manifestations.',
      src_duocs: 'Evaluation of obsessive doubts, repetitive checking compulsions, and contamination fears.',
      src_sias: 'Measures distress and discomfort experienced in social and interpersonal interaction settings.',
      src_marital: 'Standardized appraisal of marital satisfaction, shared decision-making, and relational harmony.',
      src_love_obsession: 'Self-reflection checklist assessing romantic preoccupation, attachment boundaries, and safety.',
    };

    let totalAsmtsCount = 0;
    let totalQuestionsCount = 0;

    // A. Seed Battery 1 (17 Assessments / 174 Questions)
    if (fs.existsSync(questions174Path)) {
      const rawData = JSON.parse(fs.readFileSync(questions174Path, 'utf-8'));
      for (const asmt of rawData.assessments) {
        const relatedQuestions = rawData.questions.filter((q: { assessmentId: string }) => q.assessmentId === asmt.id);
        const [insertedAsmt] = await db.insert(assessments).values({
          code: asmt.id,
          title: asmt.name || asmt.title || `${asmt.id} Assessment`,
          category: categoryMap[asmt.id] || 'General Mental Health',
          description: asmt.basedOn
            ? `${asmt.basedOn} ${asmt.scoring?.interpretationDisplay ? asmt.scoring.interpretationDisplay.replace('{score}', 'Your score') : ''}`.trim()
            : asmt.description || 'Clinical self-reflection assessment.',
          totalQuestions: relatedQuestions.length,
          timeframe: asmt.timeframe,
          scoringConfig: asmt.scoring,
          officialReferenceBands: asmt.officialReferenceBands,
        }).returning();

        if (relatedQuestions.length > 0) {
          await db.insert(assessmentQuestions).values(
            relatedQuestions.map((q: {
              id: string;
              text: string;
              options: Array<{ id: string; label: string; score: number }>;
              order: number;
            }) => ({
              assessmentId: insertedAsmt.id,
              questionCode: q.id,
              questionText: q.text,
              options: q.options,
              optionA: q.options[0]?.label || '',
              optionB: q.options[1]?.label || '',
              optionC: q.options[2]?.label || '',
              optionD: q.options[3]?.label || '',
              optionE: q.options[4]?.label || null,
              scoreMapping: (q.options || []).reduce((acc: Record<string, number>, opt) => {
                acc[opt.id] = opt.score;
                return acc;
              }, {}),
              orderIndex: q.order,
            }))
          );
        }
        totalAsmtsCount++;
        totalQuestionsCount += relatedQuestions.length;
      }
    }

    // B. Seed Battery 2: Uploaded Digitized Bengali Clinical Questionnaires (7 Assessments / 155 Questions)
    if (fs.existsSync(uploadedQuestionnairesPath)) {
      const rawUploaded = JSON.parse(fs.readFileSync(uploadedQuestionnairesPath, 'utf-8'));
      for (const asmt of rawUploaded.assessments) {
        const relatedQuestions = rawUploaded.questions.filter((q: { assessmentId: string }) => q.assessmentId === asmt.id);
        const [insertedAsmt] = await db.insert(assessments).values({
          code: asmt.id,
          title: uploadedTitles[asmt.id] || asmt.name || `${asmt.id} Assessment`,
          category: categoryMap[asmt.id] || 'Clinical Screening',
          description: uploadedDescriptions[asmt.id] || asmt.instructions || 'Standardized clinical assessment instrument.',
          totalQuestions: relatedQuestions.length,
          timeframe: asmt.timeframe || 'Recent everyday experiences.',
          scoringConfig: asmt.scoring,
          officialReferenceBands: asmt.officialReferenceBands,
        }).returning();

        if (relatedQuestions.length > 0) {
          await db.insert(assessmentQuestions).values(
            relatedQuestions.map((q: {
              id: string;
              text: string;
              text_en?: string;
              options?: Array<{ id: string; label: string; label_en?: string; score: number }>;
              order?: number;
              originalQuestionNumber?: number;
            }) => {
              const qOptions = (q.id === 'src_marital_12' && (!q.options || q.options.length === 0))
                ? [
                    { id: 'src_marital_12_opt_1', label: 'Both prefer staying at home', score: 10 },
                    { id: 'src_marital_12_opt_2', label: 'Both prefer going out', score: 3 },
                    { id: 'src_marital_12_opt_3', label: 'I prefer staying home, spouse prefers going out', score: 2 },
                    { id: 'src_marital_12_opt_4', label: 'I prefer going out, spouse prefers staying home', score: 2 },
                  ]
                : (q.options || []).map((o) => ({
                    id: o.id,
                    label: o.label_en || o.label,
                    score: o.score,
                  }));

              return {
                assessmentId: insertedAsmt.id,
                questionCode: q.id,
                questionText: q.text_en || q.text,
                options: qOptions,
                optionA: qOptions[0]?.label || '',
                optionB: qOptions[1]?.label || '',
                optionC: qOptions[2]?.label || '',
                optionD: qOptions[3]?.label || '',
                optionE: qOptions[4]?.label || null,
                scoreMapping: qOptions.reduce((acc: Record<string, number>, opt) => {
                  acc[opt.id] = opt.score;
                  return acc;
                }, {}),
                orderIndex: q.order || q.originalQuestionNumber || 0,
              };
            })
          );
        }
        totalAsmtsCount++;
        totalQuestionsCount += relatedQuestions.length;
      }
    }

    console.log(`Successfully seeded ${totalAsmtsCount} clinical assessments with ${totalQuestionsCount} questions.`);
  }

  console.log('Seeding completed successfully with doctor data and patient datasets.');
}

main().catch(console.error).finally(() => process.exit(0));
