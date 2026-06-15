import Link from 'next/link';

export function Logo({ href = '/eventos' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="32" height="32" rx="8" fill="#7C3AED" />
        <circle cx="10" cy="22" r="5" stroke="#fff" strokeWidth="1.8" fill="none" />
        <circle cx="22" cy="22" r="5" stroke="#00C2D4" strokeWidth="1.8" fill="none" />
        <path
          d="M10 22 L16 12 L22 22"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M16 12 L22 22" stroke="#fff" strokeWidth="1.8" fill="none" />
        <path d="M13 12 L19 12" stroke="#00C2D4" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 17 L25 15" stroke="#00C2D4" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="9" r="5" fill="#00C2D4" />
        <path
          d="M21.5 9 L23.2 10.8 L26.5 7.5"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-base font-extrabold tracking-tight text-slate-900 sm:text-xl">
        Vaga<span className="text-brand">Garantida</span>
      </span>
    </Link>
  );
}
