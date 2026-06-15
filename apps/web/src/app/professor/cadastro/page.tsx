'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { MIN_PASSWORD_LENGTH, PasswordInput } from '@/components/PasswordInput';
import { PhoneInput } from '@/components/PhoneInput';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { stripPhoneDigits } from '@/lib/format';

export default function ProfessorCadastroPage() {
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

    if (senha.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }

    setLoading(true);
    try {
      const result = await api.register({
        name: nome.trim(),
        email,
        password: senha,
        phone: stripPhoneDigits(phone),
        registerAs: 'organizer',
      });
      login(result.accessToken, result.user);
      router.push('/professor/nova-aula');
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
      <h1 className="text-2xl font-bold text-slate-900">Cadastro de professora</h1>
      <p className="mt-2 text-sm text-slate-500">
        Cadastre-se com email, senha e telefone para criar e gerenciar suas
        aulas de bike.
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
          <PasswordInput
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="********"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Mínimo de {MIN_PASSWORD_LENGTH} caracteres
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Telefone
          </label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? 'Cadastrando...' : 'Confirmar cadastro'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já é cadastrado?{' '}
        <Link href="/login?role=organizer" className="text-brand hover:underline">
          Entrar aqui
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-slate-500">
        É aluno?{' '}
        <Link href="/login" className="text-brand hover:underline">
          Entrar como aluno
        </Link>
      </p>
    </div>
  );
}
