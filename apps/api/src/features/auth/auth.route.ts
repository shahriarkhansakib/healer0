import { Hono } from 'hono';
import { auth } from '../../infra/lib/auth';
import { db, patientProfiles, doctorProfiles, researcherProfiles, eq } from '@healer/db';

const authRouter = new Hono();

authRouter.get('/me', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(null, 401);

  const { user } = session;
  const patientProfile = await db.query.patientProfiles.findFirst({ where: eq(patientProfiles.userId, user.id) });
  const doctorProfile = await db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, user.id) });
  const researcherProfile = await db.query.researcherProfiles.findFirst({ where: eq(researcherProfiles.userId, user.id) });

  return c.json({
    ...session,
    profiles: {
      isPatient: !!patientProfile,
      isDoctor: !!doctorProfile,
      isResearcher: !!researcherProfile,
    }
  });
});

authRouter.post('/setup-profiles', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userId = session.user.id;
  const body = await c.req.json().catch(() => ({}));

  try {
    // 1. Patient identity (default for everyone)
    await db.insert(patientProfiles).values({
      userId,
      bloodType: body.bloodType || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
    }).onConflictDoNothing();

    // 2. Researcher identity (built-in by default for everyone)
    await db.insert(researcherProfiles).values({
      userId,
      institution: body.institution || 'Independent Research',
      researchField: body.researchField || 'Mental Health & Clinical Studies',
    }).onConflictDoNothing();

    // 3. Doctor identity (configured manually if selected)
    if (body.isDoctor) {
      await db.insert(doctorProfiles).values({
        userId,
        specialization: body.specialization || 'General Psychiatry',
        licenseNumber: body.licenseNumber || 'PENDING',
        hospitalAffiliation: body.hospitalAffiliation || null,
      }).onConflictDoNothing();
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

authRouter.post('/profiles/:role', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  
  const role = c.req.param('role');
  const userId = session.user.id;

  try {
    if (role === 'patient') {
      await db.insert(patientProfiles).values({ userId }).onConflictDoNothing();
    } else if (role === 'doctor') {
      await db.insert(doctorProfiles).values({ userId, specialization: 'General', licenseNumber: 'PENDING' }).onConflictDoNothing();
    } else if (role === 'researcher') {
      await db.insert(researcherProfiles).values({ userId, institution: 'Independent', researchField: 'General' }).onConflictDoNothing();
    } else {
      return c.json({ error: 'Invalid profile type' }, 400);
    }
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

authRouter.on(['POST', 'GET'], '/*', async (c) => {
  try {
    const res = await auth.handler(c.req.raw);
    if (res.status >= 400) {
      const clone = res.clone();
      const body = await clone.text().catch(() => 'no body');
      console.error(`\n[BetterAuth Error ${res.status}] ${c.req.method} ${c.req.url}`);
      console.error('Response Body:', body);
    }
    return res;
  } catch (err: any) {
    console.error(`\n[BetterAuth Exception] ${c.req.method} ${c.req.url}:`, err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

export { authRouter };
