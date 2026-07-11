'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore'

export interface TrackingEntry {
  id: string
  user_id: string
  year_month: string    // "2025-01"
  planned_amount: number
  actual_amount: number
  status: 'done' | 'partial' | 'skipped'
  created_at: string
  updated_at: string
}

export function useTrackingEntries() {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['retirement_tracking', user?.uid],
    queryFn: async () => {
      if (!user) return [] as TrackingEntry[]
      const q = query(collection(db, 'retirement_tracking'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as TrackingEntry[]
    },
    enabled: !!user,
    staleTime: 30_000,
  })
}

export function useUpsertTracking() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async (entry: {
      year_month: string
      planned_amount: number
      actual_amount: number
      status: 'done' | 'partial' | 'skipped'
    }) => {
      if (!user) throw new Error('Not authenticated')
      const docId = `${user.uid}_${entry.year_month}`
      const now = new Date().toISOString()
      await setDoc(doc(db, 'retirement_tracking', docId), {
        user_id: user.uid,
        ...entry,
        updated_at: now,
        created_at: now,
      }, { merge: true })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retirement_tracking', user?.uid] })
    },
  })
}
