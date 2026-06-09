import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vaga Garantida',
  description: 'Gerenciamento de vagas para aulas de bike',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
