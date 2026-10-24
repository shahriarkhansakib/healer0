import { Hono } from 'hono';
import { requireAuth, requireActiveAccount, requireRole } from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { superAdminController } from './super-admin.controller';

const superAdminRouter = new Hono<{ Variables: AuthVariables }>();

// All super-admin routes strictly require authentication, active account, and role 'super_admin'
superAdminRouter.use('*', requireAuth, requireActiveAccount, requireRole('super_admin'));

superAdminRouter.get('/telemetry', superAdminController.getTelemetry);
superAdminRouter.get('/admins', superAdminController.getAdmins);
superAdminRouter.post('/admins', superAdminController.createAdmin);
superAdminRouter.delete('/admins/:id', superAdminController.revokeAdmin);

export { superAdminRouter };
