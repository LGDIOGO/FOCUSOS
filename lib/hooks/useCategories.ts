import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore'
import { db, auth } from '../firebase/config'

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  type: 'habits' | 'agenda' | 'goals'
}

export function useCategories() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['categories', user?.uid],
    queryFn: async () => {
      if (!user) return []
      const q = query(
        collection(db, 'categories'),
        where('user_id', '==', user.uid)
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddCategory() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')
      const docRef = await addDoc(collection(db, 'categories'), {
        ...category,
        user_id: user.uid,
        created_at: new Date().toISOString()
      })
      return { id: docRef.id, ...category }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'categories', id))
    },
    onSuccess: () => {
       qc.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}
