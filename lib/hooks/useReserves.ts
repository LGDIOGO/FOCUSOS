'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, writeBatch, orderBy, Timestamp, updateDoc,
} from 'firebase/firestore'

export interface Reserve {
  id: string
  user_id: string
  name: string
  emoji: string
  color: string
  target: number   // 0 = no target
  balance: number
  created_at: string
  updated_at: string
}

export interface ReserveTx {
  id: string
  user_id: string
  reserve_id: string
  amount: number       // always positive
  type: 'deposit' | 'withdrawal'
  note: string
  date: string         // "yyyy-MM-dd"
  created_at: string
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useReserves() {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['reserves', user?.uid],
    queryFn: async () => {
      if (!user) return [] as Reserve[]
      const q = query(collection(db, 'reserves'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() })) as Reserve[]
    },
    enabled: !!user,
    staleTime: 15_000,
  })
}

export function useReserveTxs(reserveId: string | null) {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['reserve_txs', reserveId],
    queryFn: async () => {
      if (!user || !reserveId) return [] as ReserveTx[]
      const q = query(
        collection(db, 'reserve_transactions'),
        where('reserve_id', '==', reserveId),
        where('user_id', '==', user.uid),
      )
      const snap = await getDocs(q)
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() })) as ReserveTx[]
    },
    enabled: !!user && !!reserveId,
    staleTime: 15_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateReserve() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async (data: { name: string; emoji: string; color: string; target: number }) => {
      if (!user) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      await addDoc(collection(db, 'reserves'), {
        user_id: user.uid,
        ...data,
        balance: 0,
        created_at: now,
        updated_at: now,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reserves', user?.uid] }),
  })
}

export function useDeleteReserve() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async (reserveId: string) => {
      if (!user) throw new Error('Not authenticated')
      const batch = writeBatch(db)

      // Delete all transactions for this reserve
      const txQ = query(
        collection(db, 'reserve_transactions'),
        where('reserve_id', '==', reserveId),
        where('user_id', '==', user.uid),
      )
      const txSnap = await getDocs(txQ)
      txSnap.docs.forEach(d => batch.delete(d.ref))

      // Delete the reserve itself
      batch.delete(doc(db, 'reserves', reserveId))
      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reserves', user?.uid] })
      qc.invalidateQueries({ queryKey: ['reserve_txs'] })
    },
  })
}

export function useUpdateReserve() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Omit<Reserve, 'id' | 'user_id' | 'balance' | 'created_at'>> & { id: string }) => {
      if (!user) throw new Error('Not authenticated')
      await updateDoc(doc(db, 'reserves', id), {
        ...updates,
        updated_at: new Date().toISOString(),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reserves', user?.uid] }),
  })
}

export function useTransact() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async ({
      reserveId, amount, type, note, currentBalance,
    }: {
      reserveId: string
      amount: number          // always positive
      type: 'deposit' | 'withdrawal'
      note?: string
      currentBalance: number
    }) => {
      if (!user) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      const today = now.split('T')[0]
      const delta = type === 'deposit' ? amount : -amount
      const newBalance = Math.max(0, currentBalance + delta)

      const batch = writeBatch(db)

      // Add transaction record
      const txRef = doc(collection(db, 'reserve_transactions'))
      batch.set(txRef, {
        user_id: user.uid,
        reserve_id: reserveId,
        amount,
        type,
        note: note ?? '',
        date: today,
        created_at: now,
      })

      // Update reserve balance atomically
      batch.update(doc(db, 'reserves', reserveId), {
        balance: newBalance,
        updated_at: now,
      })

      await batch.commit()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['reserves', user?.uid] })
      qc.invalidateQueries({ queryKey: ['reserve_txs', vars.reserveId] })
    },
  })
}
