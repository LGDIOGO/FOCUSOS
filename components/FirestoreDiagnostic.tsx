'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase/config'
import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { diagnoseProbe } from '@/lib/utils/firestoreDiagnostic'

type DiagState = 'checking' | 'ok' | 'permission_denied' | 'no_data' | 'no_auth' | 'fixing' | 'fixed' | 'error'

export function FirestoreDiagnostic() {
  const [state, setState] = useState<DiagState>('checking')
  const [detail, setDetail] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!auth || !db) { setState('error'); setDetail('Firebase não inicializou (auth ou db undefined)'); setVisible(true); return }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setState('no_auth'); setVisible(true); return }

      try {
        // Try a minimal read — just 1 habit doc for this user (single-field query, no index needed)
        const snap = await getDocs(
          query(collection(db, 'habits'), where('user_id', '==', user.uid), limit(1))
        )
        // Coleção vazia é normal em conta nova: não avisa (ver diagnoseProbe).
        setState(diagnoseProbe({ empty: snap.empty }))
        setVisible(false)
      } catch (err: any) {
        const code = err?.code || err?.message || String(err)
        if (diagnoseProbe({ error: err }) === 'permission_denied') {
          setState('permission_denied')
          setDetail(`${code}. Publique as regras: npx firebase-tools deploy --only firestore:rules`)
          setVisible(true)
        } else {
          setState('error')
          setDetail(code)
          setVisible(true)
        }
      }
    })
    return () => unsub()
  }, [])

  if (!visible) return null

  const messages: Record<DiagState, { color: string; title: string; body: string }> = {
    checking:         { color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',   title: '⏳ Verificando banco de dados...', body: '' },
    ok:               { color: '',                                                    title: '', body: '' },
    permission_denied:{ color: 'bg-red-500/10 border-red-500/30 text-red-300',      title: '🔒 Regras do Firestore bloqueando leituras', body: detail },
    no_data:          { color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', title: '⚠️ Nenhum dado encontrado para seu usuário', body: detail },
    no_auth:          { color: 'bg-gray-500/10 border-gray-500/30 text-gray-300',   title: '🔐 Usuário não autenticado', body: '' },
    fixing:           { color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',   title: '🔧 Corrigindo regras do Firestore automaticamente...', body: '' },
    fixed:            { color: 'bg-green-500/10 border-green-500/30 text-green-300', title: '✅ Regras corrigidas!', body: detail },
    error:            { color: 'bg-red-500/10 border-red-500/30 text-red-300',       title: '❌ Erro Firebase', body: detail },
  }

  const m = messages[state]
  if (!m.title) return null
  // z-[9500]: acima da nav/sidebar, abaixo dos modais (10000) de proposito.

  return (
    <div role="alert" className={`fixed bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+12px)] lg:bottom-4 left-1/2 -translate-x-1/2 z-[9500] max-w-xl w-[95%] max-h-[40dvh] overflow-y-auto pl-5 pr-14 py-3 rounded-2xl border text-sm font-semibold flex flex-col gap-1 shadow-2xl backdrop-blur-xl bg-[var(--bg-primary)] ${m.color}`}>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fechar aviso"
        className="absolute top-1 right-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-lg opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2"
      >
        ✕
      </button>
      <span>{m.title}</span>
      {m.body && <span className="text-xs font-mono opacity-70 break-all">{m.body}</span>}
      {state === 'no_data' && (
        <span className="text-xs opacity-70">
          Seus documentos existem mas não têm user_id igual ao seu uid, ou as regras ainda estão bloqueando.
        </span>
      )}
    </div>
  )
}
