import { createMiddleware } from 'hono/factory';
import { db, patientProfiles, doctorProfiles, researcherProfiles, eq } from '@healer/db';

type ProfileType = 'patient' | 'doctor' | 'researcher';

export const requireProfile = (profileType: ProfileType) => {
  return createMiddleware(async (c, next) => {
    const sessionData = c.get('sessionData');
    if (!sessionData) {
      return c.json({ error: 'Unauthorized', message: 'No active session.' }, 401);
    }
    
    const userId = sessionData.user.id;
    let hasProfile = false;

    // Super admins can bypass domain profile checks
    if (sessionData.user.role === 'super_admin') {
      await next();
      return;
    }

    if (profileType === 'patient') {
      const p = await db.query.patientProfiles.findFirst({ where: eq(patientProfiles.userId, userId) });
      hasProfile = !!p;
    } else if (profileType === 'doctor') {
      const p = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, userId) });
      hasProfile = !!p;
    } else if (profileType === 'researcher') {
      const p = await db.query.researcherProfiles.findFirst({ where: eq(researcherProfiles.userId, userId) });
      hasProfile = !!p;
    }

    if (!hasProfile) {
      return c.json({ error: 'Forbidden', message: `Requires a valid ${profileType} profile.` }, 403);
    }

    await next();
  });
};
