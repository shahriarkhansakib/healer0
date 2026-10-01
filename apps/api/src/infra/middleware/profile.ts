import { createMiddleware } from 'hono/factory';
import { db, patientProfiles, doctorProfiles, researcherProfiles, eq } from '@healer/db';
import type { AuthVariables } from './auth';

type ProfileType = 'patient' | 'doctor' | 'researcher';

/**
 * requireProfile — must run after requireAuth + requireActiveAccount.
 *
 * Reads `user` from the Hono context (set by requireAuth) and checks
 * that the corresponding domain profile record exists in the database.
 *
 * Super admins bypass profile checks entirely — they have unrestricted
 * read access across all domain namespaces for auditing purposes.
 */
export const requireProfile = (profileType: ProfileType) => {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'No active session.' }, 401);
    }

    // Super admins have full cross-domain access for oversight and auditing.
    if (user.role === 'super_admin') {
      await next();
      return;
    }

    const userId = user.id;
    let hasProfile = false;

    if (profileType === 'patient') {
      const profile = await db.query.patientProfiles.findFirst({
        where: eq(patientProfiles.userId, userId),
        columns: { id: true },
      });
      hasProfile = !!profile;
    } else if (profileType === 'doctor') {
      const profile = await db.query.doctorProfiles.findFirst({
        where: eq(doctorProfiles.userId, userId),
        columns: { id: true },
      });
      hasProfile = !!profile;
    } else if (profileType === 'researcher') {
      const profile = await db.query.researcherProfiles.findFirst({
        where: eq(researcherProfiles.userId, userId),
        columns: { id: true },
      });
      hasProfile = !!profile;
    }

    if (!hasProfile) {
      return c.json(
        {
          error: 'Forbidden',
          message: `A valid ${profileType} profile is required to access this resource.`,
        },
        403,
      );
    }

    await next();
  });
};
