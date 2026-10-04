import {
  db,
  appointments,
  patientDoctorVisitSummary,
  users,
  doctorProfiles,
  patientProfiles,
  eq,
  desc,
  and,
  or,
  inArray,
} from '@healer/db';

export async function getAppointmentsService(userId: string, statusFilter?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  const ids = [userId];
  if (doctor) ids.push(doctor.id);

  const all = await db.query.appointments.findMany({
    where: inArray(appointments.doctorId, ids),
    orderBy: [desc(appointments.appointmentDate)],
  });

  if (statusFilter && statusFilter !== 'all') {
    return all.filter(a => 
      (a.status?.toLowerCase() === statusFilter.toLowerCase()) || 
      (a.appointmentStatus?.toLowerCase() === statusFilter.toLowerCase())
    );
  }

  return all;
}

export async function updateAppointmentStatusService(userId: string, appointmentId: string, status: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const normalizedStatus = status.toLowerCase();
  const normalizedAppointmentStatus = 
    normalizedStatus === 'completed' ? 'Completed' :
    normalizedStatus === 'canceled' ? 'Cancelled' :
    normalizedStatus === 'in-progress' ? 'InProgress' : 'Scheduled';

  const [updated] = await db.update(appointments)
    .set({ 
      status: normalizedStatus,
      appointmentStatus: normalizedAppointmentStatus,
      ...(normalizedStatus === 'in-progress' && { startAt: new Date() }),
      ...(normalizedStatus === 'completed' && { endAt: new Date() }),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  return updated;
}

export type CreateAppointmentPayload = {
  doctorId: string;
  appointmentDate: string; // ISO 8601 string
  consultationType: 'Chat' | 'Video' | 'Physical';
  consultationReason?: string;
  sessionDurationMinutes?: number;
};

export const AppointmentsService = {
  async createAppointment(patientUserId: string, payload: CreateAppointmentPayload) {
    // Verify target doctor exists
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: or(
        eq(doctorProfiles.userId, payload.doctorId),
        eq(doctorProfiles.id, payload.doctorId)
      ),
      columns: { id: true, userId: true },
    });
    if (!doctorProfile) return null;

    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });

    const patientUser = await db.query.users.findFirst({
      where: eq(users.id, patientUserId),
      columns: { name: true },
    });

    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId: patientProfile?.id ?? patientUserId,
        doctorId: doctorProfile.id,
        patientName: patientUser?.name ?? 'Patient',
        appointmentDate: new Date(payload.appointmentDate),
        consultationType: payload.consultationType,
        reason: payload.consultationReason ?? '',
        consultationReason: payload.consultationReason ?? null,
        sessionDurationMinutes: payload.sessionDurationMinutes ?? 50,
        status: 'scheduled',
        appointmentStatus: 'Scheduled',
      })
      .returning();
    return appointment;
  },

  async listAppointmentsForPatient(patientUserId: string) {
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });
    const ids = [patientUserId];
    if (patientProfile) ids.push(patientProfile.id);

    return db.query.appointments.findMany({
      where: inArray(appointments.patientId, ids),
      orderBy: [desc(appointments.appointmentDate)],
    });
  },

  async listAppointmentsForDoctor(doctorUserId: string) {
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, doctorUserId),
      columns: { id: true },
    });
    const ids = [doctorUserId];
    if (doctorProfile) ids.push(doctorProfile.id);

    return db.query.appointments.findMany({
      where: inArray(appointments.doctorId, ids),
      orderBy: [desc(appointments.appointmentDate)],
    });
  },

  async getAppointmentById(id: string, userId: string) {
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, userId),
      columns: { id: true },
    });
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, userId),
      columns: { id: true },
    });

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
    });
    if (!appointment) return null;

    // Both patient and doctor may read their shared appointment record.
    const isParticipant =
      appointment.patientId === userId ||
      appointment.patientId === patientProfile?.id ||
      appointment.doctorId === userId ||
      appointment.doctorId === doctorProfile?.id;

    if (!isParticipant) return null;

    return appointment;
  },

  async cancelAppointment(id: string, patientUserId: string) {
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });
    const ids = [patientUserId];
    if (patientProfile) ids.push(patientProfile.id);

    const appointment = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), inArray(appointments.patientId, ids)),
    });
    if (!appointment) return null;

    const [updated] = await db
      .update(appointments)
      .set({ 
        status: 'canceled',
        appointmentStatus: 'Cancelled' 
      })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  },

  async completeAppointment(id: string, doctorUserId: string, doctorNotes?: string) {
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, doctorUserId),
      columns: { id: true },
    });
    const ids = [doctorUserId];
    if (doctorProfile) ids.push(doctorProfile.id);

    const appointment = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), inArray(appointments.doctorId, ids)),
    });
    if (!appointment) return null;

    const [updated] = await db
      .update(appointments)
      .set({
        status: 'completed',
        appointmentStatus: 'Completed',
        doctorNotes: doctorNotes ?? null,
        endAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    // Update visit summary
    await updateVisitSummary(appointment.patientId, appointment.doctorId, appointment.sessionDurationMinutes);

    return updated;
  },

  async getVisitSummary(patientId: string, doctorId: string) {
    const summary = await db.query.patientDoctorVisitSummary.findFirst({
      where: and(
        eq(patientDoctorVisitSummary.patientId, patientId),
        eq(patientDoctorVisitSummary.doctorId, doctorId),
      ),
    });
    return summary ?? null;
  },

  async listVisitSummariesForPatient(patientId: string) {
    return db.query.patientDoctorVisitSummary.findMany({
      where: eq(patientDoctorVisitSummary.patientId, patientId),
    });
  },

  async listVisitSummariesForDoctor(doctorId: string) {
    return db.query.patientDoctorVisitSummary.findMany({
      where: eq(patientDoctorVisitSummary.doctorId, doctorId),
    });
  },

  async listVerifiedDoctors() {
    const doctors = await db.query.doctorProfiles.findMany({
      columns: { id: true, userId: true, specialization: true, hospitalAffiliation: true },
    });

    if (doctors.length === 0) return [];

    const userIds = doctors.map((d) => d.userId);
    const doctorUsers = await db.query.users.findMany({
      where: inArray(users.id, userIds),
      columns: { id: true, name: true, email: true },
    });

    const userMap = new Map(doctorUsers.map((u) => [u.id, u]));

    return doctors.map((d) => ({
      doctorId: d.userId,
      profileId: d.id,
      name: userMap.get(d.userId)?.name ?? 'Doctor',
      email: userMap.get(d.userId)?.email ?? '',
      specialization: d.specialization,
      hospitalAffiliation: d.hospitalAffiliation,
    }));
  },
};

