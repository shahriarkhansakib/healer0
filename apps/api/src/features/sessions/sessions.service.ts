import { 
  db, doctorProfiles, sessionNotes, prescriptions, patientRecords, eq, desc 
} from '@healer/db';

export async function getSessionNotesService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  return db.query.sessionNotes.findMany({
    where: eq(sessionNotes.doctorId, doctor.id),
    orderBy: [desc(sessionNotes.createdAt)],
  });
}

export async function createSessionNoteService(userId: string, data: {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  sessionSummary: string;
  clinicalImpressions?: string;
  diagnosis?: string;
  treatmentPlan?: string;
}) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [note] = await db.insert(sessionNotes).values({
    doctorId: doctor.id,
    patientId: data.patientId,
    patientName: data.patientName,
    appointmentId: data.appointmentId,
    sessionSummary: data.sessionSummary,
    clinicalImpressions: data.clinicalImpressions,
    diagnosis: data.diagnosis,
    treatmentPlan: data.treatmentPlan,
  }).returning();

  return note;
}

export async function getPrescriptionsService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  return db.query.prescriptions.findMany({
    where: eq(prescriptions.doctorId, doctor.id),
    orderBy: [desc(prescriptions.createdAt)],
  });
}

export async function createPrescriptionService(userId: string, data: {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  title: string;
  medications: any[];
  notes?: string;
}) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [rx] = await db.insert(prescriptions).values({
    doctorId: doctor.id,
    patientId: data.patientId,
    patientName: data.patientName,
    appointmentId: data.appointmentId,
    title: data.title,
    medications: data.medications,
    notes: data.notes,
  }).returning();

  return rx;
}
