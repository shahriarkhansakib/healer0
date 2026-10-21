import { db } from './index';
import { users, accounts } from './schema/auth';
import { doctorProfiles, patientProfiles, researcherProfiles } from './schema/medical';
import { userProfiles, userPreferences } from './schema/account';
import {
  doctorQualifications, doctorReviews, doctorSettings,
  patientRecords, sessionNotes, prescriptions
} from './schema/doctor';
import { appointments, patientDoctorVisitSummary } from './schema/consultations';
import { counselingSessions } from './schema/counseling';
import { wellnessRules } from './schema/wellness';
import { moodTracking, journals } from './schema/wellness';
import { therapyPrograms } from './schema/therapy';
import { assessments, assessmentQuestions, assessmentResults } from './schema/assessments';
import { communityGroups } from './schema/community';
import { crisisEvents } from './schema/emergency';
import {
  researcherDashboardSummaries,
  researchProjects,
  researchParticipants,
  participantScreening,
  researchSurveys,
  surveyQuestions,
  researchDataCollection,
  researchPapers,
  collaborationNetwork,
  researcherPermissions,
  researcherSettings,
} from './schema/researcher';
import { eq } from 'drizzle-orm';
import { scrypt } from 'crypto';

// ---------------------------------------------------------------------------
// Password Hashing Utilities (mirrors Better Auth's scrypt format)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Idempotent helpers: find-or-create patterns prevent duplicate rows
// ---------------------------------------------------------------------------

async function findOrCreateUser(data: {
  email: string;
  name: string;
  role: 'user' | 'patient' | 'doctor' | 'researcher' | 'admin' | 'super_admin';
  hashedPassword: string;
}) {
  let user = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (!user) {
    [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      emailVerified: true,
      role: data.role,
      status: 'active',
    }).returning();

    await db.insert(accounts).values({
      userId: user.id,
      accountId: data.email,
      providerId: 'credential',
      password: data.hashedPassword,
    });
  } else {
    // Reset password on re-seed so demo credentials always work
    await db.update(accounts)
      .set({ password: data.hashedPassword })
      .where(eq(accounts.accountId, data.email));
  }
  return user;
}

