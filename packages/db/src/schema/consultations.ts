import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const appointments = pgTable('appointments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  patientId: text('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorId: text('doctor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  appointmentDate: timestamp('appointment_date', { mode: 'date' }).notNull(),
  consultationType: text('consultation_type').notNull(), // 'Chat', 'Video', 'Physical'
  consultationReason: text('consultation_reason'),
  sessionDurationMinutes: integer('session_duration_minutes').default(50).notNull(),
  appointmentStatus: text('appointment_status').default('Scheduled').notNull(), // 'Scheduled', 'Completed', 'Cancelled'
  doctorNotes: text('doctor_notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const patientDoctorVisitSummary = pgTable('patient_doctor_visit_summary', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  patientId: text('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  patientName: text('patient_name'),
  doctorId: text('doctor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorName: text('doctor_name'),
  totalVisits: integer('total_visits').default(0).notNull(),
  firstVisitDate: timestamp('first_visit_date', { mode: 'date' }),
  lastVisitDate: timestamp('last_visit_date', { mode: 'date' }),
  totalConsultationMinutes: integer('total_consultation_minutes').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type PatientDoctorVisitSummary = typeof patientDoctorVisitSummary.$inferSelect;
export type NewPatientDoctorVisitSummary = typeof patientDoctorVisitSummary.$inferInsert;
