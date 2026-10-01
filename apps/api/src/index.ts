import { Hono } from 'hono';
import { logger as pinoLogger } from './infra/lib/logger';

// Feature routers
import { authRouter } from './features/auth/auth.route';
import { patientsRouter } from './features/patients/patients.route';
import { systemRouter } from './features/system/system.route';
import { moodTrackingRouter } from './features/mood-tracking/mood-tracking.route';
import { counselingRouter } from './features/counseling/counseling.route';
import { therapyRouter } from './features/therapy/therapy.route';
import { assessmentsRouter } from './features/assessments/assessments.route';
import { journalsRouter } from './features/journals/journals.route';
import { emergencyRouter } from './features/emergency/emergency.route';
import { communityRouter } from './features/community/community.route';
import { privacyRouter } from './features/privacy/privacy.route';
import { appointmentsRouter } from './features/appointments/appointments.route';
import { accountRouter } from './features/account/account.route';

const app = new Hono().basePath('/api');

// Global request logging — uses pino instead of the built-in hono/logger
// so all log lines share the same structured format as feature-level logs.
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  pinoLogger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start },
    'request',
  );
});

// System
app.route('/system', systemRouter);

// Auth (Better Auth + profile setup)
app.route('/auth', authRouter);

// Admin-facing
app.route('/patients', patientsRouter);

// Patient feature modules
app.route('/mood-tracking', moodTrackingRouter);
app.route('/counseling', counselingRouter);
app.route('/therapy', therapyRouter);
app.route('/assessments', assessmentsRouter);
app.route('/journals', journalsRouter);
app.route('/emergency', emergencyRouter);
app.route('/community', communityRouter);
app.route('/privacy', privacyRouter);
app.route('/appointments', appointmentsRouter);
app.route('/account', accountRouter);

export default app;
