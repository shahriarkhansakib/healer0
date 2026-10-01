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
  anonymousAllowed: z.boolean().optional(),
});

const CreatePostSchema = z.object({
  postContent: z.string().min(1).max(5000),
  anonymousName: z.string().max(100).optional(),
});

const CreateCommentSchema = z.object({
  commentText: z.string().min(1).max(2000),
  parentCommentId: z.string().optional(),
});

export const CommunityController = {
  async listGroups(c: Context<{ Variables: AuthVariables }>) {
    try {
      const groups = await CommunityService.listGroups();
      return c.json(groups, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listGroups failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getGroup(c: Context<{ Variables: AuthVariables }>) {
    const id = requireParam(c, 'groupId');
    try {
      const group = await CommunityService.getGroupById(id);
      if (!group) return c.json({ error: 'Not Found', message: 'Group not found.' }, 404);
      return c.json(group, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.getGroup failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createGroup(c: Context<{ Variables: AuthVariables }>) {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateGroupSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const group = await CommunityService.createGroup(parsed.data);
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
    try {
      const member = await CommunityService.joinGroup(groupId, user.id);
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

  async createPost(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const groupId = requireParam(c, 'groupId');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreatePostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const post = await CommunityService.createPost(groupId, user.id, parsed.data);
      if (!post) return c.json({ error: 'Forbidden', message: 'You are not an active member of this group.' }, 403);
      return c.json(post, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.createPost failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listPosts(c: Context<{ Variables: AuthVariables }>) {
    const groupId = requireParam(c, 'groupId');
    try {
      const posts = await CommunityService.listPostsForGroup(groupId);
      return c.json(posts, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listPosts failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async likePost(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const postId = requireParam(c, 'postId');
    try {
      const result = await CommunityService.likePost(postId, user.id);
      return c.json(result, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.likePost failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createComment(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const postId = requireParam(c, 'postId');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateCommentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const comment = await CommunityService.createComment(postId, user.id, parsed.data);
      return c.json(comment, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.createComment failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listComments(c: Context<{ Variables: AuthVariables }>) {
    const postId = requireParam(c, 'postId');
    try {
      const comments = await CommunityService.listCommentsForPost(postId);
      return c.json(comments, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'CommunityController.listComments failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
