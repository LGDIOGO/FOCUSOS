'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  writeBatch
} from 'firebase/firestore'
import { FocusNotification } from '@/types'

export function useNotifications() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['notifications', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as FocusNotification[]
    },
    enabled: !!user,
    staleTime: 30000, // 30s
  })
}

export function useAddNotification() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (notif: Omit<FocusNotification, 'id' | 'user_id' | 'created_at' | 'is_read'>) => {
      if (!user) throw new Error('Not authenticated')

      await addDoc(collection(db, 'notifications'), {
        ...notif,
        user_id: user.uid,
        is_read: false,
        created_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.uid] })
    }
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (id: string) => {
      const ref = doc(db, 'notifications', id)
      await updateDoc(ref, { is_read: true })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.uid] })
    }
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'notifications', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.uid] })
    }
  })
}

export function useClearAllNotifications() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return
      const batch = writeBatch(db)
      ids.forEach(id => {
        batch.delete(doc(db, 'notifications', id))
      })
      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', user?.uid] })
    }
  })
}
