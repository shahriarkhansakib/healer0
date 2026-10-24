import {
  db,
  users,
  doctorProfiles,
  patientProfiles,
  researcherProfiles,
  appointments,
  crisisEvents,
  eq,
  desc,
  sql,
  and,
  or,
  ilike,
} from '@healer/db';

export interface AdminUserFilter {
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const adminService = {
  /**
   * Retrieves high-level operational statistics for the system administration panel.
   */
  async getPlatformStats() {
    const allUsers = await db.query.users.findMany({
      columns: { id: true, role: true, status: true, createdAt: true },
    });

    const totalUsers = allUsers.length;
    const patientCount = allUsers.filter((u) => u.role === 'patient' || u.role === 'user').length;
    const doctorCount = allUsers.filter((u) => u.role === 'doctor').length;
    const researcherCount = allUsers.filter((u) => u.role === 'researcher').length;
    const adminCount = allUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
    const suspendedCount = allUsers.filter((u) => u.status === 'suspended' || u.status === 'banned').length;

    // Doctor profiles awaiting verification review
    const allDoctors = await db.query.doctorProfiles.findMany({
      columns: { id: true, licenseNumber: true, specialization: true },
    });
    const pendingVerifications = allDoctors.filter(
      (d) => d.licenseNumber === 'PENDING' || !d.licenseNumber || d.licenseNumber.startsWith('PENDING')
    ).length;

    // Total appointment volume
    const appointmentRows = await db.query.appointments.findMany({
      columns: { id: true, status: true },
    });
    const activeAppointments = appointmentRows.filter(
      (a) => a.status === 'scheduled' || a.status === 'in-progress' || a.status === 'pending'
    ).length;

    // Total crisis events logged
    const crisisRows = await db.query.crisisEvents.findMany({
      columns: { id: true, riskLevel: true, psychologistConnected: true },
    });
    const activeCrisisAlerts = crisisRows.filter((c) => c.riskLevel === 'High' || !c.psychologistConnected).length;

    // Recent sign-ups
    const recentSignups = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      limit: 6,
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      metrics: {
        totalUsers,
        patientCount,
        doctorCount,
        researcherCount,
        adminCount,
        suspendedCount,
        pendingVerifications,
        activeAppointments,
        totalAppointments: appointmentRows.length,
        activeCrisisAlerts,
      },
      recentSignups,
    };
  },

  /**
   * Retrieves a paginated, filterable list of all users with their domain profiles attached.
   */
  async getUsers(filter: AdminUserFilter) {
    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const conditions = [];

    if (filter.role && filter.role !== 'all') {
      conditions.push(eq(users.role, filter.role as any));
    }

    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(users.status, filter.status as any));
    }

    if (filter.search) {
      const searchPattern = `%${filter.search}%`;
      conditions.push(
        or(
          ilike(users.name, searchPattern),
          ilike(users.email, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const userList = await db.query.users.findMany({
      where: whereClause,
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Populate matching domain profiles for each returned user
    const userIds = userList.map((u) => u.id);
    const [docProfiles, patProfiles, resProfiles] = await Promise.all([
      db.query.doctorProfiles.findMany({
        where: inArrayHelper(doctorProfiles.userId, userIds),
      }),
      db.query.patientProfiles.findMany({
        where: inArrayHelper(patientProfiles.userId, userIds),
      }),
      db.query.researcherProfiles.findMany({
        where: inArrayHelper(researcherProfiles.userId, userIds),
      }),
    ]);

    const docMap = new Map(docProfiles.map((d) => [d.userId, d]));
    const patMap = new Map(patProfiles.map((p) => [p.userId, p]));
    const resMap = new Map(resProfiles.map((r) => [r.userId, r]));

    const usersWithProfiles = userList.map((u) => ({
      ...u,
      doctorProfile: docMap.get(u.id) || null,
      patientProfile: patMap.get(u.id) || null,
      researcherProfile: resMap.get(u.id) || null,
    }));

    return {
      users: usersWithProfiles,
      count: usersWithProfiles.length,
    };
  },

  /**
   * Modifies a user's account status (active, suspended, banned).
   */
  async updateUserStatus(targetUserId: string, newStatus: 'active' | 'suspended' | 'banned', adminRole: string) {
    if (!targetUserId) throw new Error('Target user ID is required.');

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) throw new Error('User not found.');

    // An admin cannot ban/suspend another admin or a super_admin unless they are super_admin
    if (targetUser.role === 'super_admin') {
      throw new Error('Super Admin accounts cannot be suspended or banned.');
    }
    if (targetUser.role === 'admin' && adminRole !== 'super_admin') {
      throw new Error('Only Super Admins can alter the status of Administrator accounts.');
    }

    const [updated] = await db
      .update(users)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning({ id: users.id, email: users.email, status: users.status });

    return updated;
  },

  /**
   * Verifies or updates a clinician's license accreditation.
   */
  async verifyDoctorLicense(doctorId: string, verifiedLicenseNumber: string) {
    if (!doctorId) throw new Error('Doctor ID is required.');

    const [updated] = await db
      .update(doctorProfiles)
      .set({
        licenseNumber: verifiedLicenseNumber,
        updatedAt: new Date(),
      })
      .where(eq(doctorProfiles.id, doctorId))
      .returning();

    return updated;
  },
};

function inArrayHelper(column: any, values: string[]) {
  if (values.length === 0) return sql`1=0`;
  return sql`${column} IN ${values}`;
}
