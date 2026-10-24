import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const doctorPatientMessages = pgTable('doctor_patient_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  patientUserId: text('patient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorUserId: text('doctor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderRole: text('sender_role').notNull(), // 'patient' | 'doctor'
  messageText: text('message_text').notNull(),
  attachmentUrl: text('attachment_url'),
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type DoctorPatientMessage = typeof doctorPatientMessages.$inferSelect;
export type NewDoctorPatientMessage = typeof doctorPatientMessages.$inferInsert;
