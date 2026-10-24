import Link from 'next/link'

export const CONTACT_PLACEHOLDER = 'digowronski@icloud.com'

/** Casca das páginas públicas /privacidade e /termos (sem login). */
export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div
        role="note"
        className="w-full bg-yellow-400 text-black text-center text-sm font-black py-3 px-4"
      >
        Rascunho — revisão jurídica pendente
      </div>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8 leading-relaxed text-white/80">
        <Link href="/login" className="text-sm text-white/60 hover:text-white">
          ← Voltar
        </Link>
        <h1 className="text-4xl font-black text-white">{title}</h1>
        {children}
        <p className="text-sm text-white/60 pt-8 border-t border-white/10">
          <Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link>
          {' · '}
          <Link href="/termos" className="hover:text-white">Termos de Uso</Link>
        </p>
      </main>
    </div>
  )
}

export function LegalFooterLinks() {
  return (
    <p className="text-center text-sm text-white/60 font-medium">
      <Link href="/termos" className="inline-block py-2 hover:text-white underline">Termos de Uso</Link>
      {' · '}
      <Link href="/privacidade" className="inline-block py-2 hover:text-white underline">Política de Privacidade</Link>
    </p>
  )
}
