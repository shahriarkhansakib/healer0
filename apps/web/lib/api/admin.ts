export async function fetchAdminStats() {
  const res = await fetch('/api/admin/stats', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch admin statistics');
  return res.json();
}

export async function fetchAdminUsers(params?: {
  role?: string;
  status?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.role && params.role !== 'all') searchParams.set('role', params.role);
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const res = await fetch(`/api/admin/users?${searchParams.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch user directory');
  return res.json();
}

export async function updateUserStatusApi(userId: string, status: 'active' | 'suspended' | 'banned') {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to update user status');
  }
  return res.json();
}

export async function verifyDoctorLicenseApi(doctorId: string, licenseNumber: string) {
  const res = await fetch(`/api/admin/doctors/${doctorId}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ licenseNumber }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to verify doctor license');
  }
  return res.json();
}

export async function fetchSuperAdminTelemetry() {
  const res = await fetch('/api/super-admin/telemetry', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch system telemetry');
  return res.json();
}

export async function fetchSuperAdminAdmins() {
  const res = await fetch('/api/super-admin/admins', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch system administrators');
  return res.json();
}

export async function createAdminApi(data: { name: string; email: string; password?: string }) {
  const res = await fetch('/api/super-admin/admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create administrator');
  }
  return res.json();
}

export async function revokeAdminApi(adminId: string) {
  const res = await fetch(`/api/super-admin/admins/${adminId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to revoke administrator');
  }
  return res.json();
}
