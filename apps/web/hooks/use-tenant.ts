'use client';

import { useSession } from 'next-auth/react';
import { useAuthStore } from '@/lib/store';

export function useTenant() {
  const { data: session } = useSession();
  const { tenantSlug: storedSlug, tenantName: storedName } = useAuthStore();

  return {
    tenantId: session?.user?.tenantId ?? null,
    tenantSlug: session?.user?.tenantSlug ?? storedSlug,
    tenantName: session?.user?.tenantName ?? storedName ?? 'GuayCampo',
    isLoading: session === undefined,
  };
}
