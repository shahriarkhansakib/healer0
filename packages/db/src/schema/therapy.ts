import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const therapyPrograms = pgTable('therapy_programs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  resourceType: text('resource_type').notNull(), // 'Therapy', 'Meditation', 'Exercise', 'Relaxation'
  category: text('category').notNull(), // 'CBT', 'Anxiety', 'Sleep', 'Focus'
  description: text('description').notNull(),
  difficultyLevel: text('difficulty_level').default('Beginner').notNull(), // 'Beginner', 'Intermediate', 'Advanced'
  durationMinutes: integer('duration_minutes').default(10).notNull(),
  audioUrl: text('audio_url'),
  videoUrl: text('video_url'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const userTherapyProgress = pgTable('user_therapy_progress', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: text('resource_id').notNull().references(() => therapyPrograms.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time', { mode: 'date' }).defaultNow().notNull(),
  completionTime: timestamp('completion_time', { mode: 'date' }),
  status: text('status').default('In Progress').notNull(), // 'Completed', 'Skipped', 'In Progress'
  progressPercentage: integer('progress_percentage').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type TherapyProgram = typeof therapyPrograms.$inferSelect;
export type NewTherapyProgram = typeof therapyPrograms.$inferInsert;
export type UserTherapyProgress = typeof userTherapyProgress.$inferSelect;
export type NewUserTherapyProgress = typeof userTherapyProgress.$inferInsert;
