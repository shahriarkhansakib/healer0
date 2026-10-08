import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const counselingSessions = pgTable('counseling_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  doctorId: text('doctor_id'),
  patientId: text('patient_id'),
  patientName: text('patient_name'),
  sessionType: text('session_type').notNull().default('Mental Health'), // 'Basic Counseling', 'Deep Counseling', 'Crisis Support', 'Mental Health', 'Therapy', 'Stress Management'
  startTime: timestamp('start_time', { mode: 'date' }).defaultNow().notNull(),
  endTime: timestamp('end_time', { mode: 'date' }),
  status: text('status').default('Active').notNull(), // 'Active', 'Completed', 'upcoming', 'in-progress', 'canceled'
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const counselingMessages = pgTable('counseling_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => counselingSessions.id, { onDelete: 'cascade' }),
  sender: text('sender').notNull(), // 'User', 'AI'
  messageText: text('message_text').notNull(),
  emotionDetected: text('emotion_detected'), // 'Stress', 'Supportive', 'Anxiety', etc.
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type CounselingSession = typeof counselingSessions.$inferSelect;
export type NewCounselingSession = typeof counselingSessions.$inferInsert;
export type CounselingMessage = typeof counselingMessages.$inferSelect;
export type NewCounselingMessage = typeof counselingMessages.$inferInsert;
