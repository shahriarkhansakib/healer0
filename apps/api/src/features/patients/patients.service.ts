import { db, doctorProfiles, patientRecords, eq, desc } from '@healer/db';

export async function getDoctorPatientRecordsService(userId: string, riskFilter?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  const records = await db.query.patientRecords.findMany({
    where: eq(patientRecords.doctorId, doctor.id),
    orderBy: [desc(patientRecords.updatedAt)],
  });

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
