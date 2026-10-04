import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { 
  getCounselingSessionsService, 
  updateCounselingStatusService, 
  CounselingService 
} from './counseling.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

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

const CreateSessionSchema = z.object({
  sessionType: z.enum(['Basic Counseling', 'Deep Counseling', 'Crisis Support']),
});

const SendMessageSchema = z.object({
  messageText: z.string().min(1).max(5000),
  emotionDetected: z.string().max(100).optional(),
});

export const CounselingController = {
  async createSession(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateSessionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const session = await CounselingService.createSession(user.id, parsed.data);
      return c.json(session, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CounselingController.createSession failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listSessions(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const sessions = await CounselingService.listSessionsForUser(user.id);
      return c.json(sessions, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CounselingController.listSessions failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getSession(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const session = await CounselingService.getSessionById(id, user.id);
      if (!session) return c.json({ error: 'Not Found', message: 'Session not found.' }, 404);
      return c.json(session, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CounselingController.getSession failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async endSession(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const updated = await CounselingService.endSession(id, user.id);
      if (!updated) return c.json({ error: 'Not Found', message: 'Session not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CounselingController.endSession failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async sendMessage(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const sessionId = requireParam(c, 'sessionId');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = SendMessageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const msg = await CounselingService.sendMessage(sessionId, user.id, parsed.data);
      if (!msg) return c.json({ error: 'Not Found', message: 'Session not found.' }, 404);
      return c.json(msg, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CounselingController.sendMessage failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getMessages(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const sessionId = requireParam(c, 'sessionId');
    try {
      const messages = await CounselingService.getMessagesForSession(sessionId, user.id);
      if (!messages) return c.json({ error: 'Not Found', message: 'Session not found.' }, 404);
      return c.json(messages, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CounselingController.getMessages failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
