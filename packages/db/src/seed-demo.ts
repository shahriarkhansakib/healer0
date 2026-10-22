import { db } from './index';
import { users, accounts } from './schema/auth';
import { doctorProfiles, patientProfiles } from './schema/medical';
import { 
  patientRecords, sessionNotes, prescriptions 
} from './schema/doctor';
import { appointments } from './schema/consultations';
import { counselingSessions } from './schema/counseling';
import { assessmentResults, assessments } from './schema/assessments';
import { moodTracking } from './schema/wellness';
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
  console.log('--- Seeding Demo / Presentation Dataset ---');

  const commonPassword = await hashPassword('password123');

  // Find attending doctor to associate demo appointments and clinical records with
  const doctorUser = await db.query.users.findFirst({ where: eq(users.email, 'doctor@healer.app') });
  if (!doctorUser) {
    console.error('Error: Main doctor account (doctor@healer.app) not found. Please run "pnpm db:seed" first.');
    process.exit(1);
  }

  const doctorProf = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, doctorUser.id) });
  if (!doctorProf) {
    console.error('Error: Doctor profile not found. Please run "pnpm db:seed" first.');
    process.exit(1);
  }

  // 1. Seed 5 Demo Patients
  const demoPatients = [
    { email: 'patient1@healer.app', name: 'Sarah Jenkins', blood: 'A+', condition: 'Generalized Anxiety Disorder (GAD)', risk: 'Moderate' },
    { email: 'patient2@healer.app', name: 'Michael Chang', blood: 'O+', condition: 'Severe Panic Disorder with Agoraphobia', risk: 'High' },
    { email: 'patient3@healer.app', name: 'Emily Davis', blood: 'B+', condition: 'Major Depressive Episode', risk: 'Critical' },
    { email: 'patient4@healer.app', name: 'David Miller', blood: 'AB-', condition: 'Work-Related Burnout & Chronic Insomnia', risk: 'Low' },
    { email: 'patient5@healer.app', name: 'Lisa Anderson', blood: 'O-', condition: 'Post-Traumatic Stress Symptoms', risk: 'Moderate' },
  ];

  const createdPatients: { profileId: string; userId: string; name: string }[] = [];

  for (const p of demoPatients) {
    let pUser = await db.query.users.findFirst({ where: eq(users.email, p.email) });
    if (!pUser) {
      [pUser] = await db.insert(users).values({
        name: p.name,
        email: p.email,
        emailVerified: true,
        role: 'patient',
        status: 'active',
      }).returning();

      await db.insert(accounts).values({
        userId: pUser.id,
        accountId: p.email,
        providerId: 'credential',
        password: commonPassword,
      });
    }

    let pProf = await db.query.patientProfiles.findFirst({ where: eq(patientProfiles.userId, pUser.id) });
    if (!pProf) {
      [pProf] = await db.insert(patientProfiles).values({
        userId: pUser.id,
        bloodType: p.blood,
        allergies: ['Penicillin'],
        medicalHistory: { notes: 'No major surgeries reported.' },
      }).returning();
    }

    createdPatients.push({ profileId: pProf.id, userId: pUser.id, name: p.name });

    // Seed Patient Medical Record
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

  console.log(`✓ Seeded ${createdPatients.length} demo patient accounts.`);

  // 2. Seed Demo Appointments
  const today = new Date();
  const demoAppointments = [
    {
      patientId: createdPatients[0].profileId,
      patientName: createdPatients[0].name,
      appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 2), // 2h from now
      consultationType: 'Video',
      reason: 'Monthly Mental Wellness Checkup & Medication Review',
      status: 'scheduled',
      appointmentStatus: 'Scheduled',
    },
    {
      patientId: createdPatients[1].profileId,
      patientName: createdPatients[1].name,
      appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 5), // 5h from now
      consultationType: 'Chat',
      reason: 'Acute Panic Episode Assessment',
      status: 'scheduled',
      appointmentStatus: 'Scheduled',
    },
    {
      patientId: createdPatients[2].profileId,
      patientName: createdPatients[2].name,
      appointmentDate: new Date(today.getTime() - 1000 * 60 * 60 * 24), // Yesterday
      consultationType: 'Physical',
      reason: 'Follow-up on Sleep Therapy Routine',
      status: 'completed',
      appointmentStatus: 'Completed',
    },
  ];

  let firstApptId: string | null = null;
  for (const a of demoAppointments) {
    const [inserted] = await db.insert(appointments).values({
      doctorId: doctorProf.id,
      patientId: a.patientId,
      patientName: a.patientName,
      appointmentDate: a.appointmentDate,
      consultationType: a.consultationType,
      reason: a.reason,
      consultationReason: a.reason,
      status: a.status,
      appointmentStatus: a.appointmentStatus,
    }).returning();

    if (!firstApptId) firstApptId = inserted.id;
  }
  console.log('✓ Seeded demo appointments.');

  // 3. Seed Demo Counseling Sessions
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
  console.log('✓ Seeded demo counseling sessions.');

  // 4. Seed Demo Prescriptions
  if (firstApptId) {
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
        appointmentId: firstApptId,
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
    console.log('✓ Seeded demo prescriptions.');
  }

  // 5. Seed Demo Clinical Assessment Results for Patient 1 (Sarah Jenkins)
  const allAsmts = await db.query.assessments.findMany();
  const phq9Asmt = allAsmts.find(a => (a.title || '').includes('PHQ-9') || (a.category || '').toLowerCase().includes('depression'));
  const gad7Asmt = allAsmts.find(a => (a.title || '').includes('GAD-7') || (a.category || '').toLowerCase().includes('anxiety'));

  if (phq9Asmt) {
    await db.insert(assessmentResults).values({
      userId: createdPatients[0].userId,
      assessmentId: phq9Asmt.id,
      score: 5,
      maxScore: 27,
      severityLevel: 'Mild',
      identifiedProblem: 'Mild Situational Depressive Symptoms',
      clinicalSummary: 'Scores suggest mild sub-clinical depressive mood related to work adjustments. Sleep cycle regulation recommended.',
      suggestedFollowUp: 'Continue weekly thought journaling and mindful box breathing.',
      requiresFollowUp: false,
      crisisAlert: false,
      aiRecommendation: 'Engage with the 4-week Cognitive Restructuring module in the Therapy sanctuary.',
      answers: {},
      completedDate: new Date(today.getTime() - 1000 * 60 * 60 * 72),
    });
  }

  if (gad7Asmt) {
    await db.insert(assessmentResults).values({
      userId: createdPatients[0].userId,
      assessmentId: gad7Asmt.id,
      score: 6,
      maxScore: 21,
      severityLevel: 'Mild',
      identifiedProblem: 'Mild Generalized Anxiety Tendencies',
      clinicalSummary: 'Mild elevation during high workload periods. No physiological panic alerts detected.',
      suggestedFollowUp: 'Maintain regular sleep routine and afternoon tea break moderation.',
      requiresFollowUp: false,
      crisisAlert: false,
      aiRecommendation: 'Try Box Breathing exercises when autonomic strain elevates.',
      answers: {},
      completedDate: new Date(today.getTime() - 1000 * 60 * 60 * 48),
    });
  }
  console.log('✓ Seeded demo assessment results for patient1.');

  // 6. Seed Demo Mood Check-in for Patient 1
  await db.insert(moodTracking).values([
    {
      userId: createdPatients[0].userId,
      moodType: 'Calm',
      stressLevel: 3,
      anxietyLevel: 3,
      sleepQuality: 8,
      wellnessGoal: 'Maintain Autonomic Stability',
      wellnessActivity: 'Evening Journaling',
      activityStatus: 'Completed',
      recordedDate: new Date(),
    },
  ]);
  console.log('✓ Seeded demo mood check-ins.');

  console.log('\n--- Demo Data Seeding Completed Successfully! ---');
  console.log('Demo Login Credentials:');
  console.log('  Email:    patient1@healer.app');
  console.log('  Password: password123');
  console.log('To flush demo data at any time, run: pnpm db:flush');
  process.exit(0);
}

main().catch((err) => {
  console.error('Demo seeding failed:', err);
  process.exit(1);
});
