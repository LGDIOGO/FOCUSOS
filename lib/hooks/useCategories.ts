import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/lib/context/AuthContext'
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
import { db } from '../firebase/config'

/**
 * Onde a etiqueta é aplicada. O módulo Trabalho usa dois escopos próprios —
 * tipo e categoria são eixos diferentes lá — por isso são cinco, e não três.
 */
export type CategoryScope =
  | 'habits' | 'agenda' | 'goals'
  | 'work_type' | 'work_category'

/** Fonte única dos escopos: o seletor e a listagem leem daqui. */
export const CATEGORY_SCOPES: Array<{ id: CategoryScope; label: string; short: string }> = [
  { id: 'habits',        label: 'Hábitos',             short: 'Hábitos' },
  { id: 'agenda',        label: 'Agenda',              short: 'Agenda' },
  { id: 'goals',         label: 'Metas',               short: 'Metas' },
  { id: 'work_type',     label: 'Trabalho · Tipo',     short: 'Trab. Tipo' },
  { id: 'work_category', label: 'Trabalho · Categoria', short: 'Trab. Categ.' },
]

/**
 * Nome do escopo. Antes um ternário decidia entre três valores e mandava
 * qualquer outro para "Metas", então etiqueta de Trabalho aparecia rotulada
 * como meta na lista.
 */
export const categoryScopeLabel = (type?: string) =>
  CATEGORY_SCOPES.find(s => s.id === type)?.label || 'Sem aplicação'

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  type: CategoryScope
}

export function useCategories() {
  const user = useCurrentUser()

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
  const user = useCurrentUser()

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
