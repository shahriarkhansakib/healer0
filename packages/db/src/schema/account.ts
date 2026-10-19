import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),
  gender: text('gender'),
  occupation: text('occupation'),
  country: text('country'),
  language: text('language').default('en'),
  profileImage: text('profile_image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const userPreferences = pgTable('user_preferences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  aiMemoryEnabled: boolean('ai_memory_enabled').default(true).notNull(),
  moodTrackingEnabled: boolean('mood_tracking_enabled').default(true).notNull(),
  anonymousMode: boolean('anonymous_mode').default(false).notNull(),
  notificationEnabled: boolean('notification_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
