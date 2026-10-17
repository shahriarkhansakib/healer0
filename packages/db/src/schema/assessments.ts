import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const assessments = pgTable('assessments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code'), // 'PHQ9', 'GAD7', 'K6', 'RSES', 'WHO5', 'GSE', 'UCLA3'
  title: text('title').notNull(),
  category: text('category').notNull(), // 'Depression', 'Anxiety', 'Psychological Distress', 'Self-Esteem', 'Well-Being', 'Self-Efficacy', 'Loneliness'
  description: text('description').notNull(),
  totalQuestions: integer('total_questions').default(0).notNull(),
  timeframe: text('timeframe'), // 'past_2_weeks', 'past_30_days', 'general'
  scoringConfig: jsonb('scoring_config'), // scoring metadata (min, max, transforms)
  officialReferenceBands: jsonb('official_reference_bands'), // validated reference ranges
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const assessmentQuestions = pgTable('assessment_questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  questionCode: text('question_code'), // e.g. 'PHQ9_01', 'GAD7_02'
  questionText: text('question_text').notNull(),
  options: jsonb('options'), // Array<{ id: string; label: string; score: number }>
  optionA: text('option_a'),
  optionB: text('option_b'),
  optionC: text('option_c'),
  optionD: text('option_d'),
  optionE: text('option_e'),
  scoreMapping: jsonb('score_mapping'), // e.g. { A: 0, B: 1, C: 2, D: 3 }
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const assessmentResults = pgTable('assessment_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').default(27),
  severityLevel: text('severity_level').notNull(), // 'Minimal', 'Mild', 'Moderate', 'Severe', etc.
  identifiedProblem: text('identified_problem'), // e.g. "Moderate Depressive Symptoms (PHQ-9)"
  clinicalSummary: text('clinical_summary'),
  suggestedFollowUp: text('suggested_follow_up'),
  requiresFollowUp: boolean('requires_follow_up').default(false),
  crisisAlert: boolean('crisis_alert').default(false),
  answers: jsonb('answers'), // { [questionId]: selectedOptionId }
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
