import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const communityGroups = pgTable('community_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupName: text('group_name').notNull(),
  topic: text('topic').notNull(), // 'Anxiety Recovery', 'Academic Pressure', 'Sleep Improvement', etc.
  description: text('description'),
  avatarEmoji: text('avatar_emoji').default('💬'),
  anonymousAllowed: boolean('anonymous_allowed').default(true).notNull(),
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  creatorId: text('creator_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const communityGroupMembers = pgTable('community_group_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id').notNull().references(() => communityGroups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  anonymousName: text('anonymous_name'),
  avatarColor: text('avatar_color'),
  joinedDate: timestamp('joined_date', { mode: 'date' }).defaultNow().notNull(),
  memberStatus: text('member_status').default('Active').notNull(), // 'Active', 'Pending', 'Left', 'Blocked', 'Rejected'
  role: text('role').default('member').notNull(), // 'admin', 'member'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const communityMessages = pgTable('community_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id').notNull().references(() => communityGroups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  anonymousName: text('anonymous_name').notNull().default('Anonymous Member'),
  avatarColor: text('avatar_color').default('sky').notNull(),
  messageText: text('message_text').notNull(),
  messageType: text('message_type').default('text').notNull(), // 'text', 'system'
  replyToId: text('reply_to_id'),
  replyToText: text('reply_to_text'),
  replyToSender: text('reply_to_sender'),
  aiModerationStatus: text('ai_moderation_status').default('Approved').notNull(), // 'Approved', 'Review', 'Blocked'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CommunityGroup = typeof communityGroups.$inferSelect;
export type NewCommunityGroup = typeof communityGroups.$inferInsert;
export type CommunityGroupMember = typeof communityGroupMembers.$inferSelect;
export type NewCommunityGroupMember = typeof communityGroupMembers.$inferInsert;
export type CommunityMessage = typeof communityMessages.$inferSelect;
export type NewCommunityMessage = typeof communityMessages.$inferInsert;
