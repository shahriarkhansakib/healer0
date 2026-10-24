import { 
  db, users, doctorProfiles, doctorSettings, doctorQualifications, 
  doctorReviews, appointments, patientRecords, prescriptions, counselingSessions, patientProfiles, eq, desc, count, inArray, or 
} from '@healer/db';
import { getDoctorPatientRecordsService } from '../patients/patients.service';

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

  const resolvedSettings = settings || {
    id: '',
    doctorId: doctor.id,
    autoAcceptBooking: true,
    notificationEnabled: true,
    language: 'en',
    dutyStartTime: '08:00',
    dutyEndTime: '17:00',
    offDay: 'Sunday',
    bio: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    id: doctor.id,
    userId: doctor.userId,
    name: user?.name || 'Dr. Medical Professional',
    email: user?.email || '',
    image: user?.image,
    specialization: doctor.specialization,
    licenseNumber: doctor.licenseNumber,
    hospitalAffiliation: doctor.hospitalAffiliation,
    dutyStartTime: resolvedSettings.dutyStartTime || '08:00',
    dutyEndTime: resolvedSettings.dutyEndTime || '17:00',
    offDay: resolvedSettings.offDay || 'Sunday',
    bio: resolvedSettings.bio || '',
    settings: resolvedSettings,
    qualifications,
  };
}

export async function getOverviewStats(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return null;

  const doctorIds = [doctor.id];
  if (doctor.userId && !doctorIds.includes(doctor.userId)) {
    doctorIds.push(doctor.userId);
  }

  const allAppointments = await db.query.appointments.findMany({
    where: inArray(appointments.doctorId, doctorIds),
  });

  // Reconcile patient records across explicit records, booked appointments, and counseling sessions
  const allPatients = await getDoctorPatientRecordsService(userId);

  const allPrescriptions = await db.query.prescriptions.findMany({
    where: inArray(prescriptions.doctorId, doctorIds),
  });

  const reviews = await db.query.doctorReviews.findMany({
    where: inArray(doctorReviews.doctorId, doctorIds),
  });

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const todayStr = new Date().toDateString();
  const rawTodayAppts = allAppointments.filter(a => new Date(a.appointmentDate).toDateString() === todayStr);

  const todayAppointments = await Promise.all(
    rawTodayAppts.map(async (appt) => {
      if (appt.patientName) return appt;
      if (!appt.patientId) return appt;
      const pProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, appt.patientId), eq(patientProfiles.userId, appt.patientId)),
      });
      if (pProf) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, pProf.userId),
          columns: { name: true },
        });
        if (u?.name) return { ...appt, patientName: u.name };
      }
      return appt;
    })
  );

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

