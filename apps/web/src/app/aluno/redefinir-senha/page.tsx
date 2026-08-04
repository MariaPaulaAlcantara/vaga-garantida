'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { MIN_PASSWORD_LENGTH, PasswordInput } from '@/components/PasswordInput';
import { api, ApiError } from '@/lib/api';

type Step = 'request' | 'confirm';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const result = await api.requestPasswordReset(email);
      setInfo(result.message);
      setStep('confirm');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Erro ao solicitar código',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (senha.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await api.confirmPasswordReset(email, code.trim(), senha);
      router.push('/login?reset=1');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Erro ao redefinir senha',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Redefinir senha</h1>
      <p className="mt-2 text-sm text-slate-500">
        {step === 'request'
          ? 'Informe o email da sua conta de aluno. Enviaremos um código para redefinir a senha.'
          : 'Digite o código recebido por email e escolha uma nova senha.'}
      </p>

      {step === 'request' ? (
        <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmReset} className="mt-6 space-y-4">
          {info && <p className="text-sm text-slate-600">{info}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Código
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nova senha
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
              Confirmar nova senha
            </label>
            <PasswordInput
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
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
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setError('');
              setInfo('');
              setCode('');
              setSenha('');
              setConfirmarSenha('');
            }}
            className="w-full text-sm text-slate-500 hover:text-brand"
          >
            Reenviar código
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
