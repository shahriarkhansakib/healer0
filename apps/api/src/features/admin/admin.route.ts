import { Hono } from 'hono';
import { requireAuth, requireActiveAccount, requireRole } from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { adminController } from './admin.controller';

const adminRouter = new Hono<{ Variables: AuthVariables }>();

// All admin routes strictly require authentication, active account, and minimum role 'admin'
adminRouter.use('*', requireAuth, requireActiveAccount, requireRole('admin'));

adminRouter.get('/stats', adminController.getStats);
adminRouter.get('/users', adminController.getUsers);
adminRouter.patch('/users/:id/status', adminController.updateUserStatus);
adminRouter.patch('/doctors/:id/verify', adminController.verifyDoctor);

export { adminRouter };
