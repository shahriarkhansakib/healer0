import { 
  db, doctorProfiles, patientRecords, patientProfiles, users, appointments, counselingSessions, eq, or, inArray, desc 
} from '@healer/db';

export async function getDoctorPatientRecordsService(userId: string, riskFilter?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) return [];

  const doctorIds = [doctor.id];
  if (doctor.userId && !doctorIds.includes(doctor.userId)) {
    doctorIds.push(doctor.userId);
  }

  // 1. Records explicitly assigned to this doctor
  const records = await db.query.patientRecords.findMany({
    where: inArray(patientRecords.doctorId, doctorIds),
    orderBy: [desc(patientRecords.updatedAt)],
  });

  const existingPatientIds = new Set(records.map(r => r.patientId));

  // 2. Fetch appointments booked specifically with this doctor
  const doctorAppts = await db.query.appointments.findMany({
    where: inArray(appointments.doctorId, doctorIds),
    orderBy: [desc(appointments.appointmentDate)],
  });

  for (const appt of doctorAppts) {
    if (!appt.patientId) continue;
    if (!existingPatientIds.has(appt.patientId)) {
      const pProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, appt.patientId), eq(patientProfiles.userId, appt.patientId)),
      });
      const resolvedPatientId = pProf?.id || appt.patientId;
      if (!existingPatientIds.has(resolvedPatientId)) {
        let name = appt.patientName;
        if (!name && pProf) {
          const u = await db.query.users.findFirst({
            where: eq(users.id, pProf.userId),
            columns: { name: true },
          });
          name = u?.name || 'Patient';
        }
        records.push({
          id: `appt-rec-${appt.id}`,
          doctorId: doctor.id,
          patientId: resolvedPatientId,
          patientName: name || 'Booked Patient',
          condition: appt.consultationType || 'Booked Consultation',
          medicalHistory: appt.consultationReason || appt.reason || 'Booked consultation patient',
          previousSessions: 1,
          riskLevel: 'Low',
          allergies: 'None documented',
          notes: `Appointment: ${appt.status} (${appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString() : 'Scheduled'})`,
          createdAt: appt.createdAt,
          updatedAt: appt.updatedAt,
        } as any);
        existingPatientIds.add(resolvedPatientId);
        existingPatientIds.add(appt.patientId);
      }
    }
  }

  // 3. Fetch counseling sessions booked specifically with this doctor
  const doctorCounseling = await db.query.counselingSessions.findMany({
    where: inArray(counselingSessions.doctorId, doctorIds),
    orderBy: [desc(counselingSessions.startTime)],
  });

  for (const cs of doctorCounseling) {
    const rawId = cs.patientId || cs.userId;
    if (!rawId) continue;
    if (!existingPatientIds.has(rawId)) {
      const pProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, rawId), eq(patientProfiles.userId, rawId)),
      });
      const resolvedPatientId = pProf?.id || rawId;
      if (!existingPatientIds.has(resolvedPatientId)) {
        records.push({
          id: `cs-rec-${cs.id}`,
          doctorId: doctor.id,
          patientId: resolvedPatientId,
          patientName: cs.patientName || 'Counseling Patient',
          condition: cs.sessionType || 'Counseling Patient',
          medicalHistory: cs.notes || 'Booked counseling session',
          previousSessions: 1,
          riskLevel: 'Low',
          allergies: 'None documented',
          notes: `Counseling session: ${cs.status}`,
          createdAt: cs.createdAt,
          updatedAt: cs.updatedAt,
        } as any);
        existingPatientIds.add(resolvedPatientId);
        existingPatientIds.add(rawId);
      }
    }
  }

  if (riskFilter && riskFilter !== 'all') {
    return records.filter(r => r.riskLevel.toLowerCase() === riskFilter.toLowerCase());
  }

  return records;
}

export async function updatePatientRiskLevelService(userId: string, recordId: string, riskLevel: string, notes?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [updated] = await db.update(patientRecords)
    .set({ 
      riskLevel,
      ...(notes && { notes }),
    })
    .where(eq(patientRecords.id, recordId))
    .returning();

  return updated;
}

export const PatientsService = {
  async list() {
    return db.query.patientProfiles.findMany();
  },
};
