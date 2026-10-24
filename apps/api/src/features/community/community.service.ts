import {
  db,
  communityGroups,
  communityGroupMembers,
  communityMessages,
  eq,
  desc,
  asc,
  and,
  sql,
} from '@healer/db';

const ADJECTIVES = [
  'Gentle', 'Calm', 'Mindful', 'Quiet', 'Patient', 'Peaceful',
  'Brave', 'Serene', 'Tranquil', 'Hopeful', 'Warm', 'Resilient',
  'Kind', 'Radiant', 'Steadfast', 'Compassionate',
];

const NOUNS = [
  'River', 'Sparrow', 'Lotus', 'Breeze', 'Otter', 'Willow',
  'Falcon', 'Harbor', 'Meadow', 'Robin', 'Pebble', 'Cedar',
  'Forest', 'Mountain', 'Cloud', 'Horizon',
];

const AVATAR_COLORS = [
  'emerald', 'sky', 'indigo', 'violet', 'amber', 'rose', 'teal', 'cyan',
];

function generatePseudonym(): { name: string; color: string } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  return { name: `${adj} ${noun}`, color };
}

export type CreateGroupPayload = {
  groupName: string;
  topic: string;
  description?: string;
  avatarEmoji?: string;
  anonymousAllowed?: boolean;
  requiresApproval?: boolean;
  isHidden?: boolean;
  isInviteOnly?: boolean;
};

export type UpdateGroupSettingsPayload = {
  groupName?: string;
  topic?: string;
  description?: string;
  avatarEmoji?: string;
  requiresApproval?: boolean;
  isHidden?: boolean;
  isInviteOnly?: boolean;
};

export type SendMessagePayload = {
  messageText: string;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
};

