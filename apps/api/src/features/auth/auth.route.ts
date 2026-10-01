import { Hono } from 'hono';
import { auth } from '../../infra/lib/auth';
import {
  db,
  users,
  patientProfiles,
  doctorProfiles,
  researcherProfiles,
  userProfiles,
  userPreferences,
  privacyConsents,
  eq,
} from '@healer/db';
import { logger } from '../../infra/lib/logger';

const authRouter = new Hono();

/**
 * GET /api/auth/me
 * Returns the current session's user object together with profile flags
 * so the Next.js middleware can gate routes without additional DB calls.
 */
authRouter.get('/me', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(null, 401);

  const { user } = session;

  const [patientProfile, doctorProfile, researcherProfile] = await Promise.all([
    db.query.patientProfiles.findFirst({
      where: eq(patientProfiles.userId, user.id),
      columns: { id: true },
    }),
    db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, user.id),
      columns: { id: true },
    }),
    db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, user.id),
      columns: { id: true },
    }),
  ]);

  return c.json({
    ...session,
    profiles: {
      isPatient: !!patientProfile,
      isDoctor: !!doctorProfile,
      isResearcher: !!researcherProfile,
    },
  });
});

/**
 * POST /api/auth/setup-profiles
 * Called once after sign-up to provision the user's domain profile records.
 * Every user gets a patient profile by default. Doctor profile is optional.
 */
authRouter.post('/setup-profiles', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);

  let userId = session?.user?.id;
  let userName = session?.user?.name;

  // Fallback: If session cookie was still in flight immediately after sign-up, resolve user by body.userId
  if (!userId && typeof body.userId === 'string') {
    const user = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { id: true, name: true },
    });
    if (user) {
      userId = user.id;
      userName = user.name;
    }
  }

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'User session not found.' }, 401);
  }

  try {
    // Every registered user receives a patient profile — it is the universal baseline.
    await db
      .insert(patientProfiles)
      .values({
        userId,
        bloodType: typeof body.bloodType === 'string' ? body.bloodType : null,
        dateOfBirth:
          typeof body.dateOfBirth === 'string' ? new Date(body.dateOfBirth) : null,
      })
      .onConflictDoNothing();

    // Researcher profile is provisioned for users who opt in to research features.
    await db
      .insert(researcherProfiles)
      .values({
        userId,
        institution:
          typeof body.institution === 'string'
            ? body.institution
            : 'Independent Research',
        researchField:
          typeof body.researchField === 'string'
            ? body.researchField
            : 'Mental Health & Clinical Studies',
      })
      .onConflictDoNothing();

    // Doctor profile is only created when the user explicitly registers as a clinician.
    if (body.isDoctor === true) {
      await db
        .insert(doctorProfiles)
        .values({
          userId,
          specialization:
            typeof body.specialization === 'string'
              ? body.specialization
              : 'General Psychiatry',
          licenseNumber:
            typeof body.licenseNumber === 'string'
              ? body.licenseNumber
              : 'PENDING',
          hospitalAffiliation:
            typeof body.hospitalAffiliation === 'string'
              ? body.hospitalAffiliation
              : null,
        })
        .onConflictDoNothing();
    }

    // Provision demographic profile record (Table 2)
    await db
      .insert(userProfiles)
      .values({
        userId,
        fullName: userName || null,
        language: 'en',
      })
      .onConflictDoNothing();

    // Provision default user preferences (Table 3)
    await db
      .insert(userPreferences)
      .values({
        userId,
        aiMemoryEnabled: true,
        moodTrackingEnabled: true,
        anonymousMode: false,
        notificationEnabled: true,
      })
      .onConflictDoNothing();

    // Provision default privacy consents (Table 20)
    const existingConsents = await db.query.privacyConsents.findMany({
      where: eq(privacyConsents.userId, userId),
    });
    if (existingConsents.length === 0) {
      await db.insert(privacyConsents).values([
        { userId, consentType: 'AI Memory', accepted: true, acceptedDate: new Date() },
        { userId, consentType: 'Research Participation', accepted: false },
        { userId, consentType: 'Data Sharing', accepted: false },
      ]);
    }

    return c.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err }, 'setup-profiles failed');
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return c.json({ error: 'Internal Server Error', message }, 500);
  }
});

/**
 * POST /api/auth/profiles/:role
 * Idempotent endpoint to attach a single domain profile to the calling user.
 * Safe to call multiple times — uses onConflictDoNothing.
 */
authRouter.post('/profiles/:role', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const role = c.req.param('role');
  const userId = session.user.id;

  try {
    if (role === 'patient') {
      await db.insert(patientProfiles).values({ userId }).onConflictDoNothing();
    } else if (role === 'doctor') {
      await db
        .insert(doctorProfiles)
        .values({ userId, specialization: 'General', licenseNumber: 'PENDING' })
        .onConflictDoNothing();
    } else if (role === 'researcher') {
      await db
        .insert(researcherProfiles)
        .values({ userId, institution: 'Independent', researchField: 'General' })
        .onConflictDoNothing();
    } else {
      return c.json({ error: 'Bad Request', message: `Unknown profile type: ${role}` }, 400);
    }

    return c.json({ success: true });
  } catch (err: unknown) {
    logger.error({ err }, `profiles/${role} failed`);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return c.json({ error: 'Internal Server Error', message }, 500);
  }
});

/**
 * ALL /api/auth/* — Better Auth handler for sign-in, sign-up, sessions, etc.
 * Must be last so the explicit routes above take precedence.
 */
authRouter.on(['POST', 'GET'], '/*', async (c) => {
  try {
    const res = await auth.handler(c.req.raw);
    if (res.status >= 400) {
      const body = await res.clone().text().catch(() => 'no body');
      logger.error(
        { status: res.status, method: c.req.method, url: c.req.url, body },
        'BetterAuth error',
      );
    }
    return res;
  } catch (err: unknown) {
    logger.error({ err, method: c.req.method, url: c.req.url }, 'BetterAuth exception');
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return c.json({ error: 'Internal Server Error', message }, 500);
  }
});

export { authRouter };
