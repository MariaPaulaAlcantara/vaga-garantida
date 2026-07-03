'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';

export function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  const isOrganizer = user?.role === 'ORGANIZER';

  const navLinks = isOrganizer ? (
    <>
      <Link
        href="/professor"
        onClick={closeMenu}
        className="text-slate-600 hover:text-brand"
      >
        Minhas aulas
      </Link>
      <Link
        href="/professor/nova-aula"
        onClick={closeMenu}
        className="text-slate-600 hover:text-brand"
      >
        Nova aula
      </Link>
    </>
  ) : (
    <>
      <Link
        href="/eventos"
        onClick={closeMenu}
        className="text-slate-600 hover:text-brand"
      >
        Eventos
      </Link>
      {user && (
        <Link
          href="/minhas-inscricoes"
          onClick={closeMenu}
          className="text-slate-600 hover:text-brand"
        >
          Minhas inscrições
        </Link>
      )}
    </>
  );

  return (
    <header className="border-b border-edge bg-white">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Logo href={isOrganizer ? '/professor' : '/eventos'} />

          <div className="flex items-center gap-2">
            {user && (
              <div className="md:hidden">
                <UserAvatar name={user.name} />
              </div>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-600 hover:bg-brand-light md:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              {navLinks}
              {user ? (
                <>
                  <UserAvatar name={user.name} />
                  <button
                    type="button"
                    onClick={logout}
                    className="cursor-pointer text-slate-600 hover:text-brand"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-brand px-3 py-1.5 text-white hover:bg-brand-dark"
                >
                  Entrar
                </Link>
              )}
            </nav>
          </div>
        </div>

        {menuOpen && (
          <nav className="mt-3 flex flex-col gap-3 border-t border-edge pt-3 text-sm md:hidden">
            {navLinks}
            {user && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
                className="cursor-pointer text-left text-slate-600 hover:text-brand"
              >
                Sair
              </button>
            )}
            {!user && (
              <Link
                href="/login"
                onClick={closeMenu}
                className="rounded-lg bg-brand px-3 py-2 text-center text-white hover:bg-brand-dark"
              >
                Entrar
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-brand-light text-xs font-semibold uppercase text-brand"
      aria-label={name}
      title={name}
    >
      {getInitials(name)}
    </span>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}
