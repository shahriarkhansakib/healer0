import { db } from './index';
import { users, accounts } from './schema/auth';
import { doctorProfiles, patientProfiles } from './schema/medical';
import { 
  doctorQualifications, doctorReviews, doctorSettings, 
  appointments, counselingSessions, patientRecords, 
  sessionNotes, prescriptions 
} from './schema/doctor';
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
  const commonPassword = await hashPassword('password123');

  // Seed super_admin
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
  }

  // Seed admin
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
  }

  // Seed Doctor user
  let doctorUser = await db.query.users.findFirst({ where: eq(users.email, 'doctor@healer.app') });
  if (!doctorUser) {
    [doctorUser] = await db.insert(users).values({
      name: 'Dr. Asif Mahmud',
      email: 'doctor@healer.app',
      emailVerified: true,
      role: 'user',
      status: 'active',
    }).returning();

    if (doctorUser) {
      await db.insert(accounts).values({
        userId: doctorUser.id,
        accountId: 'doctor@healer.app',
        providerId: 'credential',
        password: commonPassword,
      });
    }
  }

  if (!doctorUser) {
    console.error('Failed to create doctor user');
    return;
  }

  // Seed Doctor Profile
  let doctorProf = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, doctorUser.id) });
  if (!doctorProf) {
    [doctorProf] = await db.insert(doctorProfiles).values({
      userId: doctorUser.id,
      specialization: 'Neuropsychiatry & Behavioral Health',
      licenseNumber: 'BMDC-MD-884920',
      hospitalAffiliation: 'Metropolitan Central Hospital & Wellness Clinic',
    }).returning();
  }

  if (!doctorProf) {
    console.error('Failed to create doctor profile');
    return;
  }

  // Doctor Settings
  const existingSettings = await db.query.doctorSettings.findFirst({ where: eq(doctorSettings.doctorId, doctorProf.id) });
  if (!existingSettings) {
    await db.insert(doctorSettings).values({
      doctorId: doctorProf.id,
      autoAcceptBooking: true,
      notificationEnabled: true,
      language: 'en',
      dutyStartTime: '08:30',
      dutyEndTime: '17:30',
      offDay: 'Sunday',
      bio: 'Board-certified Psychiatrist specializing in stress management, cognitive wellness, and mood disorder treatments.',
    });
  }

  // Doctor Qualifications
  const existingQualifications = await db.query.doctorQualifications.findMany({ where: eq(doctorQualifications.doctorId, doctorProf.id) });
  if (existingQualifications.length === 0) {
    await db.insert(doctorQualifications).values([
      { doctorId: doctorProf.id, degree: 'MBBS (Bachelor of Medicine, Bachelor of Surgery)', institution: 'Dhaka Medical College', year: 2014 },
      { doctorId: doctorProf.id, degree: 'MD in Clinical Psychiatry', institution: 'BSMMU', year: 2018 },
      { doctorId: doctorProf.id, degree: 'Fellowship in Cognitive Behavioral Therapy', institution: 'Johns Hopkins Medicine (Online)', year: 2021 },
    ]);
  }

  // Seed Patients
  const patientData = [
    { name: 'Sarah Jenkins', email: 'sarah.j@example.com', blood: 'A+', risk: 'Low', condition: 'Generalized Anxiety Disorder' },
    { name: 'Michael Chen', email: 'mchen@example.com', blood: 'O-', risk: 'Critical', condition: 'Severe Panic Disorder with Agoraphobia' },
    { name: 'Elena Rostova', email: 'elena.r@example.com', blood: 'B+', risk: 'High', condition: 'Major Depressive Episode' },
    { name: 'David Miller', email: 'dmiller@example.com', blood: 'AB+', risk: 'Moderate', condition: 'Insomnia & Work Stress Syndrome' },
    { name: 'Ayesha Rahman', email: 'ayesha.r@example.com', blood: 'O+', risk: 'Low', condition: 'Post-Traumatic Stress Recovery' },
  ];

  const createdPatients: { profileId: string; name: string }[] = [];

  for (const p of patientData) {
    let pUser = await db.query.users.findFirst({ where: eq(users.email, p.email) });
    if (!pUser) {
      [pUser] = await db.insert(users).values({
        name: p.name,
        email: p.email,
        emailVerified: true,
        role: 'user',
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

    createdPatients.push({ profileId: pProf.id, name: p.name });

    // Seed Patient Record
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

  // Seed Appointments
  const existingAppts = await db.query.appointments.findMany({ where: eq(appointments.doctorId, doctorProf.id) });
  let firstApptId: string | null = null;
  if (existingAppts.length === 0) {
    const today = new Date();
    const apptList = [
      {
        patientId: createdPatients[0].profileId,
        patientName: createdPatients[0].name,
        appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 2), // 2 hours from now
        consultationType: 'In-person',
        reason: 'Monthly Mental Wellness Checkup & Medication Review',
        status: 'scheduled',
      },
      {
        patientId: createdPatients[1].profileId,
        patientName: createdPatients[1].name,
        appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 4), // 4 hours from now
        consultationType: 'Counseling',
        reason: 'Acute Panic Episode Assessment',
        status: 'in-progress',
      },
      {
        patientId: createdPatients[2].profileId,
        patientName: createdPatients[2].name,
        appointmentDate: new Date(today.getTime() - 1000 * 60 * 60 * 24), // Yesterday
        consultationType: 'Online',
        reason: 'Follow-up on Sleep Therapy Routine',
        status: 'completed',
      },
      {
        patientId: createdPatients[3].profileId,
        patientName: createdPatients[3].name,
        appointmentDate: new Date(today.getTime() + 1000 * 60 * 60 * 26), // Tomorrow
        consultationType: 'In-person',
        reason: 'Work Stress Rehabilitation Evaluation',
        status: 'scheduled',
      },
    ];

    const inserted = await db.insert(appointments).values(
      apptList.map(a => ({
        doctorId: doctorProf.id,
        patientId: a.patientId,
        patientName: a.patientName,
        appointmentDate: a.appointmentDate,
        consultationType: a.consultationType,
        reason: a.reason,
        status: a.status,
      }))
    ).returning();

    if (inserted.length > 0) {
      firstApptId = inserted[0].id;
    }
  } else {
    firstApptId = existingAppts[0].id;
  }

  // Seed Counseling Sessions
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

  // Seed Session Notes
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

  // Seed Prescriptions
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

  // Seed Reviews
  const existingReviews = await db.query.doctorReviews.findMany({ where: eq(doctorReviews.doctorId, doctorProf.id) });
  if (existingReviews.length === 0) {
    await db.insert(doctorReviews).values([
      { doctorId: doctorProf.id, patientId: createdPatients[0].profileId, patientName: 'Sarah J.', rating: 5, comment: 'Dr. Asif is empathetic, incredibly thorough, and explained my treatment plan step by step!' },
      { doctorId: doctorProf.id, patientId: createdPatients[3].profileId, patientName: 'David M.', rating: 5, comment: 'Very calm and reassuring clinical environment. My sleep quality improved within two weeks.' },
    ]);
  }

  console.log('Seeding completed successfully with rich relational Doctor data.');
}

main().catch(console.error).finally(() => process.exit(0));
