'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          Vaga Garantida
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/eventos" className="text-slate-600 hover:text-emerald-700">
            Eventos
          </Link>
          {user ? (
            <>
              <Link
                href="/minhas-inscricoes"
                className="text-slate-600 hover:text-emerald-700"
              >
                Minhas inscrições
              </Link>
              {user.role === 'ORGANIZER' && (
                <Link
                  href="/professor"
                  className="text-slate-600 hover:text-emerald-700"
                >
                  Minhas aulas
                </Link>
              )}
              <span className="text-slate-500">{user.name}</span>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
