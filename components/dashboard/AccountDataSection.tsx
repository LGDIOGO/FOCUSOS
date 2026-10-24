'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { authFetch } from '@/lib/utils/authFetch'

const CONFIRM_WORD = 'APAGAR'

/** Exportar dados e apagar conta (LGPD). Confirmação digitada dentro da UI. */
export function AccountDataSection() {
  const [exporting, setExporting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const exportData = async () => {
    setExporting(true)
    setMessage(null)
    try {
      const res = await authFetch('/api/account/export')
      if (res.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos.')
      if (!res.ok) throw new Error('Não foi possível exportar seus dados agora.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'focusos-meus-dados.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage({ kind: 'success', text: 'Exportação concluída. O arquivo foi baixado.' })
    } catch (e: any) {
      setMessage({ kind: 'error', text: e?.message || 'Não foi possível exportar seus dados agora.' })
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (typed.trim().toUpperCase() !== CONFIRM_WORD) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await authFetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      })
      if (res.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos.')
      if (!res.ok) throw new Error('A exclusão não foi concluída e sua conta continua ativa. Tente novamente.')
      setMessage({ kind: 'success', text: 'Conta apagada. Redirecionando...' })
      await new Promise((resolve) => setTimeout(resolve, 1500))
      try { await signOut(auth) } catch {}
      window.location.href = '/login'
    } catch (e: any) {
      setMessage({ kind: 'error', text: e?.message || 'Não foi possível apagar a conta agora.' })
      setDeleting(false)
    }
  }

  return (
    <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[32px] space-y-6">
      <div>
        <h4 className="font-black text-lg text-[var(--text-primary)]">Seus dados</h4>
        <p className="text-sm text-[var(--text-muted)] font-medium">
          Baixe uma cópia de tudo que o FocusOS guarda sobre você ou apague sua conta de vez.{' '}
          <Link href="/privacidade" target="_blank" className="underline">Política de Privacidade</Link>
          {' · '}
          <Link href="/termos" target="_blank" className="underline">Termos de Uso</Link>
        </p>
      </div>

      <button
        onClick={exportData}
        disabled={exporting}
        className="min-h-[44px] w-full sm:w-auto px-6 py-3 bg-white text-black font-black rounded-2xl hover:bg-neutral-200 transition-all text-sm disabled:opacity-50"
      >
        {exporting ? 'Exportando...' : 'Exportar meus dados'}
      </button>

      <div className="h-px bg-white/10" />

      {!confirming ? (
        <button
          onClick={() => { setConfirming(true); setTyped(''); setMessage(null) }}
          className="min-h-[44px] w-full sm:w-auto px-6 py-3 bg-red-400 text-white font-black rounded-2xl hover:bg-red-500 transition-all text-sm"
        >
          Apagar minha conta
        </button>
      ) : (
        <div className="space-y-3 p-5 border border-red-400/30 bg-red-400/5 rounded-2xl">
          <p className="text-sm font-bold text-red-400">
            Isso apaga definitivamente sua conta e todos os seus dados (hábitos, tarefas, finanças, anotações, chaves de API
            e integrações). Não há como desfazer. Considere exportar seus dados antes.
          </p>
          <label className="block text-xs text-white/60 font-bold">
            Para confirmar, digite {CONFIRM_WORD}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="mt-2 w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-400/50"
              placeholder={CONFIRM_WORD}
            />
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setConfirming(false); setTyped('') }}
              disabled={deleting}
              className="min-h-[44px] w-full sm:w-auto px-6 py-3 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={deleteAccount}
              disabled={typed.trim().toUpperCase() !== CONFIRM_WORD || deleting}
              className="min-h-[44px] w-full sm:w-auto px-6 py-3 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all text-sm disabled:opacity-40"
            >
              {deleting ? 'Apagando...' : 'Apagar minha conta definitivamente'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`text-sm font-bold ${message.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
