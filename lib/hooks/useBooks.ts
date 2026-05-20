'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { Book } from '@/types'

export function useBooks() {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['books', user?.uid],
    queryFn: async () => {
      if (!user) return []
      const q = query(collection(db, 'books'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Book[]
    },
    enabled: !!user,
    staleTime: 30_000,
  })
}

export function useAddBook() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async (book: Omit<Book, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated')
      const docRef = await addDoc(collection(db, 'books'), {
        ...book,
        user_id: user.uid,
        created_at: new Date().toISOString(),
      })
      return { id: docRef.id, ...book }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books', user?.uid] }),
  })
}

export function useUpdateBook() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Book> & { id: string }) => {
      await updateDoc(doc(db, 'books', id), { ...data, updated_at: new Date().toISOString() })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books', user?.uid] }),
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  const user = useCurrentUser()
  return useMutation({
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['books', user?.uid] })
      const prev = qc.getQueryData<Book[]>(['books', user?.uid])
      qc.setQueryData(['books', user?.uid], (old: Book[] | undefined) => old?.filter(b => b.id !== id) ?? [])
      return { prev }
    },
    onError: (_e: any, _id: string, ctx: any) => qc.setQueryData(['books', user?.uid], ctx?.prev),
    mutationFn: async (id: string) => deleteDoc(doc(db, 'books', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books', user?.uid] }),
  })
}
