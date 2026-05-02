import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { Goal } from '@/types'

export function useGoals() {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['goals', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'goals'),
        where('user_id', '==', user.uid)
      )

      const snap = await getDocs(q)
      const goals = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Goal[]

      return goals.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddGoal() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      
      const now = new Date().toISOString()
      await addDoc(collection(db, 'goals'), {
        ...goal,
        user_id: user.uid,
        created_at: now,
        updated_at: now
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Goal> & { id: string }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const ref = doc(db, 'goals', id)
      await updateDoc(ref, {
        ...data,
        updated_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'goals', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}
