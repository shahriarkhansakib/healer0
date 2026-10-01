import { Context } from 'hono';
import { getCounselingSessionsService, updateCounselingStatusService } from './counseling.service';

export async function getCounselingSessionsHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const sessions = await getCounselingSessionsService(user.id);
  return c.json({ data: sessions });
}

export async function updateCounselingStatusHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const id = c.req.param('id');
  if (!id) throw new Error('Session ID is required');
  const body = await c.req.json();
  const updated = await updateCounselingStatusService(user.id, id, body.status, body.notes);
  return c.json({ data: updated });
}

