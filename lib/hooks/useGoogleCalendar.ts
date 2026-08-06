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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
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
