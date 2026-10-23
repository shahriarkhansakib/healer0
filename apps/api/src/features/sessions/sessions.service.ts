import { 
  db, doctorProfiles, sessionNotes, prescriptions, patientRecords, appointments, counselingSessions, patientProfiles, users, eq, or, desc 
} from '@healer/db';

export async function getSessionNotesService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) return [];

  return db.query.sessionNotes.findMany({
    where: eq(sessionNotes.doctorId, doctor.id),
    orderBy: [desc(sessionNotes.createdAt)],
  });
}

export async function createSessionNoteService(userId: string, data: {
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  sessionSummary: string;
  clinicalImpressions?: string;
  diagnosis?: string;
  treatmentPlan?: string;
}) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  let patientId = data.patientId;
  let patientName = data.patientName;

  if (data.appointmentId) {
    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, data.appointmentId),
    });
    if (appt) {
      if (!patientId) patientId = appt.patientId;
      if (!patientName) patientName = appt.patientName || undefined;
    }
  }

  if (patientId) {
    const pProf = await db.query.patientProfiles.findFirst({
      where: or(eq(patientProfiles.id, patientId), eq(patientProfiles.userId, patientId)),
    });
    if (pProf) {
      patientId = pProf.id;
      if (!patientName) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, pProf.userId),
          columns: { name: true },
        });
        if (u) patientName = u.name;
      }
    } else {
      const user = await db.query.users.findFirst({
        where: eq(users.id, patientId),
      });
      if (user) {
        const [createdProf] = await db.insert(patientProfiles).values({
          userId: user.id,
        }).returning();
        patientId = createdProf.id;
        if (!patientName) patientName = user.name;
      }
    }
  }

  if (!patientId) throw new Error('Patient ID is required or must be linked to a valid appointment.');

  const [note] = await db.insert(sessionNotes).values({
    doctorId: doctor.id,
    patientId,
    patientName: patientName || 'Patient',
    appointmentId: data.appointmentId || undefined,
    sessionSummary: data.sessionSummary,
    clinicalImpressions: data.clinicalImpressions || undefined,
    diagnosis: data.diagnosis || undefined,
    treatmentPlan: data.treatmentPlan || undefined,
  }).returning();

  return note;
}

export async function getPrescriptionsService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) return [];

  return db.query.prescriptions.findMany({
    where: eq(prescriptions.doctorId, doctor.id),
    orderBy: [desc(prescriptions.createdAt)],
  });
}

export async function createPrescriptionService(userId: string, data: {
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  sessionId?: string;
  title: string;
  medications?: any[];
  body?: any;
  notes?: string;
}) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  let patientId = data.patientId;
  let patientName = data.patientName;

  // 1. If appointmentId provided, auto-resolve patient info from appointment
  if (data.appointmentId) {
    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, data.appointmentId),
    });
    if (appt) {
      if (!patientId) patientId = appt.patientId;
      if (!patientName) patientName = appt.patientName || undefined;
    }
  }

  // 1b. If counseling sessionId provided, auto-resolve patient info
  if (data.sessionId) {
    const cs = await db.query.counselingSessions.findFirst({
      where: eq(counselingSessions.id, data.sessionId),
    });
    if (cs) {
      if (!patientId) patientId = cs.patientId || cs.userId || undefined;
      if (!patientName) patientName = cs.patientName || undefined;
    }
  }

  // 2. Resolve patientId to patientProfiles.id (to satisfy foreign key)
  if (patientId) {
    const pProf = await db.query.patientProfiles.findFirst({
      where: or(eq(patientProfiles.id, patientId), eq(patientProfiles.userId, patientId)),
    });
    if (pProf) {
      patientId = pProf.id;
      if (!patientName) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, pProf.userId),
          columns: { name: true },
        });
        if (u) patientName = u.name;
      }
    } else {
      // Check if patientId is a user who needs a patient profile created
      const user = await db.query.users.findFirst({
        where: eq(users.id, patientId),
      });
      if (user) {
        const [createdProf] = await db.insert(patientProfiles).values({
          userId: user.id,
        }).returning();
        if (createdProf) patientId = createdProf.id;
        if (!patientName) patientName = user.name;
      }
    }
  }

  if (!patientId) {
    throw new Error('Patient ID is required or must be linked to a valid appointment.');
  }

  if (!patientName) {
    patientName = 'Patient';
  }

  // 3. Normalize medications array
  let meds: any[] = [];
  if (Array.isArray(data.medications) && data.medications.length > 0) {
    meds = data.medications.map((m: any) => ({
      medicationName: m.medicationName || m.medication || m.name || 'Prescribed Medication',
      dosage: m.dosage || 'Standard dose',
      frequency: m.frequency || 'Daily',
      duration: m.duration || '30 days',
      instructions: m.instructions || m.notes || data.notes || '',
    }));
  } else if (data.body) {
    meds = [{
      medicationName: data.body.medication || 'Prescribed Medication',
      dosage: data.body.dosage || 'Standard dose',
      frequency: data.body.frequency || 'Daily',
      duration: data.body.duration || '30 days',
      instructions: data.body.instructions || '',
    }];
  } else {
    meds = [{
      medicationName: 'Prescribed Regimen',
      dosage: 'As instructed',
      frequency: 'Daily',
      duration: '30 days',
      instructions: data.notes || '',
    }];
  }

  const [rx] = await db.insert(prescriptions).values({
    doctorId: doctor.id,
    patientId,
    patientName,
    appointmentId: data.appointmentId || undefined,
    title: data.title || 'Digital Prescription',
    medications: meds,
    notes: data.notes || data.body?.instructions || undefined,
  }).returning();

  return rx;
}
