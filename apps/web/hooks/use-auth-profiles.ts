"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface UserProfiles {
  isPatient: boolean;
  isDoctor: boolean;
  isResearcher: boolean;
}

export interface AuthMeUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
  phone?: string | null;
  status?: string;
}

export interface AuthMeResponse {
  user: AuthMeUser;
  profiles: UserProfiles;
  session?: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
  };
}

export function useAuthProfiles(enabled: boolean = true) {
  return useQuery<AuthMeResponse | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await apiFetch<AuthMeResponse>('/auth/me');
      } catch {
        return null;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
