'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NovoEventoPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!token || user?.role !== 'ORGANIZER')) {
      router.push('/login');
    }
  }, [authLoading, token, user, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError('');

    try {
      const event = await api.createEvent(token, {
        title: form.get('title') as string,
        description: form.get('description') as string,
        startsAt: form.get('startsAt') as string,
        location: form.get('location') as string,
        capacity: Number(form.get('capacity')),
        opensHoursBefore: Number(form.get('opensHoursBefore')),
        closesHoursBefore: Number(form.get('closesHoursBefore')),
        promotedConfirmHours: Number(form.get('promotedConfirmHours')),
        publish: true,
      });
      router.push(`/organizador/eventos/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  }

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  defaultDate.setMinutes(0, 0, 0);
  const defaultDateStr = defaultDate.toISOString().slice(0, 16);

  return (
    <div>
      <Link
        href="/organizador"
        className="text-sm text-emerald-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Novo evento</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Título" name="title" required />
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Descrição
          </label>
          <textarea
            name="description"
            required
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <Field
          label="Data e hora"
          name="startsAt"
          type="datetime-local"
          defaultValue={defaultDateStr}
          required
        />
        <Field label="Local" name="location" required />
        <Field label="Capacidade" name="capacity" type="number" defaultValue="10" required />
        <Field
          label="Abrir confirmação (horas antes)"
          name="opensHoursBefore"
          type="number"
          defaultValue="48"
          required
        />
        <Field
          label="Fechar confirmação (horas antes)"
          name="closesHoursBefore"
          type="number"
          defaultValue="12"
          required
        />
        <Field
          label="Prazo para promovidos da fila (horas)"
          name="promotedConfirmHours"
          type="number"
          defaultValue="4"
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar evento'}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </div>
  );
}