export const CommunityService = {
  /**
   * List all chat groups with member counts, active membership status,
   * approval requirements, and the latest message snippet.
   */
  async listGroups(userId: string, userRole?: string) {
    const groups = await db.query.communityGroups.findMany({
      orderBy: [desc(communityGroups.createdAt)],
    });

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';

    // Enhance groups with latest message and membership status
    const enhanced = await Promise.all(
      groups.map(async (group) => {
        // Check current user's membership
        let membership = await db.query.communityGroupMembers.findFirst({
          where: and(
            eq(communityGroupMembers.groupId, group.id),
            eq(communityGroupMembers.userId, userId),
          ),
        });

        // Ensure the person who created the group is automatically an admin
        const isCreator = group.creatorId === userId;
        if (isCreator && membership && membership.role !== 'admin') {
          await db
            .update(communityGroupMembers)
            .set({ role: 'admin' })
            .where(eq(communityGroupMembers.id, membership.id));
          membership = { ...membership, role: 'admin' };
        }

        const isGroupAdmin = isSystemAdmin || isCreator || membership?.role === 'admin';

        // Get total active member count
        const members = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(communityGroupMembers)
          .where(
            and(
              eq(communityGroupMembers.groupId, group.id),
              eq(communityGroupMembers.memberStatus, 'Active'),
            ),
          );

        // Get pending requests count if user is admin/creator
        let pendingRequestsCount = 0;
        if (isGroupAdmin) {
          const [pending] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(communityGroupMembers)
            .where(
              and(
                eq(communityGroupMembers.groupId, group.id),
                eq(communityGroupMembers.memberStatus, 'Pending'),
              ),
            );
          pendingRequestsCount = pending?.count ?? 0;
        }

        // Get latest message
        const [lastMsg] = await db
          .select()
          .from(communityMessages)
          .where(
            and(
              eq(communityMessages.groupId, group.id),
              eq(communityMessages.aiModerationStatus, 'Approved'),
            ),
          )
          .orderBy(desc(communityMessages.createdAt))
          .limit(1);

        const memberStatus = membership?.memberStatus ?? null;

        return {
          ...group,
          inviteCode: isGroupAdmin || memberStatus === 'Active' ? group.inviteCode : null,
          isMember: memberStatus === 'Active',
          isPending: memberStatus === 'Pending',
          membershipStatus: memberStatus,
          isGroupAdmin,
          pendingRequestsCount,
          myAnonymousName: membership?.anonymousName ?? null,
          myAvatarColor: membership?.avatarColor ?? null,
          memberCount: members[0]?.count ?? 0,
          latestMessage: lastMsg
            ? {
                text: lastMsg.messageText,
                sender: lastMsg.anonymousName,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      }),
    );

    // Filter out hidden groups unless user is system admin, creator, or active/pending member
    const visibleGroups = enhanced.filter((group) => {
      if (!group.isHidden) return true;
      if (isSystemAdmin) return true;
      if (group.creatorId === userId) return true;
      return group.isMember || group.isPending;
    });

    return visibleGroups;
  },

  /**
   * Get single group details with current user's membership and admin capabilities.
   * If group is hidden, denies access to non-members unless admin/creator.
   */
  async getGroupById(groupId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';

    let membership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    // Ensure the person who created the group is automatically an admin
    const isCreator = group.creatorId === userId;
    if (isCreator && membership && membership.role !== 'admin') {
      await db
        .update(communityGroupMembers)
        .set({ role: 'admin' })
        .where(eq(communityGroupMembers.id, membership.id));
      membership = { ...membership, role: 'admin' };
    }

    const isGroupAdmin = isSystemAdmin || isCreator || membership?.role === 'admin';
    const memberStatus = membership?.memberStatus ?? null;
    const isMember = memberStatus === 'Active';
    const isPending = memberStatus === 'Pending';

    // If group is hidden, deny non-members
    if (group.isHidden && !isSystemAdmin && !isCreator && !isMember && !isPending) {
      return null;
    }

    const members = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(communityGroupMembers)
      .where(
        and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.memberStatus, 'Active'),
        ),
      );

    let pendingRequestsCount = 0;
    if (isGroupAdmin) {
      const [pending] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(communityGroupMembers)
        .where(
          and(
            eq(communityGroupMembers.groupId, groupId),
            eq(communityGroupMembers.memberStatus, 'Pending'),
          ),
        );
      pendingRequestsCount = pending?.count ?? 0;
    }

    return {
      ...group,
      inviteCode: isGroupAdmin || isMember ? group.inviteCode : null,
      isMember,
      isPending,
      membershipStatus: memberStatus,
      isGroupAdmin,
      pendingRequestsCount,
      myAnonymousName: membership?.anonymousName ?? null,
      myAvatarColor: membership?.avatarColor ?? null,
      memberCount: members[0]?.count ?? 0,
    };
  },

  /**
   * Preview a group by its invite code (used for invite links and codes)
   */
  async getGroupByInviteCode(inviteCode: string, userId: string, userRole?: string) {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) return null;

    const group = await db.query.communityGroups.findFirst({
      where: sql`UPPER(${communityGroups.inviteCode}) = ${cleanCode}`,
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    let membership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, group.id),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    if (isCreator && membership && membership.role !== 'admin') {
      await db
        .update(communityGroupMembers)
        .set({ role: 'admin' })
        .where(eq(communityGroupMembers.id, membership.id));
      membership = { ...membership, role: 'admin' };
    }

    const isGroupAdmin = isSystemAdmin || isCreator || membership?.role === 'admin';
    const memberStatus = membership?.memberStatus ?? null;

    const members = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(communityGroupMembers)
      .where(
        and(
          eq(communityGroupMembers.groupId, group.id),
          eq(communityGroupMembers.memberStatus, 'Active'),
        ),
      );

    return {
      id: group.id,
      groupName: group.groupName,
      topic: group.topic,
      description: group.description,
      avatarEmoji: group.avatarEmoji,
      requiresApproval: group.requiresApproval,
      isHidden: group.isHidden,
      isInviteOnly: group.isInviteOnly,
      inviteCode: cleanCode,
      isMember: memberStatus === 'Active',
      isPending: memberStatus === 'Pending',
      membershipStatus: memberStatus,
      isGroupAdmin,
      myAnonymousName: membership?.anonymousName ?? null,
      myAvatarColor: membership?.avatarColor ?? null,
      memberCount: members[0]?.count ?? 0,
    };
  },

  /**
   * Create a chat group and auto-join the creator as active group admin
   */
  async createGroup(userId: string, payload: CreateGroupPayload) {
    const isHidden = payload.isHidden ?? false;
    const isInviteOnly = payload.isInviteOnly ?? (isHidden ? true : false);
    const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    const [group] = await db
      .insert(communityGroups)
      .values({
        groupName: payload.groupName,
        topic: payload.topic,
        description: payload.description ?? null,
        avatarEmoji: payload.avatarEmoji ?? '💬',
        anonymousAllowed: payload.anonymousAllowed ?? true,
        requiresApproval: payload.requiresApproval ?? false,
        isHidden,
        isInviteOnly,
        inviteCode,
        creatorId: userId,
      })
      .returning();

    // Auto-join creator as an active group admin
    const generated = generatePseudonym();
    const [member] = await db
      .insert(communityGroupMembers)
      .values({
        groupId: group.id,
        userId,
        anonymousName: generated.name,
        avatarColor: generated.color,
        memberStatus: 'Active',
        role: 'admin',
      })
      .returning();

    return {
      ...group,
      isMember: true,
      isPending: false,
      membershipStatus: 'Active',
      isGroupAdmin: true,
      pendingRequestsCount: 0,
      myAnonymousName: member.anonymousName,
      myAvatarColor: member.avatarColor,
      memberCount: 1,
      latestMessage: null,
    };
  },

  /**
   * Update chat group settings (e.g. toggle hidden, invite-only, approval, name, topic)
   */
  async updateGroupSettings(
    groupId: string,
    userId: string,
    payload: UpdateGroupSettingsPayload,
    userRole?: string,
  ) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) {
      return { error: 'not_found' as const, message: 'Chat group not found.' };
    }

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    const isGroupAdmin = isSystemAdmin || isCreator || myMembership?.role === 'admin';
    if (!isGroupAdmin) {
      return { error: 'forbidden' as const, message: 'Only group admins can update room settings.' };
    }

    const updates: Partial<typeof communityGroups.$inferInsert> = {};
    if (payload.groupName !== undefined) updates.groupName = payload.groupName.trim();
    if (payload.topic !== undefined) updates.topic = payload.topic.trim();
    if (payload.description !== undefined) updates.description = payload.description.trim() || null;
    if (payload.avatarEmoji !== undefined) updates.avatarEmoji = payload.avatarEmoji;
    if (payload.requiresApproval !== undefined) updates.requiresApproval = payload.requiresApproval;
    if (payload.isHidden !== undefined) updates.isHidden = payload.isHidden;
    if (payload.isInviteOnly !== undefined) updates.isInviteOnly = payload.isInviteOnly;

    // If setting to hidden without specifying isInviteOnly, keep group invite-only
    if (payload.isHidden === true && payload.isInviteOnly === undefined && !group.isInviteOnly) {
      updates.isInviteOnly = true;
    }

    const [updated] = await db
      .update(communityGroups)
      .set(updates)
      .where(eq(communityGroups.id, groupId))
      .returning();

    return {
      success: true,
      message: 'Group settings updated successfully.',
      group: updated,
    };
  },

  /**
   * Regenerate invite code for the group
   */
  async regenerateInviteCode(groupId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) {
      return { error: 'not_found' as const, message: 'Chat group not found.' };
    }

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    const isGroupAdmin = isSystemAdmin || isCreator || myMembership?.role === 'admin';
    if (!isGroupAdmin) {
      return { error: 'forbidden' as const, message: 'Only group admins can regenerate the invite code.' };
    }

    const newInviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    const [updated] = await db
      .update(communityGroups)
      .set({ inviteCode: newInviteCode })
      .where(eq(communityGroups.id, groupId))
      .returning();

    return {
      success: true,
      message: 'Invite code regenerated successfully.',
      inviteCode: updated.inviteCode,
    };
  },

  /**
   * Join or request to join a chat group.
   * If group is invite-only, a matching invite code must be provided (unless creator/admin).
   * If group requires approval, user status becomes 'Pending'.
   * If not, user status becomes 'Active'.
   */
  async joinGroup(
    groupId: string,
    userId: string,
    customName?: string,
    customColor?: string,
    inviteCode?: string,
    userRole?: string,
  ) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const existing = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    const isExistingActive = existing && (existing.memberStatus === 'Active' || existing.memberStatus === 'Pending');

    // Enforce invite-only rule if not creator, not admin, and not already an active/pending member
    if (group.isInviteOnly && !isCreator && !isSystemAdmin && !isExistingActive) {
      const codeMatches =
        inviteCode &&
        group.inviteCode &&
        inviteCode.trim().toUpperCase() === group.inviteCode.trim().toUpperCase();

      if (!codeMatches) {
        return {
          error: 'forbidden' as const,
          message: 'This group is invite-only. A valid invite code or invitation link is required to join.',
        };
      }
    }

    const targetStatus = group.requiresApproval && !isCreator ? 'Pending' : 'Active';

    if (existing) {
      if (existing.memberStatus === 'Active' || existing.memberStatus === 'Pending') {
        if (isCreator && existing.role !== 'admin') {
          const [updated] = await db
            .update(communityGroupMembers)
            .set({ role: 'admin' })
            .where(eq(communityGroupMembers.id, existing.id))
            .returning();
          return updated;
        }
        return existing;
      }

      // Reactivate membership or re-submit request
      const [updated] = await db
        .update(communityGroupMembers)
        .set({
          memberStatus: targetStatus,
          role: isCreator ? 'admin' : existing.role,
        })
        .where(eq(communityGroupMembers.id, existing.id))
        .returning();
      return updated;
    }

    const generated = generatePseudonym();
    const anonymousName = customName?.trim() || generated.name;
    const avatarColor = customColor?.trim() || generated.color;

    const [member] = await db
      .insert(communityGroupMembers)
      .values({
        groupId,
        userId,
        anonymousName,
        avatarColor,
        memberStatus: targetStatus,
        role: isCreator ? 'admin' : 'member',
      })
      .returning();
    return member;
  },

  /**
   * Join a chat group directly using an invite code
   */
  async joinGroupByCode(
    inviteCode: string,
    userId: string,
    customName?: string,
    customColor?: string,
    userRole?: string,
  ) {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      return { error: 'bad_request' as const, message: 'Invite code is required.' };
    }

    const group = await db.query.communityGroups.findFirst({
      where: sql`UPPER(${communityGroups.inviteCode}) = ${cleanCode}`,
    });
    if (!group) {
      return { error: 'not_found' as const, message: 'Invalid or expired invite code.' };
    }

    return this.joinGroup(group.id, userId, customName, customColor, cleanCode, userRole);
  },

  /**
   * Leave a chat group (or cancel pending join request)
   */
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
      .where(eq(communityGroupMembers.id, existing.id));
    return true;
  },

  /**
   * List pending join requests for a group (accessible to creator or admin)
   */
  async listPendingRequests(groupId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    if (!isSystemAdmin && !isCreator && myMembership?.role !== 'admin') {
      return null;
    }

    const pendingMembers = await db.query.communityGroupMembers.findMany({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.memberStatus, 'Pending'),
      ),
      orderBy: [desc(communityGroupMembers.createdAt)],
    });

    return pendingMembers;
  },

  /**
   * Approve a pending join request
   */
  async approveMember(groupId: string, memberId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    if (!isSystemAdmin && !isCreator && myMembership?.role !== 'admin') {
      return null;
    }

    const [approved] = await db
      .update(communityGroupMembers)
      .set({ memberStatus: 'Active' })
      .where(
        and(
          eq(communityGroupMembers.id, memberId),
          eq(communityGroupMembers.groupId, groupId),
        ),
      )
      .returning();

    return approved;
  },

  /**
   * Reject a pending join request
   */
  async rejectMember(groupId: string, memberId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    if (!isSystemAdmin && !isCreator && myMembership?.role !== 'admin') {
      return null;
    }

    const [rejected] = await db
      .update(communityGroupMembers)
      .set({ memberStatus: 'Rejected' })
      .where(
        and(
          eq(communityGroupMembers.id, memberId),
          eq(communityGroupMembers.groupId, groupId),
        ),
      )
      .returning();

    return rejected;
  },

  /**
   * Update the user's anonymous pseudonym or avatar color for this chat room
   */
  async updateMemberProfile(
    groupId: string,
    userId: string,
    anonymousName: string,
    avatarColor?: string,
  ) {
    const existing = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });
    if (!existing) {
      return this.joinGroup(groupId, userId, anonymousName, avatarColor);
    }

    const [updated] = await db
      .update(communityGroupMembers)
      .set({
        anonymousName: anonymousName.trim(),
        avatarColor: avatarColor || existing.avatarColor || 'sky',
      })
      .where(eq(communityGroupMembers.id, existing.id))
      .returning();
    return updated;
  },

  /**
   * List all active members in a group.
   * Accessible to active group members, creators, or system admins.
   */
  async listMembers(groupId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    if (!isSystemAdmin && !isCreator && myMembership?.memberStatus !== 'Active') {
      return null;
    }

    const members = await db.query.communityGroupMembers.findMany({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.memberStatus, 'Active'),
      ),
      orderBy: [asc(communityGroupMembers.createdAt)],
    });

    return members.map((m) => {
      const isCreator = group.creatorId === m.userId;
      const role = isCreator ? 'admin' : m.role;
      return {
        id: m.id,
        userId: m.userId,
        anonymousName: m.anonymousName || 'Anonymous Member',
        avatarColor: m.avatarColor || 'sky',
        role,
        joinedDate: m.joinedDate,
        createdAt: m.createdAt,
        isCreator,
        isMe: m.userId === userId,
      };
    });
  },

  /**
   * Kick / remove a user from the group.
   * Only permitted for group creator, group admins, or system admins.
   */
  async kickMember(groupId: string, memberId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) {
      return { error: 'not_found' as const, message: 'Chat group not found.' };
    }

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    const isGroupAdmin = isSystemAdmin || isCreator || myMembership?.role === 'admin';
    if (!isGroupAdmin) {
      return { error: 'forbidden' as const, message: 'Only group admins can remove members.' };
    }

    const targetMember = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.id, memberId),
        eq(communityGroupMembers.groupId, groupId),
      ),
    });

    if (!targetMember || targetMember.memberStatus !== 'Active') {
      return { error: 'not_found' as const, message: 'Member is not active in this group.' };
    }

    if (targetMember.userId === userId) {
      return { error: 'bad_request' as const, message: 'You cannot kick yourself from the group. Use Leave Group instead.' };
    }

    if (targetMember.userId === group.creatorId && !isSystemAdmin) {
      return { error: 'forbidden' as const, message: 'The group creator cannot be removed by other admins.' };
    }

    await db
      .update(communityGroupMembers)
      .set({ memberStatus: 'Left' })
      .where(eq(communityGroupMembers.id, memberId));

    const adminName = myMembership?.anonymousName || (isSystemAdmin ? 'System Administrator' : 'Group Admin');
    const targetName = targetMember.anonymousName || 'Anonymous Member';

    await db.insert(communityMessages).values({
      groupId,
      userId,
      anonymousName: 'System',
      avatarColor: 'rose',
      messageText: `${targetName} was removed from the group by ${adminName}.`,
      messageType: 'system',
      aiModerationStatus: 'Approved',
    });

    return {
      success: true,
      message: `${targetName} was removed from the group.`,
      kickedMemberId: memberId,
    };
  },

  /**
   * Choose another user as admin (promote) or remove admin status (demote).
   * Only permitted for group creator, group admins, or system admins.
   */
  async updateMemberRole(
    groupId: string,
    memberId: string,
    newRole: 'admin' | 'member',
    userId: string,
    userRole?: string,
  ) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) {
      return { error: 'not_found' as const, message: 'Chat group not found.' };
    }

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isCreator = group.creatorId === userId;

    const myMembership = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.groupId, groupId),
        eq(communityGroupMembers.userId, userId),
      ),
    });

    const isGroupAdmin = isSystemAdmin || isCreator || myMembership?.role === 'admin';
    if (!isGroupAdmin) {
      return { error: 'forbidden' as const, message: 'Only group admins can assign or change admin roles.' };
    }

    const targetMember = await db.query.communityGroupMembers.findFirst({
      where: and(
        eq(communityGroupMembers.id, memberId),
        eq(communityGroupMembers.groupId, groupId),
      ),
    });

    if (!targetMember || targetMember.memberStatus !== 'Active') {
      return { error: 'not_found' as const, message: 'Member is not active in this group.' };
    }

    if (targetMember.userId === group.creatorId && newRole === 'member' && !isSystemAdmin) {
      return { error: 'forbidden' as const, message: 'The group creator role cannot be demoted.' };
    }

    if (targetMember.userId === userId && newRole === 'member' && !isSystemAdmin) {
      const otherAdmins = await db.query.communityGroupMembers.findMany({
        where: and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.memberStatus, 'Active'),
          eq(communityGroupMembers.role, 'admin'),
        ),
      });
      const hasOtherAdmin = otherAdmins.some((m) => m.userId !== userId) || (group.creatorId !== null && group.creatorId !== userId);
      if (!hasOtherAdmin) {
        return { error: 'bad_request' as const, message: 'You must assign another admin before removing your own admin privileges.' };
      }
    }

    const [updated] = await db
      .update(communityGroupMembers)
      .set({ role: newRole })
      .where(eq(communityGroupMembers.id, memberId))
      .returning();

    const adminName = myMembership?.anonymousName || (isSystemAdmin ? 'System Administrator' : 'Group Admin');
    const targetName = targetMember.anonymousName || 'Anonymous Member';
    const roleLabel = newRole === 'admin' ? 'Group Admin' : 'Member';

    await db.insert(communityMessages).values({
      groupId,
      userId,
      anonymousName: 'System',
      avatarColor: newRole === 'admin' ? 'amber' : 'sky',
      messageText: `${targetName} was chosen as ${roleLabel} by ${adminName}.`,
      messageType: 'system',
      aiModerationStatus: 'Approved',
    });

    return {
      success: true,
      message: `${targetName} is now a ${roleLabel}.`,
      member: updated,
    };
  },


  /**
   * List recent chat messages for a group in chronological order
   */
  async listMessages(groupId: string, userId: string, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return [];

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';

    // If group requires approval, is invite-only, or is hidden, verify active membership
    if (
      (group.requiresApproval || group.isInviteOnly || group.isHidden) &&
      !isSystemAdmin &&
      group.creatorId !== userId
    ) {
      const membership = await db.query.communityGroupMembers.findFirst({
        where: and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.userId, userId),
        ),
      });

      if (!membership || membership.memberStatus !== 'Active') {
        return [];
      }
    }

    const messages = await db.query.communityMessages.findMany({
      where: and(
        eq(communityMessages.groupId, groupId),
        eq(communityMessages.aiModerationStatus, 'Approved'),
      ),
      orderBy: [asc(communityMessages.createdAt)],
      limit: 100,
    });
    return messages;
  },

  /**
   * Send a chat message into the group.
   * Auto-joins the user if the group is open, or enforces active status if approval/invite is required.
   */
  async sendMessage(groupId: string, userId: string, payload: SendMessagePayload, userRole?: string) {
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });
    if (!group) return null;

    let membership: (typeof communityGroupMembers.$inferSelect) | null | undefined =
      await db.query.communityGroupMembers.findFirst({
        where: and(
          eq(communityGroupMembers.groupId, groupId),
          eq(communityGroupMembers.userId, userId),
        ),
      });

    const isSystemAdmin = userRole === 'admin' || userRole === 'super_admin';

    // If group requires approval, is invite-only, or is hidden, enforce active membership
    if (
      (group.requiresApproval || group.isInviteOnly || group.isHidden) &&
      !isSystemAdmin &&
      group.creatorId !== userId
    ) {
      if (!membership || membership.memberStatus !== 'Active') {
        const reason = group.isInviteOnly
          ? 'This group is invite-only. You must join via invite code before sending messages.'
          : group.isHidden
          ? 'This group is hidden. You must be an active member to send messages.'
          : 'This group requires administrator approval. Your membership is pending or unapproved.';
        return {
          forbidden: true,
          reason,
        };
      }
    }

    if (!membership || membership.memberStatus !== 'Active') {
      const joinRes = await this.joinGroup(groupId, userId, undefined, undefined, undefined, userRole);
      if (joinRes && 'id' in joinRes) {
        membership = joinRes;
      }
    }

    if (!membership || membership.memberStatus !== 'Active') {
      return {
        forbidden: true,
        reason: 'Membership is pending approval or an invite code is required.',
      };
    }

    const anonymousName = membership.anonymousName || 'Anonymous Member';
    const avatarColor = membership.avatarColor || 'sky';

    // Deterministic AI Safety & Crisis Moderation
    const moderation = moderateMessage(payload.messageText);

    const [msg] = await db
      .insert(communityMessages)
      .values({
        groupId,
        userId,
        anonymousName,
        avatarColor,
        messageText: payload.messageText,
        messageType: 'text',
        replyToId: payload.replyToId ?? null,
        replyToText: payload.replyToText ?? null,
        replyToSender: payload.replyToSender ?? null,
        aiModerationStatus: moderation.status,
      })
      .returning();

    return {
      message: msg,
      moderationFlagged: moderation.status !== 'Approved',
      crisisGuidance: moderation.crisisGuidance,
    };
  },
};

/**
 * Hospital-grade deterministic safety filter:
 * Scans message content for self-harm and acute crisis triggers.
 */
function moderateMessage(text: string): {
  status: 'Approved' | 'Review' | 'Blocked';
  crisisGuidance?: string;
} {
  const crisisKeywords = [
    'kill myself',
    'end my life',
    'want to die',
    'suicide',
    'self-harm',
    'hurt myself',
    'overdose',
  ];

  const lower = text.toLowerCase();
  const hasCrisis = crisisKeywords.some((kw) => lower.includes(kw));

  if (hasCrisis) {
    return {
      status: 'Review',
      crisisGuidance:
        'If you or someone you know is struggling or in crisis, help is available. You can call or text 988 in the US/Canada, or reach emergency services immediately.',
    };
  }

  return { status: 'Approved' };
}
