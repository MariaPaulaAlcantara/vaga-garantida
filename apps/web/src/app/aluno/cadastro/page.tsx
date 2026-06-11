'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CadastroAlunoPage() {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role === 'ORGANIZER') {
      router.push('/professor');
    }
  }, [authLoading, user, router]);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.register({
        name: nome.trim(),
        email,
        password: senha,
        phone: phone.replace(/\D/g, ''),
        registerAs: 'participant',
      });
      login(result.accessToken, result.user);
      router.push('/eventos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Cadastro do aluno</h1>
      <p className="mt-2 text-sm text-slate-500">
        Cadastre-se com email, senha e telefone para gerenciar e garantir sua
        vaga nas aulas.
      </p>

      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Nome Completo
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome completo"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>

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
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="********"
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="11999998888"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Cadastrando...' : 'Confirmar cadastro'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já é cadastrado?{' '}
        <Link href="/login" className="text-emerald-700 hover:underline">
          Entrar aqui
        </Link>
      </p>
    </div>
  );
}
