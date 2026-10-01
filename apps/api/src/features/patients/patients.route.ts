import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireRole,
} from '../../infra/middleware';
import { PatientsController } from './patients.controller';

const patientsRouter = new Hono();

// All patient admin endpoints require auth + active account + at minimum admin role.
patientsRouter.use('*', requireAuth, requireActiveAccount);
patientsRouter.get('/', requireRole('admin'), PatientsController.list);

export { patientsRouter };
