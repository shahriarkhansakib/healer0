import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { authRouter } from './features/auth/auth.route';
import { patientsRouter } from './features/patients/patients.route';
import { systemRouter } from './features/system/system.route';
import { doctorsRouter } from './features/doctors/doctors.route';
import { appointmentsRouter } from './features/appointments/appointments.route';
import { counselingRouter } from './features/counseling/counseling.route';
import { sessionsRouter } from './features/sessions/sessions.route';

const app = new Hono().basePath('/api');

// Global middleware
app.use('*', logger());

// Mount routers
app.route('/auth', authRouter);
app.route('/patients', patientsRouter);
app.route('/system', systemRouter);
app.route('/doctors', doctorsRouter);
app.route('/appointments', appointmentsRouter);
app.route('/counseling', counselingRouter);
app.route('/sessions', sessionsRouter);

export default app;
