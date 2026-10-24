import type { Context } from 'hono';
import { superAdminService } from './super-admin.service';
import { logger } from '../../infra/lib/logger';

export const superAdminController = {
  async getTelemetry(c: Context) {
    try {
      const data = await superAdminService.getSystemTelemetry();
      return c.json(data);
    } catch (err: unknown) {
      logger.error({ err }, 'Error in superAdminController.getTelemetry');
      const message = err instanceof Error ? err.message : 'Failed to retrieve telemetry.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getAdmins(c: Context) {
    try {
      const data = await superAdminService.getAdmins();
      return c.json(data);
    } catch (err: unknown) {
      logger.error({ err }, 'Error in superAdminController.getAdmins');
      const message = err instanceof Error ? err.message : 'Failed to retrieve admins.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createAdmin(c: Context) {
    try {
      const body = await c.req.json().catch(() => ({}));
      if (!body.name || !body.email) {
        return c.json({ error: 'Bad Request', message: 'Name and email are required.' }, 400);
      }

      const created = await superAdminService.createAdmin({
        name: body.name,
        email: body.email,
        password: body.password,
      });

      return c.json({ success: true, admin: created }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'Error in superAdminController.createAdmin');
      const message = err instanceof Error ? err.message : 'Failed to create administrator.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },

  async revokeAdmin(c: Context) {
    try {
      const targetAdminId = c.req.param('id');
      if (!targetAdminId) {
        return c.json({ error: 'Bad Request', message: 'Admin ID is required.' }, 400);
      }
      const currentUser = c.get('user');

      const updated = await superAdminService.revokeAdmin(targetAdminId, currentUser?.id || '');
      return c.json({ success: true, admin: updated });
    } catch (err: unknown) {
      logger.error({ err }, 'Error in superAdminController.revokeAdmin');
      const message = err instanceof Error ? err.message : 'Failed to revoke administrator.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },
};
