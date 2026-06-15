'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
                <ProfileMenu userName={user.name} onLogout={logout} />
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
                <ProfileMenu userName={user.name} onLogout={logout} />
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

function ProfileMenu({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-brand-light text-brand hover:bg-brand-border"
        aria-expanded={open}
        aria-label="Menu do perfil"
      >
        <ProfileIcon />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-edge bg-white py-2 shadow-lg">
          <p className="border-b border-edge px-4 py-2 text-sm font-medium text-slate-900">
            {userName}
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-brand-light"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
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
