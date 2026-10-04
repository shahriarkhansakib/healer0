import { pgTable, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { doctorProfiles, patientProfiles } from './medical';
import { appointments } from './consultations';
import { counselingSessions } from './counseling';

// Extended Doctor Qualifications
export const doctorQualifications = pgTable('doctor_qualifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  doctorId: text('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  degree: text('degree').notNull(),
  institution: text('institution').notNull(),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Doctor Reviews
export const doctorReviews = pgTable('doctor_reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  doctorId: text('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: text('patient_id').references(() => patientProfiles.id, { onDelete: 'set null' }),
  patientName: text('patient_name').notNull().default('Anonymous Patient'),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Doctor Settings & Preferences
export const doctorSettings = pgTable('doctor_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  doctorId: text('doctor_id').notNull().unique().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  autoAcceptBooking: boolean('auto_accept_booking').notNull().default(false),
  notificationEnabled: boolean('notification_enabled').notNull().default(true),
  language: text('language').notNull().default('en'),
  dutyStartTime: text('duty_start_time').notNull().default('08:00'),
  dutyEndTime: text('duty_end_time').notNull().default('17:00'),
  offDay: text('off_day').notNull().default('Sunday'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Patient Records Directory
export const patientRecords = pgTable('patient_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  doctorId: text('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: text('patient_id').notNull().references(() => patientProfiles.id, { onDelete: 'cascade' }),
  patientName: text('patient_name').notNull(),
  condition: text('condition').notNull(),
  medicalHistory: text('medical_history'),
  previousSessions: integer('previous_sessions').notNull().default(0),
  riskLevel: text('risk_level').notNull().default('Low'), // Low, Moderate, High, Critical
  allergies: text('allergies'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Session Notes
export const sessionNotes = pgTable('session_notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  appointmentId: text('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  doctorId: text('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: text('patient_id').notNull().references(() => patientProfiles.id, { onDelete: 'cascade' }),
  patientName: text('patient_name').notNull(),
  sessionSummary: text('session_summary').notNull(),
  clinicalImpressions: text('clinical_impressions'),
  diagnosis: text('diagnosis'),
  treatmentPlan: text('treatment_plan'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Prescriptions
export const prescriptions = pgTable('prescriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  appointmentId: text('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  doctorId: text('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: text('patient_id').notNull().references(() => patientProfiles.id, { onDelete: 'cascade' }),
  patientName: text('patient_name').notNull(),
  title: text('title').notNull(),
  medications: jsonb('medications').notNull(), // [{ medicationName, dosage, frequency, duration, instructions }]
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Export inferred types
export type DoctorQualification = typeof doctorQualifications.$inferSelect;
export type NewDoctorQualification = typeof doctorQualifications.$inferInsert;
export type DoctorReview = typeof doctorReviews.$inferSelect;
export type NewDoctorReview = typeof doctorReviews.$inferInsert;
export type DoctorSettings = typeof doctorSettings.$inferSelect;
export type NewDoctorSettings = typeof doctorSettings.$inferInsert;
export type PatientRecord = typeof patientRecords.$inferSelect;
export type NewPatientRecord = typeof patientRecords.$inferInsert;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type NewSessionNote = typeof sessionNotes.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
