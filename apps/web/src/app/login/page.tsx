'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestOtp(phone.replace(/\D/g, ''));
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyOtp(
        phone.replace(/\D/g, ''),
        code,
        name || undefined,
      );
      login(result.accessToken, result.user);
      router.push('/eventos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Código inválido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
      <p className="mt-2 text-sm text-slate-500">
        Use seu telefone para receber um código de verificação.
        Em desenvolvimento, use o código <strong>123456</strong>.
      </p>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
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
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nome (obrigatório no primeiro acesso)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Código OTP
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
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
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Voltar
          </button>
        </form>
      )}
    </div>
  );
}
