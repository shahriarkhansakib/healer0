import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5007'),
  fetchOptions: {
    customFetchImpl: typeof window === 'undefined'
      ? async (input: RequestInfo | URL, init?: RequestInit) => {
          try {
            return await fetch(input, init);
          } catch {
            // During static build-time prerendering without a running backend server,
            // return a safe empty response to prevent ECONNREFUSED logs.
            return new Response(JSON.stringify(null), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      : undefined,
  },
  plugins: [
    organizationClient()
  ]
});

export const { signIn, signUp, signOut, useSession } = authClient;
