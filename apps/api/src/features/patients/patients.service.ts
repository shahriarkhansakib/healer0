import { 
  db, doctorProfiles, patientRecords, patientProfiles, users, appointments, counselingSessions, eq, and, or, inArray, desc 
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
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const doctorIds = [doctor.id];
  if (doctor.userId && !doctorIds.includes(doctor.userId)) {
    doctorIds.push(doctor.userId);
  }

  // 1. Try updating existing patientRecords row directly by primary key
  const [updatedDirect] = await db.update(patientRecords)
    .set({ 
      riskLevel,
      ...(notes && { notes }),
      updatedAt: new Date(),
    })
    .where(and(eq(patientRecords.id, recordId), inArray(patientRecords.doctorId, doctorIds)))
    .returning();

  if (updatedDirect) return updatedDirect;

  // 2. Handle synthetic appointment record: 'appt-rec-<appointmentId>'
  if (recordId.startsWith('appt-rec-')) {
    const apptId = recordId.replace('appt-rec-', '');
    const appt = await db.query.appointments.findFirst({
      where: eq(appointments.id, apptId),
    });

    if (appt && appt.patientId) {
      let pProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, appt.patientId), eq(patientProfiles.userId, appt.patientId)),
      });

      if (!pProf) {
        const [newProf] = await db.insert(patientProfiles).values({
          userId: appt.patientId,
        }).returning();
        pProf = newProf;
      }

      const patientProfileId = pProf.id;
      let pName = appt.patientName;
      if (!pName && pProf.userId) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, pProf.userId),
          columns: { name: true },
        });
        pName = u?.name || 'Patient';
      }

      const existing = await db.query.patientRecords.findFirst({
        where: and(
          inArray(patientRecords.doctorId, doctorIds),
          eq(patientRecords.patientId, patientProfileId)
        ),
      });

      if (existing) {
        const [up] = await db.update(patientRecords)
          .set({
            riskLevel,
            ...(notes && { notes }),
            updatedAt: new Date(),
          })
          .where(eq(patientRecords.id, existing.id))
          .returning();
        return up;
      } else {
        const [inserted] = await db.insert(patientRecords).values({
          doctorId: doctor.id,
          patientId: patientProfileId,
          patientName: pName || 'Booked Patient',
          condition: appt.consultationType || 'Booked Consultation',
          medicalHistory: appt.consultationReason || appt.reason || 'Booked consultation patient',
          previousSessions: 1,
          riskLevel,
          allergies: 'None documented',
          notes: notes || `Appointment: ${appt.status} (${appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString() : 'Scheduled'})`,
        }).returning();
        return inserted;
      }
    }
  }

  // 3. Handle synthetic counseling record: 'cs-rec-<counselingSessionId>'
  if (recordId.startsWith('cs-rec-')) {
    const csId = recordId.replace('cs-rec-', '');
    const cs = await db.query.counselingSessions.findFirst({
      where: eq(counselingSessions.id, csId),
    });

    const rawId = cs?.patientId || cs?.userId;
    if (cs && rawId) {
      let pProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, rawId), eq(patientProfiles.userId, rawId)),
      });

      if (!pProf) {
        const [newProf] = await db.insert(patientProfiles).values({
          userId: rawId,
        }).returning();
        pProf = newProf;
      }

      const patientProfileId = pProf.id;
      let pName = cs.patientName;
      if (!pName && pProf.userId) {
        const u = await db.query.users.findFirst({
          where: eq(users.id, pProf.userId),
          columns: { name: true },
        });
        pName = u?.name || 'Counseling Patient';
      }

      const existing = await db.query.patientRecords.findFirst({
        where: and(
          inArray(patientRecords.doctorId, doctorIds),
          eq(patientRecords.patientId, patientProfileId)
        ),
      });

      if (existing) {
        const [up] = await db.update(patientRecords)
          .set({
            riskLevel,
            ...(notes && { notes }),
            updatedAt: new Date(),
          })
          .where(eq(patientRecords.id, existing.id))
          .returning();
        return up;
      } else {
        const [inserted] = await db.insert(patientRecords).values({
          doctorId: doctor.id,
          patientId: patientProfileId,
          patientName: pName || 'Counseling Patient',
          condition: cs.sessionType || 'Counseling Patient',
          medicalHistory: cs.notes || 'Booked counseling session',
          previousSessions: 1,
          riskLevel,
          allergies: 'None documented',
          notes: notes || `Counseling session: ${cs.status}`,
        }).returning();
        return inserted;
      }
    }
  }

  // 4. Handle recordId passed directly as patientProfileId or userId
  const pProf = await db.query.patientProfiles.findFirst({
    where: or(eq(patientProfiles.id, recordId), eq(patientProfiles.userId, recordId)),
  });
  if (pProf) {
    const existing = await db.query.patientRecords.findFirst({
      where: and(
        inArray(patientRecords.doctorId, doctorIds),
        eq(patientRecords.patientId, pProf.id)
      ),
    });
    if (existing) {
      const [up] = await db.update(patientRecords)
        .set({
          riskLevel,
          ...(notes && { notes }),
          updatedAt: new Date(),
        })
        .where(eq(patientRecords.id, existing.id))
        .returning();
      return up;
    }
  }

  throw new Error('Patient record not found to update risk level');
}

export const PatientsService = {
  async list() {
    return db.query.patientProfiles.findMany();
  },
};
