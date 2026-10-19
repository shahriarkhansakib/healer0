import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const crisisEvents = pgTable('crisis_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  riskLevel: text('risk_level').notNull(), // 'Low', 'Medium', 'High'
  detectedIssue: text('detected_issue').notNull(), // e.g. 'Self-harm thoughts', 'Suicide intention', 'Severe emotional distress'
  aiResponse: text('ai_response').notNull(),
  emergencyContacted: boolean('emergency_contacted').default(false).notNull(),
  psychologistConnected: boolean('psychologist_connected').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const trustedContacts = pgTable('trusted_contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contactName: text('contact_name').notNull(),
  relationship: text('relationship').notNull(), // 'Family', 'Friend', 'Caregiver', etc.
  phoneNumber: text('phone_number').notNull(),
  email: text('email'),
  emergencyAlertPermission: boolean('emergency_alert_permission').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type CrisisEvent = typeof crisisEvents.$inferSelect;
export type NewCrisisEvent = typeof crisisEvents.$inferInsert;
export type TrustedContact = typeof trustedContacts.$inferSelect;
export type NewTrustedContact = typeof trustedContacts.$inferInsert;
