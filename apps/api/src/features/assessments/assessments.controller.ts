import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { AssessmentsService } from './assessments.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

const CreateAssessmentSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.enum(['Depression', 'Anxiety', 'Stress', 'Personality', 'Emotional Intelligence']),
  description: z.string().min(1).max(2000),
  questions: z
    .array(
      z.object({
        questionText: z.string().min(1).max(1000),
        optionA: z.string().min(1).max(255),
        optionB: z.string().min(1).max(255),
        optionC: z.string().min(1).max(255),
        optionD: z.string().min(1).max(255),
        scoreMapping: z.record(z.string(), z.number()),
        orderIndex: z.number().int().min(0),
      }),
    )
    .min(1),
});

const SubmitAssessmentSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export const AssessmentsController = {
  async listAssessments(c: Context<{ Variables: AuthVariables }>) {
    const category = c.req.query('category');
    try {
      const assessments = await AssessmentsService.listAssessments(category);
      return c.json(assessments, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AssessmentsController.listAssessments failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getAssessment(c: Context<{ Variables: AuthVariables }>) {
    const id = requireParam(c, 'id');
    try {
      const assessment = await AssessmentsService.getAssessmentById(id);
      if (!assessment) return c.json({ error: 'Not Found', message: 'Assessment not found.' }, 404);
      return c.json(assessment, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AssessmentsController.getAssessment failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createAssessment(c: Context<{ Variables: AuthVariables }>) {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateAssessmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const assessment = await AssessmentsService.createAssessment(parsed.data);
      return c.json(assessment, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'AssessmentsController.createAssessment failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async submitAssessment(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const assessmentId = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = SubmitAssessmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const result = await AssessmentsService.submitAssessment(user.id, assessmentId, parsed.data);
      if (!result) return c.json({ error: 'Not Found', message: 'Assessment not found.' }, 404);
      return c.json(result, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'AssessmentsController.submitAssessment failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listMyResults(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const results = await AssessmentsService.listResultsForUser(user.id);
      return c.json(results, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AssessmentsController.listMyResults failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getMyResult(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const result = await AssessmentsService.getResultById(id, user.id);
      if (!result) return c.json({ error: 'Not Found', message: 'Result not found.' }, 404);
      return c.json(result, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AssessmentsController.getMyResult failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
