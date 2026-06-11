'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NovaAulaPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!token || user?.role !== 'ORGANIZER')) {
      router.push('/professor/cadastro');
    }
  }, [authLoading, token, user, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    const form = new FormData(e.currentTarget);
    const date = form.get('date') as string;
    const time = form.get('time') as string;
    const description = (form.get('description') as string).trim();

    setLoading(true);
    setError('');

    try {
      const startsAt = new Date(`${date}T${time}`).toISOString();
      const event = await api.createEvent(token, {
        title: form.get('title') as string,
        description: description || 'Aula de bike',
        startsAt,
        location: form.get('location') as string,
        capacity: Number(form.get('capacity')),
        publish: true,
      });
      router.push(`/professor/aulas/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar aula');
    } finally {
      setLoading(false);
    }
  }

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  const defaultDateStr = defaultDate.toISOString().slice(0, 10);

  if (authLoading) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div>
      <Link
        href="/professor"
        className="text-sm text-emerald-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Cadastrar nova aula</h1>
      <p className="mt-2 text-sm text-slate-500">
        Preencha os dados da sua aula de bike.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Nome da aula" name="title" required />
        <Field label="Endereço" name="location" required />
        <Field
          label="Quantidade de alunos"
          name="capacity"
          type="number"
          defaultValue="6"
          required
        />
        <Field
          label="Dia"
          name="date"
          type="date"
          defaultValue={defaultDateStr}
          required
        />
        <Field
          label="Horário"
          name="time"
          type="time"
          defaultValue="08:00"
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Descrição (opcional)
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Aula de bike"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Cadastrando...' : 'Cadastrar aula'}
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
