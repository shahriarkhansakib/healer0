import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { MoodTrackingService } from './mood-tracking.service';
import { logger } from '../../infra/lib/logger';

const CreateMoodSchema = z.object({
  moodType: z.enum(['Happy', 'Sad', 'Normal', 'Stressed', 'Anxious', 'Angry', 'Calm']),
  stressLevel: z.number().int().min(1).max(10),
  anxietyLevel: z.number().int().min(1).max(10),
  sleepQuality: z.number().int().min(1).max(10),
  notes: z.string().max(1000).optional(),
});

const WellnessRuleSchema = z.object({
  conditionType: z.enum(['Stress', 'Anxiety', 'Sleep', 'Mood']),
  minimumValue: z.number().int().min(1).max(10).optional(),
  recommendedGoal: z.string().min(1).max(255),
  recommendedActivity: z.string().min(1).max(255),
  priority: z.enum(['Low', 'Medium', 'High']),
});

function requireParam(c: Context, name: string): string {
  const val = c.req.param(name);
  if (!val) throw new Error(`Missing required route parameter: ${name}`);
  return val;
}

export const MoodTrackingController = {
  async create(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateMoodSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        { error: 'Bad Request', message: parsed.error.flatten().fieldErrors },
        400,
      );
    }

    try {
      const record = await MoodTrackingService.create(user.id, parsed.data);
      return c.json(record, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.create failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async list(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const records = await MoodTrackingService.listForUser(user.id);
      return c.json(records, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.list failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getOne(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const record = await MoodTrackingService.getById(id, user.id);
      if (!record) return c.json({ error: 'Not Found', message: 'Mood record not found.' }, 404);
      return c.json(record, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.getOne failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async completeActivity(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const updated = await MoodTrackingService.markActivityComplete(id, user.id);
      if (!updated) return c.json({ error: 'Not Found', message: 'Mood record not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.completeActivity failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async summary(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const data = await MoodTrackingService.getRecentSummary(user.id);
      return c.json(data, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.summary failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listRules(c: Context<{ Variables: AuthVariables }>) {
    try {
      const rules = await MoodTrackingService.listWellnessRules();
      return c.json(rules, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.listRules failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createRule(c: Context<{ Variables: AuthVariables }>) {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = WellnessRuleSchema.safeParse(rawBody);

    if (!parsed.success) {
      return c.json(
        { error: 'Bad Request', message: parsed.error.flatten().fieldErrors },
        400,
      );
    }

    try {
      const rule = await MoodTrackingService.createWellnessRule(parsed.data);
      return c.json(rule, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'MoodTrackingController.createRule failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
