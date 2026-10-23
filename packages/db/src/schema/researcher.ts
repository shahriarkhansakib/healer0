import { pgTable, text, timestamp, boolean, jsonb, integer, numeric } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { researcherProfiles } from './medical';

// 1. Researcher Dashboard Summary (Table 294 in ERD)
export const researcherDashboardSummaries = pgTable('researcher_dashboard_summaries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().unique().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  activeProjects: integer('active_projects').default(0).notNull(),
  totalParticipants: integer('total_participants').default(0).notNull(),
  completedSurveys: integer('completed_surveys').default(0).notNull(),
  collectedRecords: integer('collected_records').default(0).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// 2. Research Projects (Table 304 in ERD)
export const researchProjects = pgTable('research_projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  projectTitle: text('project_title').notNull(),
  researchArea: text('research_area').notNull(),
  description: text('description').notNull(),
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  status: text('status').default('Active').notNull(), // Active, Recruiting, Completed, Draft
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// 3. Research Participants (Table 316 in ERD)
export const researchParticipants = pgTable('research_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  participantCode: text('participant_code').notNull(), // Anonymized study ID (e.g., PT-8821)
  ageGroup: text('age_group').notNull(), // 18-24, 25-34, 35-49, 50-64, 65+
  gender: text('gender').notNull(),
  eligibilityStatus: text('eligibility_status').default('Eligible').notNull(), // Eligible, Ineligible, Pending
  consentStatus: text('consent_status').default('Consented').notNull(), // Consented, Pending, Declined, Withdrawn
  joinedDate: timestamp('joined_date', { mode: 'date' }).defaultNow().notNull(),
});

// 4. Participant Screening (Table 327 in ERD)
export const participantScreening = pgTable('participant_screening', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  participantId: text('participant_id').notNull().references(() => researchParticipants.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  criteria: text('criteria').notNull(),
  result: text('result').notNull(), // Passed, Flagged, Ineligible
  screenedDate: timestamp('screened_date', { mode: 'date' }).defaultNow().notNull(),
});

// 5. Research Surveys (Table 336 in ERD)
export const researchSurveys = pgTable('research_surveys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  formUrl: text('form_url'), // Google Form link
  embedUrl: text('embed_url'), // Google Form embed URL (?embedded=true)
  totalQuestions: integer('total_questions').default(0).notNull(),
  status: text('status').default('Published').notNull(), // Published, Draft, Closed
  createdDate: timestamp('created_date', { mode: 'date' }).defaultNow().notNull(),
});

// 6. Survey Questions (Table 345 in ERD)
export const surveyQuestions = pgTable('survey_questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id').notNull().references(() => researchSurveys.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type').notNull(), // multiple_choice, likert_scale, text, rating
  options: jsonb('options'), // array of choice options or scale bounds
  orderIndex: integer('order_index').default(1).notNull(),
});

// 7. Research Data Collection (Table 353 in ERD)
export const researchDataCollection = pgTable('research_data_collection', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').references(() => researchParticipants.id, { onDelete: 'set null' }),
  dataType: text('data_type').notNull(), // Mood Telemetry, Clinical Assessment, Heart Rate Variability, Therapy Adherence
  dataValue: jsonb('data_value').notNull(),
  collectedDate: timestamp('collected_date', { mode: 'date' }).defaultNow().notNull(),
});

