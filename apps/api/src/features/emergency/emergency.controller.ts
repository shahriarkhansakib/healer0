import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { EmergencyService } from './emergency.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

const ReportCrisisSchema = z.object({
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  detectedIssue: z.string().min(1).max(1000),
});

const CreateTrustedContactSchema = z.object({
  contactName: z.string().min(1).max(255),
  relationship: z.string().min(1).max(100),
  phoneNumber: z.string().min(5).max(20),
  email: z.string().email().optional(),
  emergencyAlertPermission: z.boolean().optional(),
});

export const EmergencyController = {
  async reportCrisis(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = ReportCrisisSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const event = await EmergencyService.reportCrisis(user.id, parsed.data);
      return c.json(event, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'EmergencyController.reportCrisis failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listMyCrisisEvents(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const events = await EmergencyService.listCrisisEventsForUser(user.id);
      return c.json(events, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'EmergencyController.listMyCrisisEvents failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listAllCrisisEvents(c: Context<{ Variables: AuthVariables }>) {
    try {
      const events = await EmergencyService.listAllCrisisEvents();
      return c.json(events, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'EmergencyController.listAllCrisisEvents failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createTrustedContact(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateTrustedContactSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const contact = await EmergencyService.createTrustedContact(user.id, parsed.data);
      return c.json(contact, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'EmergencyController.createTrustedContact failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listTrustedContacts(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const contacts = await EmergencyService.listTrustedContacts(user.id);
      return c.json(contacts, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'EmergencyController.listTrustedContacts failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async deleteTrustedContact(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const deleted = await EmergencyService.deleteTrustedContact(id, user.id);
      if (!deleted) return c.json({ error: 'Not Found', message: 'Contact not found.' }, 404);
      return c.json({ success: true }, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'EmergencyController.deleteTrustedContact failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
