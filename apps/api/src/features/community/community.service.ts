import {
  db,
  communityGroups,
  communityGroupMembers,
  communityPosts,
  communityPostLikes,
  communityComments,
  eq,
  desc,
  and,
} from '@healer/db';

export type CreateGroupPayload = {
  groupName: string;
  topic: string;
  description?: string;
  anonymousAllowed?: boolean;
};

export type CreatePostPayload = {
  postContent: string;
  anonymousName?: string;
};

export type CreateCommentPayload = {
  commentText: string;
  parentCommentId?: string;
};

export const CommunityService = {
  async listGroups() {
    return db.query.communityGroups.findMany({
      orderBy: [desc(communityGroups.createdAt)],
    });
  },

  async getGroupById(id: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, id),
    });
    return group ?? null;
  },

  async createGroup(payload: CreateGroupPayload) {
    const [group] = await db
      .insert(communityGroups)
      .values({
        groupName: payload.groupName,
        topic: payload.topic,
        description: payload.description ?? null,
        anonymousAllowed: payload.anonymousAllowed ?? true,
      })
      .returning();
    return group;
  },

  async joinGroup(groupId: string, userId: string) {
    const existing = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });
    if (existing) return existing;

    const [member] = await db
      .insert(communityGroupMembers)
      .values({ groupId, userId, memberStatus: 'Active' })
      .returning();
    return member;
  },

  async leaveGroup(groupId: string, userId: string) {
    const existing = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
      columns: { id: true },
    });
    if (!existing) return false;

    await db
      .update(communityGroupMembers)
      .set({ memberStatus: 'Left' })
      .where(
        and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.userId, userId),
        ),
      );
    return true;
  },

  async createPost(groupId: string, userId: string, payload: CreatePostPayload) {
    // Verify the user is an active member before posting.
    const member = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });
    if (!member || member.memberStatus !== 'Active') return null;

    // Deterministic AI moderation: block posts containing flagged crisis keywords.
    const aiModerationStatus = moderateContent(payload.postContent);

    const [post] = await db
      .insert(communityPosts)
      .values({
        groupId,
        userId,
        anonymousName: payload.anonymousName ?? null,
        postContent: payload.postContent,
        aiModerationStatus,
      })
      .returning();
    return post;
  },

  async listPostsForGroup(groupId: string) {
    return db.query.communityPosts.findMany({
      where: and(
        eq(communityPosts.groupId, groupId),
        eq(communityPosts.aiModerationStatus, 'Approved'),
      ),
      orderBy: [desc(communityPosts.createdAt)],
    });
  },

  async likePost(postId: string, userId: string) {
    const existing = await db.query.communityPostLikes.findFirst({
      where: and(
        eq(communityPostLikes.postId, postId),
        eq(communityPostLikes.userId, userId),
      ),
      columns: { id: true },
    });
    if (existing) return { alreadyLiked: true };

    const [like] = await db
      .insert(communityPostLikes)
      .values({ postId, userId })
      .returning();
    return { alreadyLiked: false, like };
  },

  async createComment(postId: string, userId: string, payload: CreateCommentPayload) {
    const aiModerationStatus = moderateContent(payload.commentText);

    const [comment] = await db
      .insert(communityComments)
      .values({
        postId,
        userId,
        commentText: payload.commentText,
        parentCommentId: payload.parentCommentId ?? null,
        aiModerationStatus,
      })
      .returning();
    return comment;
  },

  async listCommentsForPost(postId: string) {
    return db.query.communityComments.findMany({
      where: and(
        eq(communityComments.postId, postId),
        eq(communityComments.aiModerationStatus, 'Approved'),
      ),
      orderBy: [desc(communityComments.createdAt)],
    });
  },
};

/**
 * Deterministic AI content moderation — scans for flagged keywords and
 * sets moderation status accordingly. In production, this would delegate
 * to a classifier; here it is rule-based for auditability.
 */
function moderateContent(text: string): string {
  const flaggedKeywords = [
    'kill myself',
    'end my life',
    'suicide',
    'self-harm',
    'hurt myself',
    'overdose',
  ];
  const lower = text.toLowerCase();
  const hasFlag = flaggedKeywords.some((kw) => lower.includes(kw));
  return hasFlag ? 'Review' : 'Approved';
}