export async function updateDoctorProfileService(userId: string, data: { 
  specialization?: string; 
  hospitalAffiliation?: string; 
  bio?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  offDay?: string;
}) {
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

  const settingsUpdates: Record<string, any> = {};
  if (data.bio !== undefined) settingsUpdates.bio = data.bio;
  if (data.dutyStartTime !== undefined) settingsUpdates.dutyStartTime = data.dutyStartTime;
  if (data.dutyEndTime !== undefined) settingsUpdates.dutyEndTime = data.dutyEndTime;
  if (data.offDay !== undefined) settingsUpdates.offDay = data.offDay;

  if (Object.keys(settingsUpdates).length > 0) {
    const existingSettings = await db.query.doctorSettings.findFirst({
      where: eq(doctorSettings.doctorId, doctor.id),
    });

    if (existingSettings) {
      await db.update(doctorSettings)
        .set(settingsUpdates)
        .where(eq(doctorSettings.id, existingSettings.id));
    } else {
      await db.insert(doctorSettings).values({
        doctorId: doctor.id,
        ...settingsUpdates,
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

export interface DoctorDirectoryItem {
  doctorId: string;
  profileId: string;
  name: string;
  email: string;
  image: string | null;
  specialization: string;
  licenseNumber: string;
  hospitalAffiliation: string | null;
  dutyStartTime: string;
  dutyEndTime: string;
  offDay: string;
  bio: string;
  isAvailableToday: boolean;
  qualifications: {
    id: string;
    degree: string;
    institution: string;
    year: number;
  }[];
  averageRating: number;
  reviewCount: number;
  recentReviews: {
    id: string;
    patientName: string;
    rating: number;
    comment: string;
    createdAt: Date;
  }[];
}

export async function getDoctorDirectoryService(filters?: {
  search?: string;
  specialization?: string;
  availableToday?: boolean;
}): Promise<DoctorDirectoryItem[]> {
  const doctors = await db.query.doctorProfiles.findMany({
    columns: { id: true, userId: true, specialization: true, licenseNumber: true, hospitalAffiliation: true },
  });

  if (doctors.length === 0) return [];

  const userIds = doctors.map((d) => d.userId);
  const profileIds = doctors.map((d) => d.id);

  const [doctorUsers, settingsList, qualificationsList, reviewsList] = await Promise.all([
    db.query.users.findMany({
      where: inArray(users.id, userIds),
      columns: { id: true, name: true, email: true, image: true },
    }),
    db.query.doctorSettings.findMany({
      where: inArray(doctorSettings.doctorId, profileIds),
    }),
    db.query.doctorQualifications.findMany({
      where: inArray(doctorQualifications.doctorId, profileIds),
      orderBy: [desc(doctorQualifications.year)],
    }),
    db.query.doctorReviews.findMany({
      where: inArray(doctorReviews.doctorId, profileIds),
      orderBy: [desc(doctorReviews.createdAt)],
    }),
  ]);

  const userMap = new Map(doctorUsers.map((u) => [u.id, u]));
  const settingsMap = new Map(settingsList.map((s) => [s.doctorId, s]));

  const qualsMap = new Map<string, typeof qualificationsList>();
  for (const q of qualificationsList) {
    const arr = qualsMap.get(q.doctorId) || [];
    arr.push(q);
    qualsMap.set(q.doctorId, arr);
  }

  const reviewsMap = new Map<string, typeof reviewsList>();
  for (const r of reviewsList) {
    const arr = reviewsMap.get(r.doctorId) || [];
    arr.push(r);
    reviewsMap.set(r.doctorId, arr);
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[new Date().getDay()];

  let directory: DoctorDirectoryItem[] = doctors.map((d) => {
    const user = userMap.get(d.userId);
    const settings = settingsMap.get(d.id);
    const quals = qualsMap.get(d.id) || [];
    const reviews = reviewsMap.get(d.id) || [];

    const offDay = settings?.offDay || 'Sunday';
    const isAvailableToday = !offDay.toLowerCase().includes(todayDayName.toLowerCase());

    const totalScore = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? Number((totalScore / reviews.length).toFixed(1)) : 5.0;

    const rawName = user?.name || 'Dr. Specialist';
    const formattedName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;

    return {
      doctorId: d.userId,
      profileId: d.id,
      name: formattedName,
      email: user?.email || '',
      image: user?.image || null,
      specialization: d.specialization || 'Clinical Specialist',
      licenseNumber: d.licenseNumber || 'Verified',
      hospitalAffiliation: d.hospitalAffiliation || null,
      dutyStartTime: settings?.dutyStartTime || '08:00',
      dutyEndTime: settings?.dutyEndTime || '17:00',
      offDay,
      bio: settings?.bio || 'Certified specialist dedicated to evidence-based healthcare.',
      isAvailableToday,
      qualifications: quals.map((q) => ({
        id: q.id,
        degree: q.degree,
        institution: q.institution,
        year: q.year,
      })),
      averageRating,
      reviewCount: reviews.length,
      recentReviews: reviews.slice(0, 3).map((r) => ({
        id: r.id,
        patientName: r.patientName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    };
  });

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    directory = directory.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        (d.hospitalAffiliation && d.hospitalAffiliation.toLowerCase().includes(q)) ||
        d.bio.toLowerCase().includes(q)
    );
  }

  if (filters?.specialization && filters.specialization !== 'all') {
    directory = directory.filter(
      (d) => d.specialization.toLowerCase() === filters.specialization?.toLowerCase()
    );
  }

  if (filters?.availableToday) {
    directory = directory.filter((d) => d.isAvailableToday);
  }

  directory.sort((a, b) => b.averageRating - a.averageRating);

  return directory;
}

export async function getPublicDoctorProfileById(idOrUserId: string): Promise<DoctorDirectoryItem | null> {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(
      eq(doctorProfiles.id, idOrUserId),
      eq(doctorProfiles.userId, idOrUserId)
    ),
  });
  if (!doctor) return null;

  const [user, settings, qualifications, reviews] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, doctor.userId),
      columns: { id: true, name: true, email: true, image: true },
    }),
    db.query.doctorSettings.findFirst({
      where: eq(doctorSettings.doctorId, doctor.id),
    }),
    db.query.doctorQualifications.findMany({
      where: eq(doctorQualifications.doctorId, doctor.id),
      orderBy: [desc(doctorQualifications.year)],
    }),
    db.query.doctorReviews.findMany({
      where: eq(doctorReviews.doctorId, doctor.id),
      orderBy: [desc(doctorReviews.createdAt)],
    }),
  ]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[new Date().getDay()];
  const offDay = settings?.offDay || 'Sunday';
  const isAvailableToday = !offDay.toLowerCase().includes(todayDayName.toLowerCase());

  const totalScore = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = reviews.length > 0 ? Number((totalScore / reviews.length).toFixed(1)) : 5.0;

  const rawName = user?.name || 'Dr. Specialist';
  const formattedName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;

  return {
    doctorId: doctor.userId,
    profileId: doctor.id,
    name: formattedName,
    email: user?.email || '',
    image: user?.image || null,
    specialization: doctor.specialization || 'Clinical Specialist',
    licenseNumber: doctor.licenseNumber || 'Verified',
    hospitalAffiliation: doctor.hospitalAffiliation || null,
    dutyStartTime: settings?.dutyStartTime || '08:00',
    dutyEndTime: settings?.dutyEndTime || '17:00',
    offDay,
    bio: settings?.bio || 'Certified specialist dedicated to evidence-based healthcare.',
    isAvailableToday,
    qualifications: qualifications.map((q) => ({
      id: q.id,
      degree: q.degree,
      institution: q.institution,
      year: q.year,
    })),
    averageRating,
    reviewCount: reviews.length,
    recentReviews: reviews.map((r) => ({
      id: r.id,
      patientName: r.patientName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  };
}

export async function listDoctorSpecializationsService(): Promise<string[]> {
  const doctors = await db.query.doctorProfiles.findMany({
    columns: { specialization: true },
  });
  const set = new Set<string>();
  doctors.forEach((d) => {
    if (d.specialization) set.add(d.specialization.trim());
  });
  return Array.from(set);
}

