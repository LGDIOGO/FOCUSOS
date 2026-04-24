'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase/config'
import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

type DiagState = 'checking' | 'ok' | 'permission_denied' | 'no_data' | 'no_auth' | 'fixing' | 'fixed' | 'error'

export function FirestoreDiagnostic() {
  const [state, setState] = useState<DiagState>('checking')
  const [detail, setDetail] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!auth) { setState('error'); setDetail('Firebase auth not initialized'); setVisible(true); return }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setState('no_auth'); setVisible(true); return }

      try {
        // Try a minimal read — just 1 habit doc for this user
        const snap = await getDocs(
          query(collection(db, 'habits'), where('user_id', '==', user.uid), limit(1))
        )
        if (snap.empty) {
          setState('no_data')
          setDetail(`uid=${user.uid}`)
          setVisible(true)
        } else {
          setState('ok')
          setVisible(false)
        }
      } catch (err: any) {
        const code = err?.code || err?.message || String(err)
        if (code.includes('permission') || code.includes('PERMISSION') || code.includes('permission-denied')) {
          setState('permission_denied')
          setDetail(code)
          setVisible(true)
          // Auto-attempt to fix the rules via server-side Admin SDK
          autoFixRules()
        } else {
          setState('error')
          setDetail(code)
          setVisible(true)
        }
      }
    })
    return () => unsub()
  }, [])

  async function autoFixRules() {
    setState('fixing')
    try {
      const res = await fetch('/api/admin/fix-rules', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setState('fixed')
        setDetail('Regras atualizadas. Recarregando em 3s...')
        setTimeout(() => window.location.reload(), 3000)
      } else {
        setState('permission_denied')
        setDetail(`Fix falhou: ${data.error}. Atualize as regras no Firebase Console.`)
      }
    } catch (e: any) {
      setState('permission_denied')
      setDetail(`Fix falhou: ${e.message}`)
    }
  }

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

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-xl w-[95%] px-5 py-3 rounded-2xl border text-sm font-semibold flex flex-col gap-1 shadow-2xl ${m.color}`}>
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
