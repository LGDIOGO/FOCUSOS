import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  deleteDoc,
  doc, 
  updateDoc,
  orderBy 
} from 'firebase/firestore'
import { CalendarEvent } from '@/types'

export function useEvents() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['events', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'events'),
        where('user_id', '==', user.uid)
      )

      const snap = await getDocs(q)
      const events = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as CalendarEvent[]

      // Sort in-memory to avoid composite index requirement
      return events.sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '')
        if (dateCompare !== 0) return dateCompare
        return (a.time || '').localeCompare(b.time || '')
      })
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddEvent() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated')

      const docRef = await addDoc(collection(db, 'events'), {
        ...event,
        user_id: user.uid,
        created_at: new Date().toISOString()
      })
      return { id: docRef.id, ...event }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', user?.uid] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CalendarEvent> & { id: string }) => {
      if (!user) throw new Error('Not authenticated')
      const docRef = doc(db, 'events', id)
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString()
      })
      return { id, ...data }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', user?.uid] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'events', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', user?.uid] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}
