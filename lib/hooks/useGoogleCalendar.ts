'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/lib/firebase/config'

async function getIdToken() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getIdToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as any),
    },
  })
  // A rota pode cair antes de escrever o corpo (erro não tratado no servidor,
  // timeout, página de erro HTML). `res.json()` direto transformava isso em
  // "Unexpected end of JSON input", que não diz nada a quem está usando.
  const raw = await res.text()
  let data: any = null
  if (raw) {
    try { data = JSON.parse(raw) } catch { /* resposta não é JSON */ }
  }

  if (!data) {
    throw new Error(
      res.ok
        ? 'O servidor respondeu vazio. Tente de novo em alguns segundos.'
        : `Falha no servidor (${res.status}). ${raw.slice(0, 160) || 'Sem detalhes.'}`
    )
  }

  if (!res.ok) throw new Error(data.error || data.details || `Falha (${res.status}).`)
  return data
}

/**
 * Envia para o Google Agenda em segundo plano depois que algo é criado ou
 * editado, sem prender a interface e sem estourar erro na cara de quem só
 * queria salvar um item.
 *
 * As chamadas são agrupadas numa janela curta: salvar três itens seguidos
 * dispara uma sincronização, não três. Quem não conectou a conta não paga
 * nada — a chamada é simplesmente ignorada.
 */
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null
let autoSyncPending = new Set<string>()

export function scheduleCalendarSync(source: 'events' | 'work' | 'habits') {
  if (typeof window === 'undefined') return
  autoSyncPending.add(source)

  if (autoSyncTimer) clearTimeout(autoSyncTimer)
  autoSyncTimer = setTimeout(async () => {
    const sources = Array.from(autoSyncPending)
    autoSyncPending = new Set()
    autoSyncTimer = null

    try {
      const status = await apiFetch('/api/integrations/google-calendar/status')
      if (!status?.connected) return
      await apiFetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
        body: JSON.stringify({
          sources,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        }),
      })
    } catch {
      // Silencioso de propósito: falhar a sincronização não pode parecer que
      // o item não foi salvo. O botão manual continua reportando erro.
    }
  }, 4000)
}

export function useGoogleCalendarStatus() {
  const user = auth.currentUser
  return useQuery({
    queryKey: ['gcal-status', user?.uid],
    queryFn: () => apiFetch('/api/integrations/google-calendar/status'),
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  })
}

export function useConnectGoogleCalendar() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/integrations/google-calendar/connect')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }, [])

  return { connect, loading, error }
}

export function useDisconnectGoogleCalendar() {
  const qc = useQueryClient()
  const user = auth.currentUser
  return useMutation({
    mutationFn: () => apiFetch('/api/integrations/google-calendar/disconnect', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gcal-status', user?.uid] }),
  })
}

export function useSyncToGoogleCalendar() {
  const qc = useQueryClient()
  const user = auth.currentUser
  return useMutation({
    mutationFn: (options?: { event_ids?: string[]; timezone?: string }) =>
      apiFetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', user?.uid] })
    },
  })
}
