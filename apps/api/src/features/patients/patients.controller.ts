import { Context } from 'hono';
import { getDoctorPatientRecordsService, updatePatientRiskLevelService } from './patients.service';

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

