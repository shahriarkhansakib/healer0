export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.message || errorBody?.error || `Request failed with status ${res.status}`;
    throw new Error(typeof message === 'object' ? JSON.stringify(message) : message);
  }

  return res.json() as Promise<T>;
}
