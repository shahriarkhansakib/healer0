import type { Context } from 'hono';
import type { AuthVariables } from '../../infra/middleware/auth';
import { 
  getDoctorPatientRecordsService, 
  updatePatientRiskLevelService, 
  PatientsService 
} from './patients.service';
import { logger } from '../../infra/lib/logger';

export async function getDoctorPatientsHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const risk = c.req.query('risk');
  const records = await getDoctorPatientRecordsService(user.id, risk);
  return c.json({ data: records });
}

export async function updatePatientRiskHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const id = c.req.param('id');
  if (!id) throw new Error('Record ID is required');
  const body = await c.req.json();
  const updated = await updatePatientRiskLevelService(user.id, id, body.riskLevel, body.notes);
  return c.json({ data: updated });
}

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
