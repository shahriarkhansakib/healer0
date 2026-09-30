import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { authRouter } from './features/auth/auth.route';
import { patientsRouter } from './features/patients/patients.route';
import { systemRouter } from './features/system/system.route';

const app = new Hono().basePath('/api');

// Global middleware
app.use('*', logger());

// Mount routers
app.route('/auth', authRouter);
app.route('/patients', patientsRouter);
app.route('/system', systemRouter);

export default app;
