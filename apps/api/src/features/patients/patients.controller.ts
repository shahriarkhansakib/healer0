import type { Context } from 'hono';
import type { AuthVariables } from '../../infra/middleware/auth';
import { PatientsService } from './patients.service';
import { logger } from '../../infra/lib/logger';

export const PatientsController = {
  async list(c: Context<{ Variables: AuthVariables }>) {
    try {
      const result = await PatientsService.list();
      return c.json(result, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'PatientsController.list failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
