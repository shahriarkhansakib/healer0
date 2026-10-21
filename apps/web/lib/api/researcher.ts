import { apiFetch } from '../api';

export interface ResearcherProfile {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  institution: string;
  researchField: string;
  designation: string | null;
  verificationStatus: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResearcherSettings {
  id?: string;
  researcherId?: string;
  notificationEnabled: boolean;
  language: string;
  privacyMode: boolean;
  isEnabled: boolean;
  updatedAt?: string;
}

export interface ResearcherStatusResponse {
  data: {
    profile: ResearcherProfile | null;
    settings: ResearcherSettings | null;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
      role: string;
    } | null;
    isEnabled: boolean;
  };
}

export interface DashboardSummaryResponse {
  data: {
    profile: ResearcherProfile;
    summary: {
      activeProjects: number;
      totalParticipants: number;
      completedSurveys: number;
      collectedRecords: number;
      updatedAt: string;
    };
    recentProjects: any[];
    recentData: any[];
    collaborators: any[];
    irbPermission?: any;
    consentStats?: {
      total: number;
      consented: number;
      rate: number;
    };
  };
}

export async function fetchResearcherStatus(): Promise<ResearcherStatusResponse> {
  return apiFetch<ResearcherStatusResponse>('/researcher/status');
}

export async function toggleResearcherMode(isEnabled: boolean) {
  return apiFetch<{ data: { success: boolean; isEnabled: boolean } }>('/researcher/toggle-mode', {
    method: 'POST',
    body: JSON.stringify({ isEnabled }),
  });
}

export async function fetchResearcherDashboard(): Promise<DashboardSummaryResponse> {
  return apiFetch<DashboardSummaryResponse>('/researcher/dashboard');
}

export async function fetchProjects() {
  return apiFetch<{ data: any[] }>('/researcher/projects');
}

export async function createProject(data: {
  projectTitle: string;
  researchArea: string;
  description: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return apiFetch<{ data: any }>('/researcher/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: any) {
  return apiFetch<{ data: any }>(`/researcher/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string) {
  return apiFetch<{ success: boolean }>(`/researcher/projects/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchParticipants(projectId?: string) {
  const query = projectId ? `?projectId=${projectId}` : '';
  return apiFetch<{ data: any[] }>(`/researcher/participants${query}`);
}

export async function addParticipant(data: {
  projectId: string;
  ageGroup: string;
  gender: string;
  eligibilityStatus?: string;
  consentStatus?: string;
  screeningCriteria?: string;
}) {
  return apiFetch<{ data: any }>('/researcher/participants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchScreeningRecords(projectId?: string) {
  const query = projectId ? `?projectId=${projectId}` : '';
  return apiFetch<{ data: any[] }>(`/researcher/screening${query}`);
}

export async function fetchMatchingRequests() {
  return apiFetch<{ data: { requests: any[]; matched: any[] } }>('/researcher/matching');
}

export async function createMatchingRequest(data: {
  projectId: string;
  targetGroup: string;
  criteria: any;
}) {
  return apiFetch<{ data: any }>('/researcher/matching', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchSurveys(projectId?: string) {
  const query = projectId ? `?projectId=${projectId}` : '';
  return apiFetch<{ data: any[] }>(`/researcher/surveys${query}`);
}

export async function createSurvey(data: {
  projectId: string;
  title: string;
  description?: string;
  formUrl?: string;
  status?: string;
  questions?: {
    questionText: string;
    questionType: string;
    options?: string[];
  }[];
}) {
  return apiFetch<{ data: any }>('/researcher/surveys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSurvey(surveyId: string) {
  return apiFetch<{ success: boolean }>(`/researcher/surveys/${surveyId}`, {
    method: 'DELETE',
  });
}

export async function fetchDataCollection() {
  return apiFetch<{ data: any[] }>('/researcher/data');
}

export async function addDataPoint(data: {
  projectId: string;
  participantId?: string;
  dataType: string;
  dataValue: any;
}) {
  return apiFetch<{ data: any }>('/researcher/data', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchAnalytics() {
  return apiFetch<{ data: any[] }>('/researcher/analytics');
}

export async function generateAnalytics(data: {
  projectId: string;
  analysisType: string;
  resultSummary: string;
  generatedReport?: string;
}) {
  return apiFetch<{ data: any }>('/researcher/analytics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchLiterature() {
  return apiFetch<{ data: { history: any[]; papers: any[] } }>('/researcher/literature');
}

export async function searchLiterature(keyword: string, filters?: any) {
  return apiFetch<{ data: any }>('/researcher/literature/search', {
    method: 'POST',
    body: JSON.stringify({ keyword, filters }),
  });
}

export async function addResearchPaper(data: {
  title: string;
  authors: string;
  journalName: string;
  publicationYear: number;
  paperUrl?: string;
}) {
  return apiFetch<{ data: any }>('/researcher/papers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCollaboration() {
  return apiFetch<{ data: { network: any[]; messages: any[] } }>('/researcher/collaboration');
}

export async function inviteCollaborator(data: {
  connectedResearcherName: string;
  connectedInstitution: string;
  collaborationType: string;
}) {
  return apiFetch<{ data: any }>('/researcher/collaboration/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendCollaborationMessage(data: {
  collaborationId: string;
  message: string;
}) {
  return apiFetch<{ data: any }>('/researcher/collaboration/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchReportsAndPermissions() {
  return apiFetch<{ data: { reports: any[]; permissions: any[] } }>('/researcher/reports');
}

export async function createReport(data: {
  projectId: string;
  reportTitle: string;
  summary: string;
  fileUrl?: string;
}) {
  return apiFetch<{ data: any }>('/researcher/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function requestPermission(data: {
  projectId: string;
  dataAccessType: string;
}) {
  return apiFetch<{ data: any }>('/researcher/permissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchResearcherSettings() {
  return apiFetch<{ data: any }>('/researcher/settings');
}

export async function updateResearcherSettings(data: {
  fullName?: string;
  institution?: string;
  researchField?: string;
  designation?: string;
  notificationEnabled?: boolean;
  language?: string;
  privacyMode?: boolean;
}) {
  return apiFetch<{ data: any }>('/researcher/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
