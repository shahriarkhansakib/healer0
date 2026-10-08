import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const privacyConsents = pgTable('privacy_consents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(), // 'AI Memory', 'Research Participation', 'Data Sharing'
  accepted: boolean('accepted').default(false).notNull(),
  acceptedDate: timestamp('accepted_date', { mode: 'date' }),
  revokedDate: timestamp('revoked_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type PrivacyConsent = typeof privacyConsents.$inferSelect;
export type NewPrivacyConsent = typeof privacyConsents.$inferInsert;
