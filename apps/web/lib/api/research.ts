const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

export interface ResearchProfile {
  id: string;
  userId: string;
  institution: string;
  researchField: string;
  publications?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchProject {
  id: string;
  researcherId: string;
  title: string;
  researchArea: string;
  description: string | null;
  protocolNumber: string | null;
  status: 'draft' | 'recruiting' | 'in_progress' | 'data_collection' | 'completed';
  startDate: string | null;
  endDate: string | null;
  targetSampleSize: number;
  createdAt: string;
  updatedAt: string;
  participants?: ResearchParticipant[];
  surveys?: ResearchSurvey[];
  dataCollection?: Array<{
    id: string;
    projectId: string;
    participantId: string | null;
    dataType: string;
    dataValue: any;
    collectedDate: string;
  }>;
  analytics?: Array<{
    id: string;
    projectId: string;
    analysisType: string;
    metricsSummary: any;
    generatedReport: string | null;
    createdAt: string;
  }>;
}

export interface ResearchParticipant {
  id: string;
  projectId: string;
  participantCode: string;
  ageGroup: string | null;
  gender: string | null;
  eligibilityStatus: 'pending' | 'eligible' | 'ineligible';
  consentStatus: 'pending' | 'consented' | 'declined' | 'withdrawn';
  joinedDate: string;
  project?: {
    id: string;
    title: string;
    protocolNumber: string | null;
  };
}

export interface ResearchSurvey {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  questionCount: number;
  createdAt: string;
  project?: {
    id: string;
    title: string;
  };
  questions?: Array<{
    id: string;
    questionText: string;
    questionType: string;
    options: any;
  }>;
}

export interface ResearchAnalyticsItem {
  id: string;
  projectId: string;
  analysisType: string;
  metricsSummary: any;
  generatedReport: string | null;
  createdAt: string;
  project?: {
    id: string;
    title: string;
  };
}

export interface ResearchPaper {
  id: string;
  researcherId: string;
  title: string;
  authors: string | null;
  journalName: string | null;
  publicationYear: number | null;
  paperUrl: string | null;
  doi: string | null;
  addedDate: string;
}

export interface ResearchDashboardSummary {
  totalStudies: number;
  activeStudies: number;
  completedStudies: number;
  totalParticipants: number;
  totalSurveys: number;
  totalDataPoints: number;
  totalPapers: number;
  recentProjects: ResearchProject[];
}

export interface CreateProjectPayload {
  title: string;
  researchArea: string;
  description?: string;
  protocolNumber?: string;
  status?: 'draft' | 'recruiting' | 'in_progress' | 'data_collection' | 'completed';
  startDate?: string;
  endDate?: string;
  targetSampleSize?: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export function fetchResearchProfile() {
  return apiFetch<ResearchProfile | null>('/research/profile');
}

export function fetchResearchDashboard() {
  return apiFetch<ResearchDashboardSummary>('/research/dashboard');
}

export async function fetchResearchProjects(): Promise<ResearchProject[]> {
  const data = await apiFetch<any>('/research/projects');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  return [];
}

export async function fetchResearchProjectById(id: string): Promise<ResearchProject> {
  const data = await apiFetch<any>(`/research/projects/${id}`);
  return data.project || data;
}

export async function createResearchProject(data: CreateProjectPayload): Promise<ResearchProject> {
  const res = await apiFetch<any>('/research/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.project || res;
}

export async function updateResearchProject(id: string, data: Partial<CreateProjectPayload>): Promise<ResearchProject> {
  const res = await apiFetch<any>(`/research/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.project || res;
}

export async function fetchResearchParticipants(): Promise<ResearchParticipant[]> {
  const data = await apiFetch<any>('/research/participants');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.participants)) return data.participants;
  return [];
}

export async function fetchResearchSurveys(): Promise<ResearchSurvey[]> {
  const data = await apiFetch<any>('/research/surveys');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.surveys)) return data.surveys;
  return [];
}

export async function fetchResearchAnalytics(): Promise<ResearchAnalyticsItem[]> {
  const data = await apiFetch<any>('/research/analytics');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.analytics)) return data.analytics;
  return [];
}

export async function fetchResearchPapers(): Promise<ResearchPaper[]> {
  const data = await apiFetch<any>('/research/papers');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.papers)) return data.papers;
  return [];
}

export function toggleResearcherMode(enable: boolean) {
  return apiFetch<{ isResearcher: boolean }>('/research/toggle', {
    method: enable ? 'POST' : 'DELETE',
  });
}
