import { db, doctorProfiles, appointments, eq, desc } from '@healer/db';

export async function getAppointmentsService(userId: string, statusFilter?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  const all = await db.query.appointments.findMany({
    where: eq(appointments.doctorId, doctor.id),
    orderBy: [desc(appointments.appointmentDate)],
  });

  if (statusFilter && statusFilter !== 'all') {
    return all.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
  }

  return all;
}

export async function updateAppointmentStatusService(userId: string, appointmentId: string, status: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [updated] = await db.update(appointments)
    .set({ 
      status,
      ...(status === 'in-progress' && { startAt: new Date() }),
      ...(status === 'completed' && { endAt: new Date() }),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  return updated;
}
