import {
  db,
  appointments,
  patientDoctorVisitSummary,
  users,
  doctorProfiles,
  patientProfiles,
  doctorReviews,
  prescriptions,
  doctorSettings,
  eq,
  asc,
  desc,
  and,
  or,
  inArray,
  gte,
  lte,
} from '@healer/db';

export interface TimeSlot {
  time: string;           // "09:00"
  formattedTime: string;  // "9:00 AM"
  isoDateTime: string;    // "2026-10-20T09:00:00.000Z"
  durationMinutes: number;
  isAvailable: boolean;
  reason?: 'Past time' | 'Already booked' | 'Doctor off duty';
}

export interface DoctorAvailabilityResult {
  doctorId: string;
  profileId: string;
  doctorName: string;
  specialization: string | null;
  hospitalAffiliation: string | null;
  date: string;
  dayOfWeek: string;
  isOffDay: boolean;
  offDayName: string;
  dutyStartTime: string;
  dutyEndTime: string;
  slots: TimeSlot[];
}

export async function getAppointmentsService(userId: string, statusFilter?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  const ids = [userId];
  if (doctor) {
    ids.push(doctor.id);
    if (doctor.userId && !ids.includes(doctor.userId)) ids.push(doctor.userId);
  }

  const all = await db.query.appointments.findMany({
    where: inArray(appointments.doctorId, ids),
    orderBy: [desc(appointments.appointmentDate)],
  });

  const enriched = await Promise.all(
    all.map(async (a) => {
      if (a.patientName) return a;
      const pProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, a.patientId), eq(patientProfiles.userId, a.patientId)),
      });
      if (pProf) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, pProf.userId),
          columns: { name: true },
        });
        if (u?.name) return { ...a, patientName: u.name };
      }
      const directUser = await db.query.users.findFirst({
        where: eq(users.id, a.patientId),
        columns: { name: true },
      });
      if (directUser?.name) return { ...a, patientName: directUser.name };
      return a;
    })
  );

  if (statusFilter && statusFilter !== 'all') {
    return enriched.filter(a => 
      (a.status?.toLowerCase() === statusFilter.toLowerCase()) || 
      (a.appointmentStatus?.toLowerCase() === statusFilter.toLowerCase())
    );
  }

  return enriched;
}

