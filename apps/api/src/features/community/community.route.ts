import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { CommunityController } from './community.controller';

const communityRouter = new Hono();

communityRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

// Group catalogue — readable by all authenticated patients.
communityRouter.get('/groups', CommunityController.listGroups);
communityRouter.get('/groups/:groupId', CommunityController.getGroup);

// Group creation is admin-curated to prevent spam communities.
communityRouter.post('/groups', requireRole('admin'), CommunityController.createGroup);

// Membership management — patient-scoped.
communityRouter.post('/groups/:groupId/join', CommunityController.joinGroup);
communityRouter.post('/groups/:groupId/leave', CommunityController.leaveGroup);

// Posts within a group.
communityRouter.get('/groups/:groupId/posts', CommunityController.listPosts);
communityRouter.post('/groups/:groupId/posts', CommunityController.createPost);

// Likes and comments on posts.
communityRouter.post('/posts/:postId/like', CommunityController.likePost);
communityRouter.get('/posts/:postId/comments', CommunityController.listComments);
communityRouter.post('/posts/:postId/comments', CommunityController.createComment);

export { communityRouter };
