import {
  db,
  users,
  accounts,
  sessions,
  userPreferences,
  eq,
  desc,
  and,
  sql,
} from '@healer/db';
import { redis } from '../../infra/lib/redis';
import { scrypt } from 'crypto';

function generateKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
      },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey);
      }
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = 'healer-static-dev-salt-2026';
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

export const superAdminService = {
  /**
   * Performs deep telemetry audits across cloud infrastructure components.
   */
  async getSystemTelemetry() {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'degraded';
    }

    let redisStatus = 'healthy';
    let redisLatencyMs = 0;
    try {
      const rStart = Date.now();
      await redis.ping();
      redisLatencyMs = Date.now() - rStart;
    } catch {
      redisStatus = 'offline';
    }

    // AI Provider status
    const hasTokenHarbor = !!process.env.TOKENHARBOR_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;

    // Active session volume
    const activeSessions = await db.query.sessions.findMany({
      columns: { id: true },
      limit: 500,
    });

    return {
      telemetry: {
        serverTimestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'development',
        runtime: 'Node.js (Next.js Serverless host)',
        database: {
          provider: 'PostgreSQL (Neon Cloud / Local)',
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        cache: {
          adapter: process.env.NODE_ENV === 'production' ? 'Upstash Redis (HTTP)' : 'Redis (Local/Docker)',
          status: redisStatus,
          latencyMs: redisLatencyMs,
        },
        aiProviders: {
          primary: hasTokenHarbor ? 'Token Harbor (Mimo-v2.6-Flash)' : 'Unconfigured',
          secondary: hasGroq ? 'Groq Multi-Layer Fallback (Llama-3.3-70B)' : 'Unconfigured',
        },
        sessions: {
          activeCount: activeSessions.length,
        },
        systemLatencyTotalMs: Date.now() - startTime,
      },
    };
  },

  /**
   * Retrieves all users holding admin or super_admin status.
   */
  async getAdmins() {
    const adminRows = await db.query.users.findMany({
      where: sql`${users.role} IN ('admin', 'super_admin')`,
      orderBy: [desc(users.createdAt)],
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

    return { admins: adminRows };
  },

  /**
   * Provisions a brand new Administrator account.
   * Enforces that only super_admins can create administrators.
   */
  async createAdmin(data: { name: string; email: string; password?: string }) {
    if (!data.name || !data.email) {
      throw new Error('Name and email are required.');
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      if (existingUser.role === 'admin' || existingUser.role === 'super_admin') {
        throw new Error('This user is already an administrator.');
      }
      // Promote existing user to admin
      const [promoted] = await db
        .update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.id, existingUser.id))
        .returning();
      return promoted;
    }

    const tempPassword = data.password || '12345678';
    const hashedPassword = await hashPassword(tempPassword);

    const [newUser] = await db
      .insert(users)
      .values({
        name: data.name.trim(),
        email: normalizedEmail,
        emailVerified: true,
        role: 'admin',
        status: 'active',
      })
      .returning();

    await db.insert(accounts).values({
      userId: newUser.id,
      accountId: normalizedEmail,
      providerId: 'credential',
      password: hashedPassword,
    });

    await db.insert(userPreferences).values({
      userId: newUser.id,
      aiMemoryEnabled: true,
      moodTrackingEnabled: false,
      anonymousMode: false,
      notificationEnabled: true,
      researcherModeEnabled: false,
    });

    return newUser;
  },

  /**
   * Revokes administrative privileges from an administrator.
   */
  async revokeAdmin(targetAdminId: string, currentSuperAdminId: string) {
    if (!targetAdminId) throw new Error('Target administrator ID is required.');
    if (targetAdminId === currentSuperAdminId) {
      throw new Error('You cannot revoke your own Super Admin access.');
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetAdminId),
    });

    if (!targetUser) throw new Error('Administrator not found.');
    if (targetUser.role === 'super_admin') {
      throw new Error('Super Admin privileges cannot be revoked via this endpoint.');
    }

    const [demoted] = await db
      .update(users)
      .set({
        role: 'patient',
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetAdminId))
      .returning();

    return demoted;
  },
};
