import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
} from '../../infra/middleware';
import { CommunityController } from './community.controller';

const communityRouter = new Hono();

communityRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

// Group catalogue & creation — accessible to authenticated patients
communityRouter.get('/groups', CommunityController.listGroups);
communityRouter.get('/groups/by-invite/:inviteCode', CommunityController.getGroupByInviteCode);
communityRouter.post('/groups/join-by-code', CommunityController.joinGroupByCode);
communityRouter.get('/groups/:groupId', CommunityController.getGroup);
communityRouter.post('/groups', CommunityController.createGroup);
communityRouter.patch('/groups/:groupId/settings', CommunityController.updateGroupSettings);
communityRouter.post('/groups/:groupId/regenerate-invite-code', CommunityController.regenerateInviteCode);

// Membership, approval & anonymous pseudonym management
communityRouter.post('/groups/:groupId/join', CommunityController.joinGroup);
communityRouter.post('/groups/:groupId/leave', CommunityController.leaveGroup);
communityRouter.patch('/groups/:groupId/profile', CommunityController.updateMemberProfile);

// Admin / Creator Member Approval workflows
communityRouter.get('/groups/:groupId/pending-requests', CommunityController.listPendingRequests);
communityRouter.post('/groups/:groupId/members/:memberId/approve', CommunityController.approveMember);
communityRouter.post('/groups/:groupId/members/:memberId/reject', CommunityController.rejectMember);

// Group members roster & Admin moderation (Kick user, assign/choose admin role)
communityRouter.get('/groups/:groupId/members', CommunityController.listMembers);
communityRouter.post('/groups/:groupId/members/:memberId/kick', CommunityController.kickMember);
communityRouter.post('/groups/:groupId/members/:memberId/role', CommunityController.updateMemberRole);

// Real-time / polling chat messages within a group
communityRouter.get('/groups/:groupId/messages', CommunityController.listMessages);
communityRouter.post('/groups/:groupId/messages', CommunityController.sendMessage);

export { communityRouter };
