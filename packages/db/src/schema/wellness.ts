import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const journals = pgTable('journals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  mood: text('mood'), // e.g. 'Worried', 'Happy', 'Sad'
  aiSentiment: text('ai_sentiment'), // 'Positive', 'Negative', 'Low Mood'
  aiSummary: text('ai_summary'),
  entryDate: timestamp('entry_date', { mode: 'date' }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const moodTracking = pgTable('mood_tracking', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moodType: text('mood_type').notNull(), // 'Happy', 'Sad', 'Normal', 'Stressed'
  stressLevel: integer('stress_level').notNull(), // 1-10
  anxietyLevel: integer('anxiety_level').notNull(), // 1-10
  sleepQuality: integer('sleep_quality').notNull(), // 1-10
  notes: text('notes'),
  recordedDate: timestamp('recorded_date', { mode: 'date' }).defaultNow().notNull(),
  wellnessGoal: text('wellness_goal'),
  wellnessActivity: text('wellness_activity'),
  activityDescription: text('activity_description'),
  activityPriority: text('activity_priority'), // 'Low', 'Medium', 'High'
  activityStatus: text('activity_status').default('Pending').notNull(), // 'Pending', 'Completed'
  activityCompletedDate: timestamp('activity_completed_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const wellnessRules = pgTable('wellness_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conditionType: text('condition_type').notNull(), // 'Stress', 'Sleep', 'Anxiety', 'Mood'
  minimumValue: integer('minimum_value'), // e.g., 8 for stress, 7 for anxiety, 4 for sleep
  recommendedGoal: text('recommended_goal').notNull(),
  recommendedActivity: text('recommended_activity').notNull(),
  priority: text('priority').notNull(), // 'Low', 'Medium', 'High'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Journal = typeof journals.$inferSelect;
export type NewJournal = typeof journals.$inferInsert;
export type MoodTracking = typeof moodTracking.$inferSelect;
export type NewMoodTracking = typeof moodTracking.$inferInsert;
export type WellnessRule = typeof wellnessRules.$inferSelect;
export type NewWellnessRule = typeof wellnessRules.$inferInsert;
