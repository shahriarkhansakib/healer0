import {
  db,
  appointments,
  patientDoctorVisitSummary,
  users,
  doctorProfiles,
  patientProfiles,
  doctorReviews,
  eq,
  asc,
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

  if (normalizedStatus === 'completed' && updated) {
    await updateVisitSummary(updated.patientId, updated.doctorId, updated.sessionDurationMinutes);
  }

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

    const appts = await db.query.appointments.findMany({
      where: inArray(appointments.patientId, ids),
      orderBy: [desc(appointments.appointmentDate)],
    });

    if (appts.length === 0) return [];

    const doctorProfileIds = Array.from(new Set(appts.map((a) => a.doctorId)));
    const doctorList = await db.query.doctorProfiles.findMany({
      where: or(
        inArray(doctorProfiles.id, doctorProfileIds),
        inArray(doctorProfiles.userId, doctorProfileIds)
      ),
      columns: { id: true, userId: true, specialization: true },
    });

    const doctorUserIds = doctorList.map((d) => d.userId);
    const doctorUsers = doctorUserIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, doctorUserIds),
          columns: { id: true, name: true },
        })
      : [];

    const userMap = new Map(doctorUsers.map((u) => [u.id, u.name]));
    const doctorMap = new Map<string, { name: string; specialization: string | null }>();
    doctorList.forEach((d) => {
      const info = { name: userMap.get(d.userId) || 'Doctor', specialization: d.specialization };
      doctorMap.set(d.id, info);
      doctorMap.set(d.userId, info);
    });

    const apptIds = appts.map((a) => a.id);
    const reviews = await db.query.doctorReviews.findMany({
      where: inArray(doctorReviews.appointmentId, apptIds),
    });
    const reviewMap = new Map(reviews.map((r) => [r.appointmentId, r]));

    return appts.map((a) => {
      const doc = doctorMap.get(a.doctorId);
      const rev = reviewMap.get(a.id);
      return {
        ...a,
        doctorName: doc?.name || 'Doctor',
        doctorSpecialization: doc?.specialization || 'Clinical Specialist',
        isReviewed: !!rev,
        reviewRating: rev?.rating ?? null,
        reviewComment: rev?.comment ?? null,
      };
    });
  },

  async listPendingReviewsForPatient(patientUserId: string) {
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });
    const ids = [patientUserId];
    if (patientProfile) ids.push(patientProfile.id);

    const completedAppts = await db.query.appointments.findMany({
      where: and(
        inArray(appointments.patientId, ids),
        or(
          eq(appointments.appointmentStatus, 'Completed'),
          eq(appointments.status, 'completed')
        )
      ),
      orderBy: [desc(appointments.appointmentDate)],
    });

    if (completedAppts.length === 0) return [];

    const apptIds = completedAppts.map((a) => a.id);
    const existingReviews = await db.query.doctorReviews.findMany({
      where: inArray(doctorReviews.appointmentId, apptIds),
      columns: { appointmentId: true },
    });
    const reviewedSet = new Set(existingReviews.map((r) => r.appointmentId).filter(Boolean));

    const unreviewed = completedAppts.filter((a) => !reviewedSet.has(a.id));
    if (unreviewed.length === 0) return [];

    const doctorProfileIds = Array.from(new Set(unreviewed.map((a) => a.doctorId)));
    const doctorList = await db.query.doctorProfiles.findMany({
      where: or(
        inArray(doctorProfiles.id, doctorProfileIds),
        inArray(doctorProfiles.userId, doctorProfileIds)
      ),
      columns: { id: true, userId: true, specialization: true },
    });

    const doctorUserIds = doctorList.map((d) => d.userId);
    const doctorUsers = doctorUserIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, doctorUserIds),
          columns: { id: true, name: true },
        })
      : [];

    const userMap = new Map(doctorUsers.map((u) => [u.id, u.name]));
    const doctorMap = new Map<string, { name: string; specialization: string | null }>();
    doctorList.forEach((d) => {
      const info = { name: userMap.get(d.userId) || 'Doctor', specialization: d.specialization };
      doctorMap.set(d.id, info);
      doctorMap.set(d.userId, info);
    });

    return unreviewed.map((a) => {
      const doc = doctorMap.get(a.doctorId);
      return {
        id: a.id,
        appointmentId: a.id,
        doctorId: a.doctorId,
        doctorName: doc?.name || 'Doctor',
        doctorSpecialization: doc?.specialization || 'Clinical Specialist',
        appointmentDate: a.appointmentDate,
        consultationType: a.consultationType,
        sessionDurationMinutes: a.sessionDurationMinutes,
      };
    });
  },

  async submitAppointmentReview(
    patientUserId: string,
    appointmentId: string,
    payload: { rating: number; comment?: string }
  ) {
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });
    const ids = [patientUserId];
    if (patientProfile) ids.push(patientProfile.id);

    const appt = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, appointmentId),
        inArray(appointments.patientId, ids)
      ),
    });

    if (!appt) {
      throw new Error('Appointment not found or unauthorized');
    }

    const existing = await db.query.doctorReviews.findFirst({
      where: eq(doctorReviews.appointmentId, appointmentId),
    });
    if (existing) {
      throw new Error('This appointment has already been reviewed');
    }

    const docProfile = await db.query.doctorProfiles.findFirst({
      where: or(
        eq(doctorProfiles.id, appt.doctorId),
        eq(doctorProfiles.userId, appt.doctorId)
      ),
      columns: { id: true },
    });

    const patientUser = await db.query.users.findFirst({
      where: eq(users.id, patientUserId),
      columns: { name: true },
    });

    const [review] = await db
      .insert(doctorReviews)
      .values({
        doctorId: docProfile?.id || appt.doctorId,
        patientId: patientProfile?.id || null,
        appointmentId: appt.id,
        patientName: patientUser?.name || 'Anonymous Patient',
        rating: payload.rating,
        comment: payload.comment?.trim() || 'Session completed.',
      })
      .returning();

    return review;
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

  async syncVisitSummariesForPatient(patientUserId: string) {
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });
    const patientIds = [patientUserId];
    if (patientProfile) patientIds.push(patientProfile.id);

    const completedAppts = await db.query.appointments.findMany({
      where: and(
        inArray(appointments.patientId, patientIds),
        or(
          eq(appointments.status, 'completed'),
          eq(appointments.appointmentStatus, 'Completed')
        )
      ),
      orderBy: [asc(appointments.appointmentDate)],
    });

    if (completedAppts.length === 0) {
      return db.query.patientDoctorVisitSummary.findMany({
        where: inArray(patientDoctorVisitSummary.patientId, patientIds),
      });
    }

    const doctorGroupMap = new Map<string, typeof completedAppts>();
    for (const appt of completedAppts) {
      const group = doctorGroupMap.get(appt.doctorId) || [];
      group.push(appt);
      doctorGroupMap.set(appt.doctorId, group);
    }

    const patientUser = await db.query.users.findFirst({
      where: eq(users.id, patientUserId),
      columns: { name: true },
    });

    for (const [docId, apptList] of Array.from(doctorGroupMap.entries())) {
      const doctorProfile = await db.query.doctorProfiles.findFirst({
        where: or(eq(doctorProfiles.id, docId), eq(doctorProfiles.userId, docId)),
        columns: { id: true, userId: true },
      });
      const docUser = doctorProfile
        ? await db.query.users.findFirst({ where: eq(users.id, doctorProfile.userId), columns: { name: true } })
        : await db.query.users.findFirst({ where: eq(users.id, docId), columns: { name: true } });

      const doctorName = docUser?.name
        ? (docUser.name.startsWith('Dr.') ? docUser.name : `Dr. ${docUser.name}`)
        : 'Doctor';
      const patientName = patientUser?.name || 'Patient';
      const totalVisits = apptList.length;
      const totalConsultationMinutes = apptList.reduce((acc: number, curr: (typeof completedAppts)[number]) => acc + (curr.sessionDurationMinutes || 50), 0);
      const firstVisitDate = apptList[0]?.appointmentDate || new Date();
      const lastVisitDate = apptList[apptList.length - 1]?.appointmentDate || new Date();

      const doctorIds = [docId];
      if (doctorProfile) {
        doctorIds.push(doctorProfile.id);
        doctorIds.push(doctorProfile.userId);
      }

      const existing = await db.query.patientDoctorVisitSummary.findFirst({
        where: and(
          inArray(patientDoctorVisitSummary.patientId, patientIds),
          inArray(patientDoctorVisitSummary.doctorId, doctorIds)
        ),
      });

      if (existing) {
        await db
          .update(patientDoctorVisitSummary)
          .set({
            patientId: patientUserId,
            doctorId: docId,
            patientName,
            doctorName,
            totalVisits,
            totalConsultationMinutes,
            firstVisitDate,
            lastVisitDate,
            updatedAt: new Date(),
          })
          .where(eq(patientDoctorVisitSummary.id, existing.id));
      } else {
        await db.insert(patientDoctorVisitSummary).values({
          patientId: patientUserId,
          patientName,
          doctorId: docId,
          doctorName,
          totalVisits,
          totalConsultationMinutes,
          firstVisitDate,
          lastVisitDate,
        });
      }
    }

    return db.query.patientDoctorVisitSummary.findMany({
      where: inArray(patientDoctorVisitSummary.patientId, patientIds),
    });
  },

  async listVisitSummariesForPatient(patientId: string) {
    return this.syncVisitSummariesForPatient(patientId);
  },

  async listVisitSummariesForDoctor(doctorUserId: string) {
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, doctorUserId),
      columns: { id: true },
    });
    const ids = [doctorUserId];
    if (doctorProfile) ids.push(doctorProfile.id);

    return db.query.patientDoctorVisitSummary.findMany({
      where: inArray(patientDoctorVisitSummary.doctorId, ids),
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

  // 1. Resolve patient info
  let patientUser = await db.query.users.findFirst({
    where: eq(users.id, patientId),
    columns: { id: true, name: true },
  });
  let patientUserId = patientUser?.id;
  const patientIds = [patientId];

  if (!patientUser) {
    const pProf = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.id, patientId),
      columns: { id: true, userId: true },
    });
    if (pProf) {
      patientUserId = pProf.userId;
      patientIds.push(pProf.userId);
      patientUser = await db.query.users.findFirst({
        where: eq(users.id, pProf.userId),
        columns: { id: true, name: true },
      });
    }
  } else {
    patientUserId = patientUser.id;
    const pProf = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUser.id),
      columns: { id: true },
    });
    if (pProf) patientIds.push(pProf.id);
  }

  // 2. Resolve doctor info
  let doctorUser = await db.query.users.findFirst({
    where: eq(users.id, doctorId),
    columns: { id: true, name: true },
  });
  const doctorIds = [doctorId];

  if (!doctorUser) {
    const dProf = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.id, doctorId),
      columns: { id: true, userId: true },
    });
    if (dProf) {
      doctorIds.push(dProf.userId);
      doctorUser = await db.query.users.findFirst({
        where: eq(users.id, dProf.userId),
        columns: { id: true, name: true },
      });
    }
  } else {
    const dProf = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, doctorUser.id),
      columns: { id: true },
    });
    if (dProf) doctorIds.push(dProf.id);
  }

  const doctorName = doctorUser?.name
    ? (doctorUser.name.startsWith('Dr.') ? doctorUser.name : `Dr. ${doctorUser.name}`)
    : 'Doctor';
  const patientName = patientUser?.name || 'Patient';

  const existing = await db.query.patientDoctorVisitSummary.findFirst({
    where: and(
      inArray(patientDoctorVisitSummary.patientId, patientIds),
      inArray(patientDoctorVisitSummary.doctorId, doctorIds),
    ),
  });

  if (existing) {
    await db
      .update(patientDoctorVisitSummary)
      .set({
        totalVisits: existing.totalVisits + 1,
        lastVisitDate: now,
        totalConsultationMinutes: existing.totalConsultationMinutes + sessionMinutes,
        patientName,
        doctorName,
      })
      .where(eq(patientDoctorVisitSummary.id, existing.id));
  } else {
    await db.insert(patientDoctorVisitSummary).values({
      patientId: patientUserId || patientId,
      patientName,
      doctorId,
      doctorName,
      totalVisits: 1,
      firstVisitDate: now,
      lastVisitDate: now,
      totalConsultationMinutes: sessionMinutes,
    });
  }
}