// 8. Research Analytics (Table 362 in ERD)
export const researchAnalytics = pgTable('research_analytics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  analysisType: text('analysis_type').notNull(), // Demographic Correlation, Symptom Trajectory, Intervention Efficacy, Retention Rate
  resultSummary: text('result_summary').notNull(),
  generatedReport: text('generated_report'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// 9. Participant Matching Requests (Table 371 in ERD)
export const participantMatchingRequests = pgTable('participant_matching_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  targetGroup: text('target_group').notNull(),
  criteria: jsonb('criteria').notNull(),
  matchedCount: integer('matched_count').default(0).notNull(),
  status: text('status').default('Completed').notNull(), // Pending, Completed, Cancelled
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// 10. Matched Participants (Table 382 in ERD)
export const matchedParticipants = pgTable('matched_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  matchingRequestId: text('matching_request_id').notNull().references(() => participantMatchingRequests.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => researchParticipants.id, { onDelete: 'cascade' }),
  matchScore: text('match_score').notNull(), // e.g. "96%"
  reason: text('reason').notNull(),
  approvalStatus: text('approval_status').default('Approved').notNull(), // Approved, Pending, Rejected
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// 11. Literature Search History (Table 392 in ERD)
export const literatureSearchHistory = pgTable('literature_search_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  searchKeyword: text('search_keyword').notNull(),
  filters: jsonb('filters'),
  resultCount: integer('result_count').default(0).notNull(),
  searchedAt: timestamp('searched_at', { mode: 'date' }).defaultNow().notNull(),
});

// 12. Research Papers (Table 401 in ERD)
export const researchPapers = pgTable('research_papers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  authors: text('authors').notNull(),
  journalName: text('journal_name').notNull(),
  publicationYear: integer('publication_year').notNull(),
  paperUrl: text('paper_url'),
  addedDate: timestamp('added_date', { mode: 'date' }).defaultNow().notNull(),
});

// 13. Collaboration Network (Table 412 in ERD)
export const collaborationNetwork = pgTable('collaboration_network', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  connectedResearcherId: text('connected_researcher_id'),
  connectedResearcherName: text('connected_researcher_name').notNull(),
  connectedInstitution: text('connected_institution').notNull(),
  collaborationType: text('collaboration_type').notNull(), // Co-Investigator, Peer Reviewer, Clinical Trial Partner, Data Exchange
  status: text('status').default('Active').notNull(), // Active, Pending, Invited
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// 14. Research Collaboration Messages (Table 421 in ERD)
export const researchCollaborationMessages = pgTable('research_collaboration_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  collaborationId: text('collaboration_id').notNull().references(() => collaborationNetwork.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderName: text('sender_name').notNull(),
  message: text('message').notNull(),
  sentTime: timestamp('sent_time', { mode: 'date' }).defaultNow().notNull(),
});

// 15. Research Reports (Table 429 in ERD)
export const researchReports = pgTable('research_reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  reportTitle: text('report_title').notNull(),
  summary: text('summary').notNull(),
  fileUrl: text('file_url'),
  generatedDate: timestamp('generated_date', { mode: 'date' }).defaultNow().notNull(),
});

// 16. Researcher Permissions & IRB Approvals (Table 439 in ERD)
export const researcherPermissions = pgTable('researcher_permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => researchProjects.id, { onDelete: 'cascade' }),
  dataAccessType: text('data_access_type').notNull(), // Anonymized Aggregate, De-identified Telemetry, Full Clinical Records
  approvalStatus: text('approval_status').default('Approved').notNull(), // Approved, Pending IRB Review, Under Audit
  approvedDate: timestamp('approved_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// 17. Researcher Settings (Table 448 in ERD)
export const researcherSettings = pgTable('researcher_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  researcherId: text('researcher_id').notNull().unique().references(() => researcherProfiles.id, { onDelete: 'cascade' }),
  notificationEnabled: boolean('notification_enabled').default(true).notNull(),
  language: text('language').default('en').notNull(),
  privacyMode: boolean('privacy_mode').default(true).notNull(), // Enforce HIPAA/GDPR double-blind anonymization
  isEnabled: boolean('is_enabled').default(false).notNull(), // Main switch for Researcher Dashboard activation
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Export inferred types for every table
export type ResearcherDashboardSummary = typeof researcherDashboardSummaries.$inferSelect;
export type NewResearcherDashboardSummary = typeof researcherDashboardSummaries.$inferInsert;

export type ResearchProject = typeof researchProjects.$inferSelect;
export type NewResearchProject = typeof researchProjects.$inferInsert;

export type ResearchParticipant = typeof researchParticipants.$inferSelect;
export type NewResearchParticipant = typeof researchParticipants.$inferInsert;

export type ParticipantScreening = typeof participantScreening.$inferSelect;
export type NewParticipantScreening = typeof participantScreening.$inferInsert;

export type ResearchSurvey = typeof researchSurveys.$inferSelect;
export type NewResearchSurvey = typeof researchSurveys.$inferInsert;

export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type NewSurveyQuestion = typeof surveyQuestions.$inferInsert;

export type ResearchDataCollection = typeof researchDataCollection.$inferSelect;
export type NewResearchDataCollection = typeof researchDataCollection.$inferInsert;

export type ResearchAnalytics = typeof researchAnalytics.$inferSelect;
export type NewResearchAnalytics = typeof researchAnalytics.$inferInsert;

export type ParticipantMatchingRequest = typeof participantMatchingRequests.$inferSelect;
export type NewParticipantMatchingRequest = typeof participantMatchingRequests.$inferInsert;

export type MatchedParticipant = typeof matchedParticipants.$inferSelect;
export type NewMatchedParticipant = typeof matchedParticipants.$inferInsert;

export type LiteratureSearchHistory = typeof literatureSearchHistory.$inferSelect;
export type NewLiteratureSearchHistory = typeof literatureSearchHistory.$inferInsert;

export type ResearchPaper = typeof researchPapers.$inferSelect;
export type NewResearchPaper = typeof researchPapers.$inferInsert;

export type CollaborationNetwork = typeof collaborationNetwork.$inferSelect;
export type NewCollaborationNetwork = typeof collaborationNetwork.$inferInsert;

export type ResearchCollaborationMessage = typeof researchCollaborationMessages.$inferSelect;
export type NewResearchCollaborationMessage = typeof researchCollaborationMessages.$inferInsert;

export type ResearchReport = typeof researchReports.$inferSelect;
export type NewResearchReport = typeof researchReports.$inferInsert;

export type ResearcherPermission = typeof researcherPermissions.$inferSelect;
export type NewResearcherPermission = typeof researcherPermissions.$inferInsert;

export type ResearcherSettings = typeof researcherSettings.$inferSelect;
export type NewResearcherSettings = typeof researcherSettings.$inferInsert;
