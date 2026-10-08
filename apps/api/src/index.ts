import { Hono } from 'hono';
import { logger as pinoLogger } from './infra/lib/logger';

// Feature routers
import { authRouter } from './features/auth/auth.route';
import { patientsRouter } from './features/patients/patients.route';
import { systemRouter } from './features/system/system.route';
import { doctorsRouter } from './features/doctors/doctors.route';
import { appointmentsRouter } from './features/appointments/appointments.route';
import { counselingRouter } from './features/counseling/counseling.route';
import { sessionsRouter } from './features/sessions/sessions.route';

// Patient feature modules
import { moodTrackingRouter } from './features/mood-tracking/mood-tracking.route';
import { therapyRouter } from './features/therapy/therapy.route';
import { assessmentsRouter } from './features/assessments/assessments.route';
import { journalsRouter } from './features/journals/journals.route';
import { emergencyRouter } from './features/emergency/emergency.route';
import { communityRouter } from './features/community/community.route';
import { privacyRouter } from './features/privacy/privacy.route';
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

// System & Doctor features
app.route('/system', systemRouter);
app.route('/doctors', doctorsRouter);
app.route('/sessions', sessionsRouter);

// Auth (Better Auth + profile setup)
app.route('/auth', authRouter);

// Patients (Admin list + Doctor patient records)
app.route('/patients', patientsRouter);

// Shared features (Integrated for both Doctor & Patient)
app.route('/appointments', appointmentsRouter);
app.route('/counseling', counselingRouter);

// Patient feature modules
app.route('/mood-tracking', moodTrackingRouter);
app.route('/therapy', therapyRouter);
app.route('/assessments', assessmentsRouter);
app.route('/journals', journalsRouter);
app.route('/emergency', emergencyRouter);
app.route('/community', communityRouter);
app.route('/privacy', privacyRouter);
app.route('/account', accountRouter);

export default app;
