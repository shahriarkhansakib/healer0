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

// Doctor Overview
export function fetchDoctorOverview() {
  return apiFetch<{ data: any }>('/doctors/overview');
}

// Doctor Profile
export function fetchDoctorProfile() {
  return apiFetch<{ data: any }>('/doctors/profile');
}

export function updateDoctorProfile(data: any) {
  return apiFetch<{ data: any }>('/doctors/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function updateDoctorSettings(data: any) {
  return apiFetch<{ data: any }>('/doctors/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function addDoctorQualification(data: { degree: string; institution: string; year: number }) {
  return apiFetch<{ data: any }>('/doctors/qualifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchDoctorReviews() {
  return apiFetch<{ data: any[] }>('/doctors/reviews');
}

// Appointments
export function fetchAppointments(status?: string) {
  const query = status ? `?status=${status}` : '';
  return apiFetch<{ data: any[] }>(`/appointments${query}`);
}

export function updateAppointmentStatus(id: string, status: string) {
  return apiFetch<{ data: any }>(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Counseling
export function fetchCounselingSessions() {
  return apiFetch<{ data: any[] }>('/counseling/sessions');
}

export function updateCounselingStatus(id: string, status: string, notes?: string) {
  return apiFetch<{ data: any }>(`/counseling/sessions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

// Patients
export function fetchPatientRecords(risk?: string) {
  const query = risk ? `?risk=${risk}` : '';
  return apiFetch<{ data: any[] }>(`/patients${query}`);
}

export function updatePatientRisk(id: string, riskLevel: string, notes?: string) {
  return apiFetch<{ data: any }>(`/patients/${id}/risk`, {
    method: 'PATCH',
    body: JSON.stringify({ riskLevel, notes }),
  });
}

// Session Notes
export function fetchSessionNotes() {
  return apiFetch<{ data: any[] }>('/sessions/notes');
}

export function createSessionNote(data: any) {
  return apiFetch<{ data: any }>('/sessions/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Prescriptions
export function fetchPrescriptions() {
  return apiFetch<{ data: any[] }>('/sessions/prescriptions');
}

export function createPrescription(data: any) {
  return apiFetch<{ data: any }>('/sessions/prescriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
