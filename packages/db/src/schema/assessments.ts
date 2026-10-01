import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const assessments = pgTable('assessments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'Depression', 'Anxiety', 'Stress', 'Personality', 'Emotional Intelligence'
  description: text('description').notNull(),
  totalQuestions: integer('total_questions').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const assessmentQuestions = pgTable('assessment_questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  optionA: text('option_a').notNull(),
  optionB: text('option_b').notNull(),
  optionC: text('option_c').notNull(),
  optionD: text('option_d').notNull(),
  scoreMapping: jsonb('score_mapping').notNull(), // e.g. { option_a: 0, option_b: 1, option_c: 2, option_d: 3 }
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const assessmentResults = pgTable('assessment_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  severityLevel: text('severity_level').notNull(), // 'Low', 'Medium', 'High'
  aiRecommendation: text('ai_recommendation'),
  completedDate: timestamp('completed_date', { mode: 'date' }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;
export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type NewAssessmentResult = typeof assessmentResults.$inferInsert;