// ---------------------------------------------------------------------------
// Main Seed Orchestrator
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱  Starting Healer database seed…\n');
  const commonPassword = await hashPassword('password123');

  // =========================================================================
  // 1.  USERS — All five roles
  // =========================================================================

  console.log('👤  Seeding users…');

  const superAdminUser = await findOrCreateUser({
    email: 'superadmin@healer.app', name: 'Super Admin', role: 'super_admin', hashedPassword: commonPassword,
  });

  const adminUser = await findOrCreateUser({
    email: 'admin@healer.app', name: 'Admin', role: 'admin', hashedPassword: commonPassword,
  });

  const doctorUser = await findOrCreateUser({
    email: 'doctor@healer.app', name: 'Dr. Asif Mahmud', role: 'doctor', hashedPassword: commonPassword,
  });

  const researcherUser = await findOrCreateUser({
    email: 'researcher@healer.app', name: 'Dr. Ayesha Rahman', role: 'researcher', hashedPassword: commonPassword,
  });

  const patientsData = [
    { email: 'patient1@healer.app', name: 'Sarah Jenkins', blood: 'A+', condition: 'Generalized Anxiety Disorder (GAD)', risk: 'Moderate' },
    { email: 'patient2@healer.app', name: 'Michael Chang', blood: 'O+', condition: 'Severe Panic Disorder with Agoraphobia', risk: 'High' },
    { email: 'patient3@healer.app', name: 'Emily Davis', blood: 'B+', condition: 'Major Depressive Episode', risk: 'Critical' },
    { email: 'patient4@healer.app', name: 'David Miller', blood: 'AB-', condition: 'Work-Related Burnout & Chronic Insomnia', risk: 'Low' },
    { email: 'patient5@healer.app', name: 'Lisa Anderson', blood: 'O-', condition: 'Post-Traumatic Stress Symptoms', risk: 'Moderate' },
  ];

  const patientUsers: { user: typeof doctorUser; data: typeof patientsData[0] }[] = [];
  for (const p of patientsData) {
    const pUser = await findOrCreateUser({ email: p.email, name: p.name, role: 'patient', hashedPassword: commonPassword });
    patientUsers.push({ user: pUser, data: p });
  }

  // =========================================================================
  // 2.  DOCTOR PROFILE, QUALIFICATIONS, SETTINGS
  // =========================================================================

  console.log('🩺  Seeding doctor profile…');

  let doctorProf = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, doctorUser.id) });
  if (!doctorProf) {
    [doctorProf] = await db.insert(doctorProfiles).values({
      userId: doctorUser.id,
      specialization: 'Psychiatry & Behavioral Health',
      licenseNumber: 'MD-948201-BD',
      hospitalAffiliation: 'Central Neuroscience & Mental Health Institute',
    }).returning();
  }

  const existingQuals = await db.query.doctorQualifications.findMany({ where: eq(doctorQualifications.doctorId, doctorProf.id) });
  if (existingQuals.length === 0) {
    await db.insert(doctorQualifications).values([
      { doctorId: doctorProf.id, degree: 'MBBS (Clinical Medicine)', institution: 'Dhaka Medical College', year: 2012 },
      { doctorId: doctorProf.id, degree: 'FCPS (Psychiatry)', institution: 'BCPS Bangladesh', year: 2017 },
      { doctorId: doctorProf.id, degree: 'Fellowship in Cognitive Behavioral Therapy', institution: 'King\'s College London', year: 2020 },
    ]);
  }

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

  // =========================================================================
  // 3.  PATIENT PROFILES & RECORDS
  // =========================================================================

  console.log('🏥  Seeding patient profiles & records…');

  const createdPatients: { profileId: string; name: string; userId: string }[] = [];

  for (const { user: pUser, data: p } of patientUsers) {
    let pProf = await db.query.patientProfiles.findFirst({ where: eq(patientProfiles.userId, pUser.id) });
    if (!pProf) {
      [pProf] = await db.insert(patientProfiles).values({
        userId: pUser.id,
        bloodType: p.blood,
        allergies: ['Penicillin'],
        medicalHistory: { notes: 'No major surgeries reported.' },
      }).returning();
    }
    createdPatients.push({ profileId: pProf.id, name: p.name, userId: pUser.id });

    // Patient Record under the demo doctor
    const existingRecord = await db.query.patientRecords.findFirst({ where: eq(patientRecords.patientId, pProf.id) });
    if (!existingRecord) {
      await db.insert(patientRecords).values({
        doctorId: doctorProf.id,
        patientId: pProf.id,
        patientName: p.name,
        condition: p.condition,
        medicalHistory: 'Managed with weekly cognitive sessions and light lifestyle routine.',
        previousSessions: 4,
        riskLevel: p.risk,
        allergies: 'Penicillin',
        notes: 'Patient shows consistent progress during scheduled counseling sessions.',
      });
    }
  }

  // =========================================================================
  // 4.  APPOINTMENTS (past, today, future)
  // =========================================================================

  console.log('📅  Seeding appointments…');

  const existingAppts = await db.query.appointments.findMany({ where: eq(appointments.doctorId, doctorProf.id) });
  let firstApptId: string | null = null;

  if (existingAppts.length === 0) {
    const today = new Date();
    const pastDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
    const apptList = [
      {
        patientId: createdPatients[0].profileId,
        patientName: createdPatients[0].name,
        appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 2),
        consultationType: 'In-person',
        reason: 'Monthly Mental Wellness Checkup & Medication Review',
        status: 'scheduled',
      },
      {
        patientId: createdPatients[1].profileId,
        patientName: createdPatients[1].name,
        appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 4),
        consultationType: 'Counseling',
        reason: 'Acute Panic Episode Assessment',
        status: 'in-progress',
      },
      {
        patientId: createdPatients[2].profileId,
        patientName: createdPatients[2].name,
        appointmentDate: new Date(today.getTime() - 1000 * 60 * 60 * 24),
        consultationType: 'Online',
        reason: 'Follow-up on Sleep Therapy Routine',
        status: 'completed',
      },
      {
        patientId: createdPatients[3].profileId,
        patientName: createdPatients[3].name,
        appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 26),
        consultationType: 'In-person',
        reason: 'Work Stress Rehabilitation Evaluation',
        status: 'scheduled',
      },
    ];

    // Completed past appointment (for session note & prescription linkage)
    const [pastAppt] = await db.insert(appointments).values({
      doctorId: doctorProf.id,
      patientId: createdPatients[0].profileId,
      patientName: createdPatients[0].name,
      appointmentDate: pastDate,
      consultationType: 'Video',
      reason: 'Follow-up for chronic migraines & stress',
      consultationReason: 'Follow-up for chronic migraines & stress',
      status: 'completed',
      appointmentStatus: 'Completed',
      doctorNotes: 'Patient responded well to initial treatment.',
      startAt: new Date(pastDate.getTime() - 3600000),
      endAt: pastDate,
    }).returning();

    firstApptId = pastAppt.id;

    // Remaining appointments
    const inserted = await db.insert(appointments).values(
      apptList.map(a => ({
        doctorId: doctorProf.id,
        patientId: a.patientId,
        patientName: a.patientName,
        appointmentDate: a.appointmentDate,
        consultationType: a.consultationType,
        reason: a.reason,
        consultationReason: a.reason,
        status: a.status,
        appointmentStatus: a.status === 'completed' ? 'Completed' : a.status === 'canceled' ? 'Cancelled' : 'Scheduled',
      }))
    ).returning();

    if (!firstApptId && inserted.length > 0) {
      firstApptId = inserted[0].id;
    }
  } else {
    firstApptId = existingAppts[0].id;
  }

  // =========================================================================
  // 5.  SESSION NOTES
  // =========================================================================

  console.log('📝  Seeding session notes…');

  const existingNotes = await db.query.sessionNotes.findMany({ where: eq(sessionNotes.doctorId, doctorProf.id) });
  if (existingNotes.length === 0) {
    await db.insert(sessionNotes).values([
      {
        appointmentId: firstApptId,
        doctorId: doctorProf.id,
        patientId: createdPatients[0].profileId,
        patientName: createdPatients[0].name,
        sessionSummary: 'Patient reports mild anxiety symptoms during high workload periods. Sleep duration averages 6 hours.',
        clinicalImpressions: 'Alert, cooperative, well-groomed. Affect is congruent with mood.',
        diagnosis: 'F41.1 Generalized Anxiety Disorder',
        treatmentPlan: 'Maintain current SSRI dosage. Continue mindfulness practice for 15 mins daily.',
      },
      {
        doctorId: doctorProf.id,
        patientId: createdPatients[2].profileId,
        patientName: createdPatients[2].name,
        sessionSummary: 'Patient experiencing mood fluctuations following recent career shift.',
        clinicalImpressions: 'Mild psychomotor slowing, responsive to therapeutic dialogue.',
        diagnosis: 'F32.1 Moderate Depressive Episode',
        treatmentPlan: 'Initiated light physical exercise regimen and prescribed bedtime sleep aid.',
      },
    ]);
  }

  // =========================================================================
  // 6.  PRESCRIPTIONS
  // =========================================================================

  console.log('💊  Seeding prescriptions…');

  const existingRx = await db.query.prescriptions.findMany({ where: eq(prescriptions.doctorId, doctorProf.id) });
  if (existingRx.length === 0) {
    await db.insert(prescriptions).values([
      {
        appointmentId: firstApptId,
        doctorId: doctorProf.id,
        patientId: createdPatients[0].profileId,
        patientName: createdPatients[0].name,
        title: 'Anxiety Management & Sleep Hygiene Protocol',
        medications: [
          { medicationName: 'Sertraline 50mg', dosage: '1 Tablet', frequency: 'Once daily (Morning)', duration: '30 Days', instructions: 'Take with food.' },
          { medicationName: 'Melatonin 3mg', dosage: '1 Tablet', frequency: 'Bedtime', duration: '14 Days', instructions: 'Take 30 mins before sleep.' },
        ],
        notes: 'Avoid caffeine after 4 PM. Schedule review in 4 weeks.',
      },
      {
        doctorId: doctorProf.id,
        patientId: createdPatients[1].profileId,
        patientName: createdPatients[1].name,
        title: 'Acute Panic Stabilization Regimen',
        medications: [
          { medicationName: 'Propranolol 10mg', dosage: '1 Tablet', frequency: 'As needed for acute tremor/tachycardia', duration: '15 Days', instructions: 'Max 2 tablets per day.' },
        ],
        notes: 'Use in conjunction with deep breathing techniques during panic onset.',
      },
    ]);
  }

  // =========================================================================
  // 7.  DOCTOR REVIEWS
  // =========================================================================

  console.log('⭐  Seeding doctor reviews…');

  const existingReviews = await db.query.doctorReviews.findMany({ where: eq(doctorReviews.doctorId, doctorProf.id) });
  if (existingReviews.length === 0) {
    await db.insert(doctorReviews).values([
      { doctorId: doctorProf.id, patientId: createdPatients[0].profileId, patientName: 'Sarah J.', rating: 5, comment: 'Dr. Asif is empathetic, incredibly thorough, and explained my treatment plan step by step!' },
      { doctorId: doctorProf.id, patientId: createdPatients[3].profileId, patientName: 'David M.', rating: 5, comment: 'Very calm and reassuring clinical environment. My sleep quality improved within two weeks.' },
    ]);
  }

  // =========================================================================
  // 8.  COUNSELING SESSIONS
  // =========================================================================

  console.log('🗣️  Seeding counseling sessions…');

  const existingCounseling = await db.query.counselingSessions.findMany({ where: eq(counselingSessions.doctorId, doctorProf.id) });
  if (existingCounseling.length === 0) {
    const today = new Date();
    await db.insert(counselingSessions).values([
      {
        doctorId: doctorProf.id,
        patientId: createdPatients[0].profileId,
        patientName: createdPatients[0].name,
        sessionType: 'Stress Management',
        startTime: new Date(today.getTime() + 1000 * 60 * 90),
        status: 'upcoming',
        notes: 'Focus on breathing techniques and sleep hygiene.',
      },
      {
        doctorId: doctorProf.id,
        patientId: createdPatients[1].profileId,
        patientName: createdPatients[1].name,
        sessionType: 'Therapy',
        startTime: new Date(today.getTime() - 1000 * 60 * 60 * 48),
        status: 'completed',
        notes: 'Patient completed cognitive exposure session smoothly.',
      },
      {
        doctorId: doctorProf.id,
        patientId: createdPatients[4].profileId,
        patientName: createdPatients[4].name,
        sessionType: 'Mental Health',
        startTime: new Date(today.getTime() + 1000 * 60 * 60 * 30),
        status: 'upcoming',
        notes: 'Post-trauma recovery milestone check-in.',
      },
    ]);
  }

  // =========================================================================
  // 9.  VISIT SUMMARIES
  // =========================================================================

  console.log('📊  Seeding visit summaries…');

  const existingSummary = await db.query.patientDoctorVisitSummary.findFirst({
    where: eq(patientDoctorVisitSummary.doctorId, doctorProf.id),
  });
  if (!existingSummary) {
    await db.insert(patientDoctorVisitSummary).values({
      patientId: createdPatients[0].profileId,
      patientName: createdPatients[0].name,
      doctorId: doctorProf.id,
      doctorName: doctorUser.name,
      totalVisits: 5,
      firstVisitDate: new Date('2026-06-15'),
      lastVisitDate: new Date('2026-10-03'),
      totalConsultationMinutes: 240,
    });
  }

  // =========================================================================
  // 10. WELLNESS RULES (deterministic clinical rules)
  // =========================================================================

  console.log('🧘  Seeding wellness rules…');

  const existingRules = await db.query.wellnessRules.findMany();
  if (existingRules.length === 0) {
    await db.insert(wellnessRules).values([
      { conditionType: 'Stress', minimumValue: 8, recommendedGoal: 'Reduce Stress', recommendedActivity: 'Breathing Exercise', priority: 'High' },
      { conditionType: 'Anxiety', minimumValue: 7, recommendedGoal: 'Manage Anxiety', recommendedActivity: 'Relaxation Exercise', priority: 'High' },
      { conditionType: 'Sleep', minimumValue: 4, recommendedGoal: 'Improve Sleep', recommendedActivity: 'Sleep Routine', priority: 'Medium' },
      { conditionType: 'Mood', minimumValue: null, recommendedGoal: 'Improve Mood', recommendedActivity: 'Journaling', priority: 'Medium' },
    ]);
  }

  // =========================================================================
  // 11. MOOD TRACKING (patient 1)
  // =========================================================================

  console.log('📈  Seeding mood tracking…');

  const patient1User = patientUsers[0].user;
  const existingMood = await db.query.moodTracking.findFirst({
    where: eq(moodTracking.userId, patient1User.id),
  });
  if (!existingMood) {
    const daysAgo = [0, 2, 4, 6, 8];
    for (const d of daysAgo) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      await db.insert(moodTracking).values({
        userId: patient1User.id,
        moodType: d % 2 === 0 ? 'Stressed' : 'Normal',
        stressLevel: 7 - (d % 3),
        anxietyLevel: 6 - (d % 2),
        sleepQuality: 5 + (d % 3),
        notes: d % 2 === 0
          ? 'Work pressure increased heading into deadlines.'
          : 'Slept relatively better after mindfulness session.',
        recordedDate: date,
      });
    }
  }

  // =========================================================================
  // 12. JOURNAL ENTRIES (patient 1)
  // =========================================================================

  console.log('📖  Seeding journal entries…');

  const existingJournal = await db.query.journals.findFirst({
    where: eq(journals.userId, patient1User.id),
  });
  if (!existingJournal) {
    await db.insert(journals).values({
      userId: patient1User.id,
      title: 'Reflections on Weekly Stress Management',
      content: 'Felt quite overwhelmed earlier this week due to tight project deadlines. Practiced deep breathing exercises recommended during my last consultation. Taking short walks during break time helped lower my heart rate.',
      mood: 'Worried',
      aiSentiment: 'Low Mood',
      aiSummary: 'Patient notes high work stress but successfully utilized coping mechanisms.',
    });
  }

  // =========================================================================
  // 13. THERAPY PROGRAMS
  // =========================================================================

  console.log('🧠  Seeding therapy programs…');

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

  // =========================================================================
  // 14. ASSESSMENTS & QUESTIONS
  // =========================================================================

  console.log('📋  Seeding assessments…');

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
          optionA: 'Never', optionB: 'Several days', optionC: 'More than half the days', optionD: 'Nearly every day',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 1,
        },
        {
          assessmentId: as1.id,
          questionText: 'Little interest or pleasure in doing everyday activities?',
          optionA: 'Never', optionB: 'Several days', optionC: 'More than half the days', optionD: 'Nearly every day',
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
          optionA: 'Not at all', optionB: 'Mild (Several days)', optionC: 'Moderate (Half days)', optionD: 'Severe (Nearly daily)',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 1,
        },
        {
          assessmentId: as2.id,
          questionText: 'Do you experience restlessness or find it difficult to sit still and relax?',
          optionA: 'Not at all', optionB: 'Rarely', optionC: 'Frequently', optionD: 'Almost constantly',
          scoreMapping: { option_a: 0, option_b: 1, option_c: 2, option_d: 3 },
          orderIndex: 2,
        },
      ]);
    }

    // Assessment results for patient 1
    if (as1 && as2) {
      await db.insert(assessmentResults).values([
        {
          userId: patient1User.id,
          assessmentId: as1.id,
          score: 12,
          severityLevel: 'Medium',
          aiRecommendation: 'Moderate depression score. Recommend ongoing cognitive behavioral therapy and routine follow-up.',
          completedDate: new Date('2026-09-28'),
        },
        {
          userId: patient1User.id,
          assessmentId: as2.id,
          score: 15,
          severityLevel: 'High',
          aiRecommendation: 'High anxiety score detected. Priority consultation advised.',
          completedDate: new Date('2026-10-02'),
        },
      ]);
    }
  }

  // =========================================================================
  // 15. COMMUNITY GROUPS
  // =========================================================================

  console.log('👥  Seeding community groups…');

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

  // =========================================================================
  // 16. CRISIS EVENTS (patient 1)
  // =========================================================================

  console.log('🚨  Seeding crisis events…');

  const existingCrisis = await db.query.crisisEvents.findFirst({
    where: eq(crisisEvents.userId, patient1User.id),
  });
  if (!existingCrisis) {
    await db.insert(crisisEvents).values({
      userId: patient1User.id,
      riskLevel: 'High',
      detectedIssue: 'Severe emotional distress & overwhelming anxiety',
      aiResponse: 'Triggered immediate grounding protocol and dispatched emergency alert notification to assigned physician.',
      emergencyContacted: true,
      psychologistConnected: false,
    });
  }

  // =========================================================================
  // 17. USER PREFERENCES (for all users)
  // =========================================================================

  console.log('⚙️  Seeding user preferences…');

  const allUsers = [superAdminUser, adminUser, doctorUser, researcherUser, ...patientUsers.map(p => p.user)];
  for (const u of allUsers) {
    const existing = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, u.id) });
    if (!existing) {
      await db.insert(userPreferences).values({
        userId: u.id,
        aiMemoryEnabled: true,
        moodTrackingEnabled: true,
        anonymousMode: false,
        notificationEnabled: true,
        researcherModeEnabled: u.id === researcherUser.id,
      });
    }
  }

  // =========================================================================
  // 18. RESEARCHER PROFILE & FULL RESEARCH DATA
  // =========================================================================

  console.log('🔬  Seeding researcher data…');

  let researcherProf = await db.query.researcherProfiles.findFirst({
    where: eq(researcherProfiles.userId, researcherUser.id),
  });
  if (!researcherProf) {
    [researcherProf] = await db.insert(researcherProfiles).values({
      userId: researcherUser.id,
      fullName: researcherUser.name || 'Research Investigator',
      email: researcherUser.email || '',
      institution: 'Healer Clinical Research Network',
      researchField: 'Behavioral Medicine & Computational Psychology',
      designation: 'Principal Investigator',
      verificationStatus: 'Verified',
      isActive: true,
    }).returning();
  }

  // Researcher Settings
  const existingRSettings = await db.query.researcherSettings.findFirst({
    where: eq(researcherSettings.researcherId, researcherProf.id),
  });
  if (!existingRSettings) {
    await db.insert(researcherSettings).values({
      researcherId: researcherProf.id,
      notificationEnabled: true,
      language: 'en',
      privacyMode: true,
      isEnabled: true,
    });
  }

  // Dashboard Summary
  const existingDashSummary = await db.query.researcherDashboardSummaries.findFirst({
    where: eq(researcherDashboardSummaries.researcherId, researcherProf.id),
  });
  if (!existingDashSummary) {
    await db.insert(researcherDashboardSummaries).values({
      researcherId: researcherProf.id,
      activeProjects: 2,
      totalParticipants: 4,
      completedSurveys: 1,
      collectedRecords: 3,
    });
  }

  // Research Projects
  const existingProjects = await db.query.researchProjects.findMany({
    where: eq(researchProjects.researcherId, researcherProf.id),
  });

  let proj1Id: string;
  let proj2Id: string;

  if (existingProjects.length === 0) {
    const [proj1] = await db.insert(researchProjects).values({
      researcherId: researcherProf.id,
      projectTitle: 'Cognitive Behavioral Intervention Efficacy in Severe Insomnia',
      researchArea: 'Sleep Medicine & Digital Therapeutics',
      description: 'A multi-cohort longitudinal trial studying the sustained efficacy of smartphone-guided behavioral routines and mood tracking on sleep onset latency.',
      startDate: new Date('2025-01-10'),
      endDate: new Date('2026-12-31'),
      status: 'Active',
    }).returning();

    const [proj2] = await db.insert(researchProjects).values({
      researcherId: researcherProf.id,
      projectTitle: 'Biometric Correlation of Real-time HRV with Panic Symptoms',
      researchArea: 'Neuropsychiatry & Wearables',
      description: 'Evaluating predictive machine learning algorithms for acute panic episode warning windows via continuous autonomic nervous system monitoring.',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2026-09-30'),
      status: 'Recruiting',
    }).returning();

    proj1Id = proj1.id;
    proj2Id = proj2.id;
  } else {
    proj1Id = existingProjects[0].id;
    proj2Id = existingProjects[1]?.id ?? existingProjects[0].id;
  }

  // Research Participants
  const existingParticipants = await db.query.researchParticipants.findMany({
    where: eq(researchParticipants.projectId, proj1Id),
  });

  if (existingParticipants.length === 0) {
    const participantsData = [
      { code: 'PT-8801', age: '25-34', gender: 'Female', elig: 'Eligible', consent: 'Consented' },
      { code: 'PT-8802', age: '35-49', gender: 'Male', elig: 'Eligible', consent: 'Consented' },
      { code: 'PT-8803', age: '18-24', gender: 'Non-binary', elig: 'Eligible', consent: 'Consented' },
      { code: 'PT-8804', age: '50-64', gender: 'Female', elig: 'Eligible', consent: 'Consented' },
    ];

    for (const p of participantsData) {
      const [createdP] = await db.insert(researchParticipants).values({
        projectId: proj1Id,
        participantCode: p.code,
        ageGroup: p.age,
        gender: p.gender,
        eligibilityStatus: p.elig,
        consentStatus: p.consent,
      }).returning();

      await db.insert(participantScreening).values({
        participantId: createdP.id,
        projectId: proj1Id,
        criteria: 'Pittsburgh Sleep Quality Index (PSQI) score > 8; No concurrent shift work.',
        result: 'Passed',
      });
    }
  }

  // Research Surveys
  const existingSurveys = await db.query.researchSurveys.findMany({
    where: eq(researchSurveys.projectId, proj1Id),
  });

  if (existingSurveys.length === 0) {
    const [survey] = await db.insert(researchSurveys).values({
      projectId: proj1Id,
      title: 'Weekly Sleep Hygiene & Wakefulness Inventory',
      description: 'Standardized assessment of sleep latency, midnight awakenings, and subjective cognitive clarity.',
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScYpYl7pQ-sample-sleep-inventory/viewform',
      embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScYpYl7pQ-sample-sleep-inventory/viewform?embedded=true',
      totalQuestions: 4,
      status: 'Published',
    }).returning();

    await db.insert(surveyQuestions).values([
      {
        surveyId: survey.id,
        questionText: 'On average, how many minutes does it take you to fall asleep after lights out?',
        questionType: 'multiple_choice',
        options: ['Under 15 minutes', '15-30 minutes', '31-60 minutes', 'Over 60 minutes'],
        orderIndex: 1,
      },
      {
        surveyId: survey.id,
        questionText: 'Rate your overall daytime alertness and mental clarity over the past 7 days.',
        questionType: 'likert_scale',
        options: ['1 - Severely impaired', '2 - Poor', '3 - Moderate', '4 - Good', '5 - Exceptional energy'],
        orderIndex: 2,
      },
      {
        surveyId: survey.id,
        questionText: 'Did you experience distressing middle-of-the-night rumination?',
        questionType: 'multiple_choice',
        options: ['Never', '1-2 nights', '3-4 nights', 'Almost every night'],
        orderIndex: 3,
      },
      {
        surveyId: survey.id,
        questionText: 'Detail any caffeine or screen-time disruptions observed prior to bedtime.',
        questionType: 'text',
        options: [],
        orderIndex: 4,
      },
    ]);
  }

  // Research Data Collection
  const existingDataCollection = await db.query.researchDataCollection.findMany();
  if (existingDataCollection.length === 0) {
    await db.insert(researchDataCollection).values([
      {
        projectId: proj1Id,
        dataType: 'Sleep Telemetry',
        dataValue: { sleepEfficiency: '84%', remDurationMinutes: 92, awakenings: 2, subjectiveScore: 7 },
      },
      {
        projectId: proj1Id,
        dataType: 'Mood Telemetry',
        dataValue: { moodState: 'Calm', stressLevel: 3, anxietyRating: 2, mindfulnessMinutes: 15 },
      },
      {
        projectId: proj2Id,
        dataType: 'Biometric Sensor',
        dataValue: { restingHeartRateBpm: 68, hrvSdnnMs: 54, galvanicSkinConductanceMicroS: 1.4 },
      },
    ]);
  }

  // Research Papers
  const existingPapers = await db.query.researchPapers.findMany({
    where: eq(researchPapers.researcherId, researcherProf.id),
  });
  if (existingPapers.length === 0) {
    await db.insert(researchPapers).values([
      {
        researcherId: researcherProf.id,
        title: 'Digital Cognitive Behavioral Therapy for Chronic Insomnia: Systematic Review and Meta-Analysis',
        authors: 'Mahmud A., Jenkins S., Chang M.',
        journalName: 'The Lancet Digital Health',
        publicationYear: 2024,
        paperUrl: 'https://doi.org/10.1016/S2589-7500(24)00012-3',
      },
      {
        researcherId: researcherProf.id,
        title: 'Autonomic Dysregulation in Panic Disorder: Predictive Biomarkers via Continuous Photoplethysmography',
        authors: 'Davis E., Miller D., Anderson L.',
        journalName: 'Frontiers in Neuroscience',
        publicationYear: 2023,
        paperUrl: 'https://doi.org/10.3389/fnins.2023.11892',
      },
    ]);
  }

  // Collaboration Network
  const existingCollabs = await db.query.collaborationNetwork.findMany({
    where: eq(collaborationNetwork.researcherId, researcherProf.id),
  });
  if (existingCollabs.length === 0) {
    await db.insert(collaborationNetwork).values([
      {
        researcherId: researcherProf.id,
        connectedResearcherName: 'Dr. Clara Thorne, Ph.D.',
        connectedInstitution: 'Stanford Computational Neurobiology Lab',
        collaborationType: 'Co-Investigator',
        status: 'Active',
      },
      {
        researcherId: researcherProf.id,
        connectedResearcherName: 'Prof. Marcus Vance',
        connectedInstitution: 'Oxford Institute of Population Mental Health',
        collaborationType: 'Peer Reviewer',
        status: 'Active',
      },
    ]);
  }

  // Researcher Permissions / IRB
  const existingPerms = await db.query.researcherPermissions.findMany({
    where: eq(researcherPermissions.researcherId, researcherProf.id),
  });
  if (existingPerms.length === 0) {
    await db.insert(researcherPermissions).values({
      researcherId: researcherProf.id,
      projectId: proj1Id,
      dataAccessType: 'Anonymized Aggregate',
      approvalStatus: 'Approved',
      approvedDate: new Date('2025-02-01'),
    });
  }

  // =========================================================================

  console.log('\n✅  Seeding completed successfully!');
  console.log('   Demo credentials: any @healer.app email / password123\n');
}

main().catch(console.error).finally(() => process.exit(0));
