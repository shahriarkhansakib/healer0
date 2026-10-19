import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { AccountService } from './account.service';
import { logger } from '../../infra/lib/logger';

const UpdateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  profileImage: z.string().url().optional(),
});

const UpdatePreferencesSchema = z.object({
  aiMemoryEnabled: z.boolean().optional(),
  moodTrackingEnabled: z.boolean().optional(),
  anonymousMode: z.boolean().optional(),
  notificationEnabled: z.boolean().optional(),
});

export const AccountController = {
  async getProfile(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const data = await AccountService.getProfile(user.id);
      return c.json(data, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AccountController.getProfile failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateProfile(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpdateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }

    try {
      const updated = await AccountService.updateProfile(user.id, parsed.data);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AccountController.updateProfile failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getPreferences(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const data = await AccountService.getPreferences(user.id);
      return c.json(data, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AccountController.getPreferences failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updatePreferences(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpdatePreferencesSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }

    try {
      const updated = await AccountService.updatePreferences(user.id, parsed.data);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AccountController.updatePreferences failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
