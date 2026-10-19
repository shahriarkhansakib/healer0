import { 
  db, users, doctorProfiles, doctorSettings, doctorQualifications, 
  doctorReviews, appointments, patientRecords, prescriptions, counselingSessions, eq, desc, count 
} from '@healer/db';

export async function getDoctorProfileByUserId(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const settings = await db.query.doctorSettings.findFirst({
    where: eq(doctorSettings.doctorId, doctor.id),
  });

  const qualifications = await db.query.doctorQualifications.findMany({
    where: eq(doctorQualifications.doctorId, doctor.id),
    orderBy: [desc(doctorQualifications.year)],
  });

  return {
    id: doctor.id,
    userId: doctor.userId,
    name: user?.name || 'Dr. Medical Professional',
    email: user?.email || '',
    image: user?.image,
    specialization: doctor.specialization,
    licenseNumber: doctor.licenseNumber,
    hospitalAffiliation: doctor.hospitalAffiliation,
    settings: settings || {
      autoAcceptBooking: true,
      notificationEnabled: true,
      language: 'en',
      dutyStartTime: '08:00',
      dutyEndTime: '17:00',
      offDay: 'Sunday',
      bio: '',
    },
    qualifications,
  };
}

export async function getOverviewStats(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return null;

  const allAppointments = await db.query.appointments.findMany({
    where: eq(appointments.doctorId, doctor.id),
  });

  const allPatients = await db.query.patientRecords.findMany({
    where: eq(patientRecords.doctorId, doctor.id),
  });

  const allPrescriptions = await db.query.prescriptions.findMany({
    where: eq(prescriptions.doctorId, doctor.id),
  });

  const reviews = await db.query.doctorReviews.findMany({
    where: eq(doctorReviews.doctorId, doctor.id),
  });

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const todayStr = new Date().toDateString();
  const todayAppointments = allAppointments.filter(a => new Date(a.appointmentDate).toDateString() === todayStr);

  const criticalPatients = allPatients.filter(p => p.riskLevel === 'Critical' || p.riskLevel === 'High');

  return {
    todayAppointmentsCount: todayAppointments.length,
    pendingPrescriptionsCount: allPrescriptions.length,
    activePatientsCount: allPatients.length,
    avgRating,
    todayAppointments,
    criticalPatients,
  };
}

export async function updateDoctorProfileService(userId: string, data: { specialization?: string; hospitalAffiliation?: string; bio?: string }) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  if (data.specialization || data.hospitalAffiliation) {
    await db.update(doctorProfiles)
      .set({
        ...(data.specialization && { specialization: data.specialization }),
        ...(data.hospitalAffiliation && { hospitalAffiliation: data.hospitalAffiliation }),
      })
      .where(eq(doctorProfiles.id, doctor.id));
  }

  if (data.bio !== undefined) {
    const existingSettings = await db.query.doctorSettings.findFirst({
      where: eq(doctorSettings.doctorId, doctor.id),
    });

    if (existingSettings) {
      await db.update(doctorSettings)
        .set({ bio: data.bio })
        .where(eq(doctorSettings.id, existingSettings.id));
    } else {
      await db.insert(doctorSettings).values({
        doctorId: doctor.id,
        bio: data.bio,
      });
    }
  }

  return getDoctorProfileByUserId(userId);
}

export async function updateDoctorSettingsService(userId: string, data: {
  autoAcceptBooking?: boolean;
  notificationEnabled?: boolean;
  language?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  offDay?: string;
}) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const existingSettings = await db.query.doctorSettings.findFirst({
    where: eq(doctorSettings.doctorId, doctor.id),
  });

  if (existingSettings) {
    await db.update(doctorSettings)
      .set(data)
      .where(eq(doctorSettings.id, existingSettings.id));
  } else {
    await db.insert(doctorSettings).values({
      doctorId: doctor.id,
      ...data,
    });
  }

  return getDoctorProfileByUserId(userId);
}

export async function addQualificationService(userId: string, data: { degree: string; institution: string; year: number }) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [qual] = await db.insert(doctorQualifications).values({
    doctorId: doctor.id,
    degree: data.degree,
    institution: data.institution,
    year: data.year,
  }).returning();

  return qual;
}

export async function getReviewsService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  return db.query.doctorReviews.findMany({
    where: eq(doctorReviews.doctorId, doctor.id),
    orderBy: [desc(doctorReviews.createdAt)],
  });
}
