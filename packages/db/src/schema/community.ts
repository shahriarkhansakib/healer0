import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const communityGroups = pgTable('community_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupName: text('group_name').notNull(),
  topic: text('topic').notNull(), // 'Anxiety Recovery', 'Academic Pressure', 'Sleep Improvement'
  description: text('description'),
  anonymousAllowed: boolean('anonymous_allowed').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const communityGroupMembers = pgTable('community_group_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id').notNull().references(() => communityGroups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedDate: timestamp('joined_date', { mode: 'date' }).defaultNow().notNull(),
  memberStatus: text('member_status').default('Active').notNull(), // 'Active', 'Left', 'Blocked'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const communityPosts = pgTable('community_posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id').notNull().references(() => communityGroups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  anonymousName: text('anonymous_name'),
  postContent: text('post_content').notNull(),
  aiModerationStatus: text('ai_moderation_status').default('Approved').notNull(), // 'Approved', 'Review', 'Blocked'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const communityPostLikes = pgTable('community_post_likes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const communityComments = pgTable('community_comments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull().references(() => communityPosts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentCommentId: text('parent_comment_id'),
  commentText: text('comment_text').notNull(),
  aiModerationStatus: text('ai_moderation_status').default('Approved').notNull(), // 'Approved', 'Review', 'Blocked'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CommunityGroup = typeof communityGroups.$inferSelect;
export type NewCommunityGroup = typeof communityGroups.$inferInsert;
export type CommunityGroupMember = typeof communityGroupMembers.$inferSelect;
export type NewCommunityGroupMember = typeof communityGroupMembers.$inferInsert;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;
export type CommunityPostLike = typeof communityPostLikes.$inferSelect;
export type NewCommunityPostLike = typeof communityPostLikes.$inferInsert;
export type CommunityComment = typeof communityComments.$inferSelect;
export type NewCommunityComment = typeof communityComments.$inferInsert;
