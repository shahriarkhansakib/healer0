import {
  db,
  appointments,
  patientDoctorVisitSummary,
  users,
  doctorProfiles,
  eq,
  desc,
  and,
  inArray,
} from '@healer/db';

export type CreateAppointmentPayload = {
  doctorId: string;
  appointmentDate: string; // ISO 8601 string
  consultationType: 'Chat' | 'Video' | 'Physical';
  consultationReason?: string;
  sessionDurationMinutes?: number;
};

export const AppointmentsService = {
  async createAppointment(patientId: string, payload: CreateAppointmentPayload) {
    // Verify the target doctor exists and has a doctor profile.
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, payload.doctorId),
      columns: { id: true },
    });
    if (!doctorProfile) return null;

    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId,
        doctorId: payload.doctorId,
        appointmentDate: new Date(payload.appointmentDate),
        consultationType: payload.consultationType,
        consultationReason: payload.consultationReason ?? null,
        sessionDurationMinutes: payload.sessionDurationMinutes ?? 50,
        appointmentStatus: 'Scheduled',
      })
      .returning();
    return appointment;
  },

  async listAppointmentsForPatient(patientId: string) {
    return db.query.appointments.findMany({
      where: eq(appointments.patientId, patientId),
      orderBy: [desc(appointments.appointmentDate)],
    });
  },

  async listAppointmentsForDoctor(doctorId: string) {
    return db.query.appointments.findMany({
      where: eq(appointments.doctorId, doctorId),
      orderBy: [desc(appointments.appointmentDate)],
    });
  },

  async getAppointmentById(id: string, userId: string) {
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
    });
    if (!appointment) return null;

    // Both the patient and the doctor may read their shared appointment record.
    const isParticipant =
      appointment.patientId === userId || appointment.doctorId === userId;
    if (!isParticipant) return null;

    return appointment;
  },

  async cancelAppointment(id: string, patientId: string) {
    const appointment = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), eq(appointments.patientId, patientId)),
    });
    if (!appointment) return null;
    if (appointment.appointmentStatus !== 'Scheduled') {
      throw new Error('Only scheduled appointments can be cancelled.');
    }

    const [updated] = await db
      .update(appointments)
      .set({ appointmentStatus: 'Cancelled' })
      .where(and(eq(appointments.id, id), eq(appointments.patientId, patientId)))
      .returning();
    return updated;
  },

  async completeAppointment(id: string, doctorId: string, doctorNotes?: string) {
    const appointment = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), eq(appointments.doctorId, doctorId)),
    });
    if (!appointment) return null;
    if (appointment.appointmentStatus !== 'Scheduled') {
      throw new Error('Only scheduled appointments can be marked as completed.');
    }

    const [updated] = await db
      .update(appointments)
      .set({
        appointmentStatus: 'Completed',
        doctorNotes: doctorNotes ?? null,
      })
      .where(and(eq(appointments.id, id), eq(appointments.doctorId, doctorId)))
      .returning();

    // Update the aggregate visit summary when a session completes.
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
      columns: { userId: true, specialization: true, hospitalAffiliation: true },
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
      name: userMap.get(d.userId)?.name ?? 'Doctor',
      email: userMap.get(d.userId)?.email ?? '',
      specialization: d.specialization,
      hospitalAffiliation: d.hospitalAffiliation,
    }));
  },
};

/**
 * Maintains the aggregate patient-doctor visit summary after each completed appointment.
 * Incrementally updates totals so the summary row always reflects the latest state
 * without full-table scans.
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
