import { db, doctorProfiles, counselingSessions, eq, desc } from '@healer/db';

export async function getCounselingSessionsService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  return db.query.counselingSessions.findMany({
    where: eq(counselingSessions.doctorId, doctor.id),
    orderBy: [desc(counselingSessions.startTime)],
  });
}

export async function updateCounselingStatusService(userId: string, sessionId: string, status: string, notes?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [updated] = await db.update(counselingSessions)
    .set({ 
      status,
      ...(notes && { notes }),
      ...(status === 'completed' && { endTime: new Date() }),
    })
    .where(eq(counselingSessions.id, sessionId))
    .returning();

  return updated;
}
