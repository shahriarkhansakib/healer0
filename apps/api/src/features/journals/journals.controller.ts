import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { JournalsService } from './journals.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

const CreateJournalSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(10000),
  mood: z
    .enum(['Happy', 'Sad', 'Normal', 'Stressed', 'Anxious', 'Angry', 'Calm', 'Worried', 'Grateful'])
    .optional(),
});

const UpdateJournalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(10000).optional(),
  mood: z
    .enum(['Happy', 'Sad', 'Normal', 'Stressed', 'Anxious', 'Angry', 'Calm', 'Worried', 'Grateful'])
    .optional(),
});

export const JournalsController = {
  async create(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateJournalSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const journal = await JournalsService.create(user.id, parsed.data);
      return c.json(journal, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'JournalsController.create failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async list(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const entries = await JournalsService.listForUser(user.id);
      return c.json(entries, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'JournalsController.list failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getOne(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const journal = await JournalsService.getById(id, user.id);
      if (!journal) return c.json({ error: 'Not Found', message: 'Journal entry not found.' }, 404);
      return c.json(journal, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'JournalsController.getOne failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async update(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpdateJournalSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const updated = await JournalsService.update(id, user.id, parsed.data);
      if (!updated) return c.json({ error: 'Not Found', message: 'Journal entry not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'JournalsController.update failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async delete(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const deleted = await JournalsService.delete(id, user.id);
      if (!deleted) return c.json({ error: 'Not Found', message: 'Journal entry not found.' }, 404);
      return c.json({ success: true }, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'JournalsController.delete failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
