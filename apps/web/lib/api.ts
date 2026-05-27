import { getSession, signOut } from 'next-auth/react';
import type { ApiError } from '@/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

async function getAccessToken(): Promise<string | null> {
  // Client-side: use next-auth session
  if (typeof window !== 'undefined') {
    const session = await getSession();
    return session?.user?.accessToken ?? null;
  }
  // Server-side: import auth dynamically to avoid circular imports
  const { auth } = await import('@/lib/auth');
  const session = await auth();
  return session?.user?.accessToken ?? null;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    return data.accessToken;
  } catch {
    return null;
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, skipAuth, ...fetchOptions } = options;

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res = await fetch(url.toString(), { ...fetchOptions, headers });

  // Attempt token refresh on 401
  if (res.status === 401 && !skipAuth && typeof window !== 'undefined') {
    const session = await getSession();
    if (session?.user?.refreshToken) {
      const newToken = await refreshAccessToken(session.user.refreshToken);
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url.toString(), { ...fetchOptions, headers });
      } else {
        await signOut({ redirect: true, redirectTo: '/login' });
        throw new Error('Session expired');
      }
    }
  }

  if (!res.ok) {
    let errorData: ApiError = {
      message: `HTTP error ${res.status}`,
      statusCode: res.status,
    };
    try {
      errorData = (await res.json()) as ApiError;
    } catch {
      // ignore JSON parse error
    }
    throw errorData;
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// -----------------------------------------------------------------------------
// Public API client
// -----------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, options?: FetchOptions): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: unknown, options?: FetchOptions): Promise<T> =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown, options?: FetchOptions): Promise<T> =>
    apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, options?: FetchOptions): Promise<T> =>
    apiFetch<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: FetchOptions): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
