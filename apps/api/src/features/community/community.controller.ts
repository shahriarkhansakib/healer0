import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { CommunityService } from './community.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

const CreateGroupSchema = z.object({
  groupName: z.string().min(1).max(255),
  topic: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  avatarEmoji: z.string().max(10).optional(),
  anonymousAllowed: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
});

const JoinGroupSchema = z.object({
  anonymousName: z.string().max(100).optional(),
  avatarColor: z.string().max(50).optional(),
});

const UpdateProfileSchema = z.object({
  anonymousName: z.string().min(1).max(100),
  avatarColor: z.string().max(50).optional(),
});

const SendMessageSchema = z.object({
  messageText: z.string().min(1).max(4000),
  replyToId: z.string().optional(),
  replyToText: z.string().max(300).optional(),
  replyToSender: z.string().max(100).optional(),
});

const UpdateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const CommunityController = {
  async listGroups(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const groups = await CommunityService.listGroups(user.id, user.role);
      return c.json(groups, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listGroups failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getGroup(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'groupId');
    try {
      const group = await CommunityService.getGroupById(id, user.id, user.role);
      if (!group) return c.json({ error: 'Not Found', message: 'Group not found.' }, 404);
      return c.json(group, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.getGroup failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createGroup(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateGroupSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const group = await CommunityService.createGroup(user.id, parsed.data);
      return c.json(group, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.createGroup failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async joinGroup(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = JoinGroupSchema.safeParse(rawBody);
    const customName = parsed.success ? parsed.data.anonymousName : undefined;
    const customColor = parsed.success ? parsed.data.avatarColor : undefined;

    try {
      const member = await CommunityService.joinGroup(groupId, user.id, customName, customColor);
      if (!member) return c.json({ error: 'Not Found', message: 'Group not found.' }, 404);
      return c.json(member, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.joinGroup failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async leaveGroup(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    try {
      const left = await CommunityService.leaveGroup(groupId, user.id);
      if (!left) return c.json({ error: 'Not Found', message: 'Membership not found.' }, 404);
      return c.json({ success: true }, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.leaveGroup failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listPendingRequests(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    try {
      const requests = await CommunityService.listPendingRequests(groupId, user.id, user.role);
      if (requests === null) {
        return c.json({ error: 'Forbidden', message: 'You are not authorized to view join requests.' }, 403);
      }
      return c.json(requests, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listPendingRequests failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async approveMember(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const memberId = requireParam(c, 'memberId');
    try {
      const approved = await CommunityService.approveMember(groupId, memberId, user.id, user.role);
      if (approved === null) {
        return c.json({ error: 'Forbidden', message: 'You are not authorized to approve join requests.' }, 403);
      }
      return c.json(approved, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.approveMember failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async rejectMember(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const memberId = requireParam(c, 'memberId');
    try {
      const rejected = await CommunityService.rejectMember(groupId, memberId, user.id, user.role);
      if (rejected === null) {
        return c.json({ error: 'Forbidden', message: 'You are not authorized to reject join requests.' }, 403);
      }
      return c.json(rejected, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.rejectMember failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateMemberProfile(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpdateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const updated = await CommunityService.updateMemberProfile(
        groupId,
        user.id,
        parsed.data.anonymousName,
        parsed.data.avatarColor,
      );
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.updateMemberProfile failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listMessages(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    try {
      const messages = await CommunityService.listMessages(groupId, user.id, user.role);
      return c.json(messages, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listMessages failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async sendMessage(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = SendMessageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const result = await CommunityService.sendMessage(groupId, user.id, parsed.data, user.role);
      if (!result) return c.json({ error: 'Not Found', message: 'Group not found.' }, 404);
      if ('forbidden' in result && result.forbidden) {
        return c.json({ error: 'Forbidden', message: result.reason }, 403);
      }
      return c.json(result, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.sendMessage failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listMembers(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    try {
      const members = await CommunityService.listMembers(groupId, user.id, user.role);
      if (members === null) {
        return c.json({ error: 'Forbidden', message: 'You are not authorized to view group members.' }, 403);
      }
      return c.json(members, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listMembers failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async kickMember(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const memberId = requireParam(c, 'memberId');
    try {
      const result = await CommunityService.kickMember(groupId, memberId, user.id, user.role);
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : result.error === 'forbidden' ? 403 : 400;
        return c.json({ error: result.error, message: result.message }, status);
      }
      return c.json(result, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.kickMember failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateMemberRole(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const memberId = requireParam(c, 'memberId');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = UpdateMemberRoleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const result = await CommunityService.updateMemberRole(
        groupId,
        memberId,
        parsed.data.role,
        user.id,
        user.role,
      );
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : result.error === 'forbidden' ? 403 : 400;
        return c.json({ error: result.error, message: result.message }, status);
      }
      return c.json(result, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.updateMemberRole failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
