import { Context } from 'hono';
import { 
  getSessionNotesService, createSessionNoteService, 
  getPrescriptionsService, createPrescriptionService 
} from './sessions.service';

export async function getSessionNotesHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const notes = await getSessionNotesService(user.id);
  return c.json({ data: notes });
}

export async function createSessionNoteHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const body = await c.req.json();
  const note = await createSessionNoteService(user.id, body);
  return c.json({ data: note }, 201);
}

export async function getPrescriptionsHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const rxs = await getPrescriptionsService(user.id);
  return c.json({ data: rxs });
}

export async function createPrescriptionHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const body = await c.req.json();
  const rx = await createPrescriptionService(user.id, body);
  return c.json({ data: rx }, 201);
}

