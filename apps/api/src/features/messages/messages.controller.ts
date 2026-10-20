import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { MessagesService } from './messages.service';
import { logger } from '../../infra/lib/logger';

const SendMessageSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required.'),
  messageText: z.string().min(1, 'Message cannot be empty.').max(3000, 'Message is too long.'),
  attachmentUrl: z.string().url().optional(),
});

export const MessagesController = {
  async listConversations(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
    }

    try {
      const conversations = await MessagesService.listConversationsForUser(user.id, user.role || 'patient');
      return c.json({ data: conversations }, 200);
    } catch (err: unknown) {
      logger.error({ err, userId: user.id }, 'MessagesController.listConversations failed');
      const message = err instanceof Error ? err.message : 'Failed to retrieve conversations.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getThread(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
    }

    const otherUserId = c.req.param('otherUserId');
    if (!otherUserId) {
      return c.json({ error: 'Bad Request', message: 'Target user ID is required.' }, 400);
    }

    try {
      const thread = await MessagesService.getThreadMessages(user.id, otherUserId);
      return c.json({ data: thread }, 200);
    } catch (err: unknown) {
      logger.error({ err, userId: user.id, otherUserId }, 'MessagesController.getThread failed');
      const message = err instanceof Error ? err.message : 'Failed to retrieve thread.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async send(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
    }

    try {
      const body = await c.req.json();
      const parsed = SendMessageSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          {
            error: 'Unprocessable Entity',
            message: parsed.error.errors.map((e) => e.message).join(' '),
          },
          422
        );
      }

      const role = user.role === 'doctor' ? 'doctor' : 'patient';
      const created = await MessagesService.sendMessage(
        user.id,
        role,
        parsed.data.targetUserId,
        parsed.data.messageText,
        parsed.data.attachmentUrl
      );

      return c.json({ data: created }, 201);
    } catch (err: unknown) {
      logger.error({ err, userId: user.id }, 'MessagesController.send failed');
      const message = err instanceof Error ? err.message : 'Failed to send message.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getUnreadCount(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    if (!user?.id) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
    }

    try {
      const count = await MessagesService.getUnreadCount(user.id);
      return c.json({ data: { unreadCount: count } }, 200);
    } catch (err: unknown) {
      logger.error({ err, userId: user.id }, 'MessagesController.getUnreadCount failed');
      return c.json({ data: { unreadCount: 0 } }, 200);
    }
  },
};
