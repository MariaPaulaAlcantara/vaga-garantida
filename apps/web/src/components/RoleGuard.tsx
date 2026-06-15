'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function RequireParticipant({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === 'ORGANIZER') {
      router.replace('/professor');
    }
  }, [isLoading, user, router]);

  if (isLoading || user?.role === 'ORGANIZER') {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return <>{children}</>;
}

export function RequireOrganizer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace('/login?role=organizer');
      return;
    }
    if (user?.role !== 'ORGANIZER') {
      router.replace('/eventos');
    }
  }, [isLoading, token, user, router]);

  if (isLoading || !token || user?.role !== 'ORGANIZER') {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return <>{children}</>;
}
