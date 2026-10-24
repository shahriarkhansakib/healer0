import type { Context } from 'hono';
import { adminService } from './admin.service';
import { logger } from '../../infra/lib/logger';

export const adminController = {
  async getStats(c: Context) {
    try {
      const data = await adminService.getPlatformStats();
      return c.json(data);
    } catch (err: unknown) {
      logger.error({ err }, 'Error in adminController.getStats');
      const message = err instanceof Error ? err.message : 'Failed to retrieve admin statistics.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getUsers(c: Context) {
    try {
      const role = c.req.query('role');
      const status = c.req.query('status');
      const search = c.req.query('search');
      const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 50;
      const offset = c.req.query('offset') ? Number(c.req.query('offset')) : 0;

      const data = await adminService.getUsers({
        role,
        status,
        search,
        limit,
        offset,
      });
      return c.json(data);
    } catch (err: unknown) {
      logger.error({ err }, 'Error in adminController.getUsers');
      const message = err instanceof Error ? err.message : 'Failed to fetch user directory.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateUserStatus(c: Context) {
    try {
      const targetUserId = c.req.param('id');
      if (!targetUserId) {
        return c.json({ error: 'Bad Request', message: 'User ID is required.' }, 400);
      }
      const body = await c.req.json().catch(() => ({}));
      const currentUser = c.get('user');

      if (!body.status || !['active', 'suspended', 'banned'].includes(body.status)) {
        return c.json({ error: 'Bad Request', message: "Status must be 'active', 'suspended', or 'banned'." }, 400);
      }

      const updated = await adminService.updateUserStatus(
        targetUserId,
        body.status,
        currentUser?.role || 'admin'
      );
      return c.json({ success: true, user: updated });
    } catch (err: unknown) {
      logger.error({ err }, 'Error in adminController.updateUserStatus');
      const message = err instanceof Error ? err.message : 'Failed to update user status.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },

  async verifyDoctor(c: Context) {
    try {
      const doctorId = c.req.param('id');
      if (!doctorId) {
        return c.json({ error: 'Bad Request', message: 'Doctor ID is required.' }, 400);
      }
      const body = await c.req.json().catch(() => ({}));
      const licenseNumber = typeof body.licenseNumber === 'string' ? body.licenseNumber : 'MD-VERIFIED';

      const updated = await adminService.verifyDoctorLicense(doctorId, licenseNumber);
      return c.json({ success: true, doctor: updated });
    } catch (err: unknown) {
      logger.error({ err }, 'Error in adminController.verifyDoctor');
      const message = err instanceof Error ? err.message : 'Failed to verify doctor license.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },
};
