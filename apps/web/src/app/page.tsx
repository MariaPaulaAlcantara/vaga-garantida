import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-emerald-600 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold">Vaga Garantida</h1>
        <p className="mt-3 max-w-lg text-emerald-50">
          Reserve sua vaga nas aulas gratuitas de bike, confirme presença e entre
          na lista de espera automaticamente quando uma vaga liberar.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/eventos"
            className="rounded-lg bg-white px-4 py-2 font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Ver eventos
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-emerald-300 px-4 py-2 hover:bg-emerald-700"
          >
            Entrar
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Reserve online', desc: 'Garanta sua vaga em segundos' },
          { title: 'Confirme presença', desc: 'Libere vagas se não puder ir' },
          { title: 'Lista de espera', desc: 'Promoção automática por ordem' },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
