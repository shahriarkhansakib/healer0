import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { PrivacyService } from './privacy.service';
import { logger } from '../../infra/lib/logger';

const UpsertConsentSchema = z.object({
  consentType: z.enum(['AI Memory', 'Research Participation', 'Data Sharing']),
  accepted: z.boolean(),
});

export const PrivacyController = {
  async listConsents(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const consents = await PrivacyService.listConsentsForUser(user.id);
      return c.json(consents, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'PrivacyController.listConsents failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async upsertConsent(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpsertConsentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const consent = await PrivacyService.upsertConsent(
        user.id,
        parsed.data.consentType,
        parsed.data.accepted,
      );
      return c.json(consent, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'PrivacyController.upsertConsent failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async provisionDefaults(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const records = await PrivacyService.provisionDefaultConsents(user.id);
      return c.json(records, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'PrivacyController.provisionDefaults failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
