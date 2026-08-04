'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type LoginMode = 'participant' | 'organizer';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode =
    searchParams.get('role') === 'organizer' ? 'organizer' : 'participant';

  const { login } = useAuth();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const resetSuccess = searchParams.get('reset') === '1';

  const isOrganizer = mode === 'organizer';

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = isOrganizer
        ? await api.loginOrganizer(email, senha)
        : await api.login(email, senha);
      login(result.accessToken, result.user);
      router.push(isOrganizer ? '/professor' : '/eventos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setError('');
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-end justify-between gap-4 border-b border-edge">
        <button
          type="button"
          onClick={() => switchMode('participant')}
          className={`border-b-2 pb-3 text-lg font-bold transition ${
            !isOrganizer
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Entrar como aluno
        </button>
        <button
          type="button"
          onClick={() => switchMode('organizer')}
          className={`border-b-2 pb-3 text-sm font-medium transition ${
            isOrganizer
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-brand'
          }`}
        >
          Entrar como organizador
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {isOrganizer
          ? 'Acesso para quem cria e gerencia aulas.'
          : 'Use seu email e senha para reservar vagas nas aulas.'}
      </p>

      {resetSuccess && !isOrganizer && (
        <p className="mt-4 text-sm text-green-700">
          Senha redefinida com sucesso. Faça login com a nova senha.
        </p>
      )}

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Senha
          </label>
          <PasswordInput
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="********"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Fazer login'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Ainda não tem conta?{' '}
        <Link
          href={isOrganizer ? '/professor/cadastro' : '/aluno/cadastro'}
          className="text-brand hover:underline"
        >
          Cadastre-se aqui
        </Link>
      </p>

      {!isOrganizer && (
        <p className="mt-3 text-center text-sm text-slate-500">
          <Link
            href="/aluno/redefinir-senha"
            className="text-brand hover:underline"
          >
            Esqueci minha senha
          </Link>
        </p>
      )}
    </div>
  );
}
