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
import { wellnessRules, moodTracking, journals } from './schema/wellness';
import { therapyPrograms } from './schema/therapy';
import { assessments, assessmentQuestions, assessmentResults } from './schema/assessments';
import { doctorPatientMessages } from './schema/messages';
import { crisisEvents } from './schema/emergency';
import { communityGroups } from './schema/community';
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
import fs from 'fs';
import path from 'path';

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
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey);
      }
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = 'healer-static-dev-salt-2026';
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Helper: Idempotent User Provisioning
// ---------------------------------------------------------------------------

async function findOrCreateUser(data: {
  email: string;
  name: string;
  role: 'patient' | 'doctor' | 'researcher' | 'admin' | 'super_admin';
  hashedPassword: string;
}) {
  let user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

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

  // 2b. Seed Additional Verified Doctors
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
    ]);
  }

  // =========================================================================
  // 9.  PATIENT DOCTOR VISIT SUMMARY
  // =========================================================================

  console.log('📊  Seeding patient-doctor visit summaries…');

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
    } else {
      await db.insert(therapyPrograms).values(prog);
    }
  }

  // =========================================================================
  // 14. ASSESSMENTS & QUESTIONS (JSON-driven clinical battery)
  // =========================================================================

  console.log('📋  Seeding clinical assessments…');

  const existingQuestions = await db.query.assessmentQuestions.findMany();
  const needsReseed = existingQuestions.length < 329 || existingQuestions.some(
    q => q.questionCode === 'src_ds_01' && /[\u0980-\u09FF]/.test(q.questionText)
  );

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

    // Seed sample assessment results for patient 1 (only if assessments were loaded)
    if (totalAsmtsCount > 0) {
      const firstTwoAssessments = await db.query.assessments.findMany();
      if (firstTwoAssessments.length >= 2) {
        await db.insert(assessmentResults).values([
          {
            userId: patient1User.id,
            assessmentId: firstTwoAssessments[0].id,
            score: 12,
            severityLevel: 'Medium',
            aiRecommendation: 'Moderate score. Recommend ongoing cognitive behavioral therapy and routine follow-up.',
            completedDate: new Date('2026-09-28'),
          },
          {
            userId: patient1User.id,
            assessmentId: firstTwoAssessments[1].id,
            score: 15,
            severityLevel: 'High',
            aiRecommendation: 'High score detected. Priority consultation advised.',
            completedDate: new Date('2026-10-02'),
          },
        ]).onConflictDoNothing();
      }
    }

    console.log(`   Loaded ${totalAsmtsCount} assessments with ${totalQuestionsCount} questions.`);
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
    await db.insert(researcherPermissions).values([
      {
        researcherId: researcherProf.id,
        projectId: proj1Id,
        dataAccessType: 'Anonymized Aggregate',
        approvalStatus: 'Approved',
        approvedDate: new Date('2025-02-01'),
      },
    ]);
  }

  // =========================================================================

  console.log('\n✅  Seeding completed successfully!');
  console.log('   Demo credentials: any @healer.app email / password123\n');
}

main().catch(console.error).finally(() => process.exit(0));
