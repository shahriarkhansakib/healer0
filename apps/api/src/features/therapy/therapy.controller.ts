import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { TherapyService } from './therapy.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

const CreateProgramSchema = z.object({
  title: z.string().min(1).max(255),
  resourceType: z.enum(['Therapy', 'Meditation', 'Exercise', 'Relaxation']),
  category: z.enum(['CBT', 'Anxiety', 'Sleep', 'Focus', 'Stress', 'Depression']),
  description: z.string().min(1).max(2000),
  difficultyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  durationMinutes: z.number().int().min(1).max(300).optional(),
  audioUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
});

const UpdateProgressSchema = z.object({
  progressPercentage: z.number().int().min(0).max(100),
  status: z.enum(['In Progress', 'Completed', 'Skipped']).optional(),
});

export const TherapyController = {
  async listPrograms(c: Context<{ Variables: AuthVariables }>) {
    const category = c.req.query('category');
    const difficultyLevel = c.req.query('difficultyLevel');
    try {
      const programs = await TherapyService.listPrograms({ category, difficultyLevel });
      return c.json(programs, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'TherapyController.listPrograms failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getProgram(c: Context<{ Variables: AuthVariables }>) {
    const id = requireParam(c, 'id');
    try {
      const program = await TherapyService.getProgramById(id);
      if (!program) return c.json({ error: 'Not Found', message: 'Program not found.' }, 404);
      return c.json(program, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'TherapyController.getProgram failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createProgram(c: Context<{ Variables: AuthVariables }>) {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateProgramSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const program = await TherapyService.createProgram(parsed.data);
      return c.json(program, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'TherapyController.createProgram failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async startProgress(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const resourceId = requireParam(c, 'resourceId');
    try {
      const progress = await TherapyService.startProgress(user.id, resourceId);
      return c.json(progress, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'TherapyController.startProgress failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateProgress(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpdateProgressSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const updated = await TherapyService.updateProgress(id, user.id, parsed.data);
      if (!updated) return c.json({ error: 'Not Found', message: 'Progress record not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'TherapyController.updateProgress failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listMyProgress(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const progress = await TherapyService.listProgressForUser(user.id);
      return c.json(progress, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'TherapyController.listMyProgress failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
