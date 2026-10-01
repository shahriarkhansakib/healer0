import { Context } from 'hono';
import { getAppointmentsService, updateAppointmentStatusService } from './appointments.service';

export async function getAppointmentsHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const status = c.req.query('status');
  const appts = await getAppointmentsService(user.id, status);
  return c.json({ data: appts });
}

export async function updateAppointmentStatusHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const id = c.req.param('id');
  if (!id) throw new Error('Appointment ID is required');
  const body = await c.req.json();
  const updated = await updateAppointmentStatusService(user.id, id, body.status);
  return c.json({ data: updated });
}