export async function updateAppointmentStatusService(userId: string, appointmentId: string, status: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
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

    // Check doctor duty hours and off-day constraints
    const settings = await db.query.doctorSettings.findFirst({
      where: eq(doctorSettings.doctorId, doctorProfile.id),
    });
    const apptDate = new Date(payload.appointmentDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[apptDate.getDay()];
    const offDay = settings?.offDay || 'Sunday';

    if (offDay.toLowerCase().includes(dayName.toLowerCase())) {
      throw new Error(`Doctor is off duty on ${dayName}. Please choose another date.`);
    }

    const dutyStart = settings?.dutyStartTime || '08:00';
    const dutyEnd = settings?.dutyEndTime || '17:00';
    const [startH, startM] = dutyStart.split(':').map(Number);
    const [endH, endM] = dutyEnd.split(':').map(Number);
    const apptMinutes = apptDate.getHours() * 60 + apptDate.getMinutes();
    const duration = payload.sessionDurationMinutes ?? 45;

    if (apptMinutes < startH * 60 + startM || apptMinutes + duration > endH * 60 + endM) {
      throw new Error(`Appointment must fall within doctor's duty hours (${dutyStart} - ${dutyEnd}).`);
    }

    // Check collision with existing active appointments for this doctor
    const apptStart = apptDate.getTime();
    const apptEnd = apptStart + duration * 60000;

    const nearbyAppts = await db.query.appointments.findMany({
      where: and(
        inArray(appointments.doctorId, [doctorProfile.id, doctorProfile.userId]),
        or(
          eq(appointments.status, 'scheduled'),
          eq(appointments.status, 'in-progress'),
          eq(appointments.appointmentStatus, 'Scheduled')
        ),
        gte(appointments.appointmentDate, new Date(apptStart - 180 * 60000)),
        lte(appointments.appointmentDate, new Date(apptEnd + 180 * 60000))
      ),
    });

    const hasConflict = nearbyAppts.some((a) => {
      const aStart = new Date(a.appointmentDate).getTime();
      const aDur = a.sessionDurationMinutes || 45;
      const aEnd = aStart + aDur * 60000;
      return apptStart < aEnd && apptEnd > aStart;
    });

    if (hasConflict) {
      throw new Error('This time slot is already booked. Please select an available slot.');
    }

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
        appointmentDate: apptDate,
        consultationType: payload.consultationType,
        reason: payload.consultationReason ?? '',
        consultationReason: payload.consultationReason ?? null,
        sessionDurationMinutes: duration,
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
      columns: { id: true, name: true, email: true, image: true },
    });

    const userMap = new Map(doctorUsers.map((u) => [u.id, u]));

    const profileIds = doctors.map((d) => d.id);
    const settingsList = await db.query.doctorSettings.findMany({
      where: inArray(doctorSettings.doctorId, profileIds),
    });
    const settingsMap = new Map(settingsList.map((s) => [s.doctorId, s]));

    return doctors.map((d) => {
      const user = userMap.get(d.userId);
      const settings = settingsMap.get(d.id);
      return {
        doctorId: d.userId,
        profileId: d.id,
        name: user?.name ? (user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`) : 'Doctor',
        email: user?.email ?? '',
        image: user?.image || null,
        specialization: d.specialization,
        hospitalAffiliation: d.hospitalAffiliation,
        dutyStartTime: settings?.dutyStartTime || '08:00',
        dutyEndTime: settings?.dutyEndTime || '17:00',
        offDay: settings?.offDay || 'Sunday',
        bio: settings?.bio || '',
      };
    });
  },

  async getDoctorAvailableSlots(
    doctorId: string,
    dateStr: string,
    durationMinutes = 45
  ): Promise<DoctorAvailabilityResult> {
    const doctorProfile = await db.query.doctorProfiles.findFirst({
      where: or(
        eq(doctorProfiles.userId, doctorId),
        eq(doctorProfiles.id, doctorId)
      ),
      columns: { id: true, userId: true, specialization: true, hospitalAffiliation: true },
    });
    if (!doctorProfile) {
      throw new Error('Doctor profile not found');
    }

    const doctorUser = await db.query.users.findFirst({
      where: eq(users.id, doctorProfile.userId),
      columns: { name: true, image: true },
    });

    const settings = await db.query.doctorSettings.findFirst({
      where: eq(doctorSettings.doctorId, doctorProfile.id),
    });

    const dutyStartTime = settings?.dutyStartTime || '08:00';
    const dutyEndTime = settings?.dutyEndTime || '17:00';
    const offDay = settings?.offDay || 'Sunday';

    // Parse YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getDay()];

    const isOffDay = offDay.toLowerCase().includes(dayOfWeek.toLowerCase());

    const doctorName = doctorUser?.name
      ? (doctorUser.name.startsWith('Dr.') ? doctorUser.name : `Dr. ${doctorUser.name}`)
      : 'Doctor';

    if (isOffDay) {
      return {
        doctorId: doctorProfile.userId,
        profileId: doctorProfile.id,
        doctorName,
        specialization: doctorProfile.specialization,
        hospitalAffiliation: doctorProfile.hospitalAffiliation,
        date: dateStr,
        dayOfWeek,
        isOffDay: true,
        offDayName: offDay,
        dutyStartTime,
        dutyEndTime,
        slots: [],
      };
    }

    // Load active appointments for this doctor on target date
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    const existingAppts = await db.query.appointments.findMany({
      where: and(
        inArray(appointments.doctorId, [doctorProfile.id, doctorProfile.userId]),
        gte(appointments.appointmentDate, dayStart),
        lte(appointments.appointmentDate, dayEnd),
        or(
          eq(appointments.status, 'scheduled'),
          eq(appointments.status, 'in-progress'),
          eq(appointments.appointmentStatus, 'Scheduled')
        )
      ),
    });

    const [startH, startM] = dutyStartTime.split(':').map(Number);
    const [endH, endM] = dutyEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const now = new Date();
    const slots: TimeSlot[] = [];

    for (let current = startMinutes; current + durationMinutes <= endMinutes; current += durationMinutes) {
      const slotHour = Math.floor(current / 60);
      const slotMinute = current % 60;

      const slotStart = new Date(y, m - 1, d, slotHour, slotMinute, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      const isPast = slotStart.getTime() <= now.getTime();

      const hasConflict = existingAppts.some((appt) => {
        const apptStart = new Date(appt.appointmentDate).getTime();
        const apptDuration = appt.sessionDurationMinutes || durationMinutes;
        const apptEnd = apptStart + apptDuration * 60000;
        return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
      });

      const displayHour = slotHour % 12 === 0 ? 12 : slotHour % 12;
      const ampm = slotHour >= 12 ? 'PM' : 'AM';
      const formattedTime = `${displayHour}:${slotMinute.toString().padStart(2, '0')} ${ampm}`;
      const time24 = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;

      slots.push({
        time: time24,
        formattedTime,
        isoDateTime: slotStart.toISOString(),
        durationMinutes,
        isAvailable: !isPast && !hasConflict,
        reason: isPast ? 'Past time' : hasConflict ? 'Already booked' : undefined,
      });
    }

    return {
      doctorId: doctorProfile.userId,
      profileId: doctorProfile.id,
      doctorName,
      specialization: doctorProfile.specialization,
      hospitalAffiliation: doctorProfile.hospitalAffiliation,
      date: dateStr,
      dayOfWeek,
      isOffDay: false,
      offDayName: offDay,
      dutyStartTime,
      dutyEndTime,
      slots,
    };
  },

  async listPrescriptionsForPatient(patientUserId: string) {
    const patientProfile = await db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, patientUserId),
      columns: { id: true },
    });
    const ids = [patientUserId];
    if (patientProfile) ids.push(patientProfile.id);

    const rxList = await db.query.prescriptions.findMany({
      where: inArray(prescriptions.patientId, ids),
      orderBy: [desc(prescriptions.createdAt)],
    });

    if (rxList.length === 0) return [];

    const doctorProfileIds = Array.from(new Set(rxList.map((r) => r.doctorId)));
    const doctorList = await db.query.doctorProfiles.findMany({
      where: or(
        inArray(doctorProfiles.id, doctorProfileIds),
        inArray(doctorProfiles.userId, doctorProfileIds)
      ),
      columns: { id: true, userId: true, specialization: true, hospitalAffiliation: true },
    });

    const doctorUserIds = doctorList.map((d) => d.userId);
    const doctorUsers = doctorUserIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, doctorUserIds),
          columns: { id: true, name: true, image: true },
        })
      : [];

    const userMap = new Map(doctorUsers.map((u) => [u.id, u]));
    const doctorMap = new Map<string, { name: string; specialization: string | null; hospitalAffiliation: string | null; image: string | null }>();
    doctorList.forEach((d) => {
      const user = userMap.get(d.userId);
      const info = {
        name: user?.name ? (user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`) : 'Doctor',
        specialization: d.specialization,
        hospitalAffiliation: d.hospitalAffiliation,
        image: user?.image || null,
      };
      doctorMap.set(d.id, info);
      doctorMap.set(d.userId, info);
    });

    return rxList.map((rx) => {
      const doc = doctorMap.get(rx.doctorId);
      return {
        ...rx,
        doctorName: doc?.name || 'Licensed Clinician',
        doctorSpecialization: doc?.specialization || 'Clinical Specialist',
        doctorHospital: doc?.hospitalAffiliation || null,
        doctorImage: doc?.image || null,
      };
    });
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