/**
 * Maintains aggregate patient-doctor visit summary
 */
async function updateVisitSummary(
  patientId: string,
  doctorId: string,
  sessionMinutes: number,
): Promise<void> {
  const now = new Date();

  const [patient, doctor] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, patientId), columns: { name: true } }),
    db.query.users.findFirst({ where: eq(users.id, doctorId), columns: { name: true } }),
  ]);

  const existing = await db.query.patientDoctorVisitSummary.findFirst({
    where: and(
      eq(patientDoctorVisitSummary.patientId, patientId),
      eq(patientDoctorVisitSummary.doctorId, doctorId),
    ),
  });

  if (existing) {
    await db
      .update(patientDoctorVisitSummary)
      .set({
        totalVisits: existing.totalVisits + 1,
        lastVisitDate: now,
        totalConsultationMinutes: existing.totalConsultationMinutes + sessionMinutes,
        patientName: patient?.name ?? existing.patientName,
        doctorName: doctor?.name ?? existing.doctorName,
      })
      .where(
        and(
          eq(patientDoctorVisitSummary.patientId, patientId),
          eq(patientDoctorVisitSummary.doctorId, doctorId),
        ),
      );
  } else {
    await db.insert(patientDoctorVisitSummary).values({
      patientId,
      patientName: patient?.name ?? null,
      doctorId,
      doctorName: doctor?.name ?? null,
      totalVisits: 1,
      firstVisitDate: now,
      lastVisitDate: now,
      totalConsultationMinutes: sessionMinutes,
    });
  }
}
