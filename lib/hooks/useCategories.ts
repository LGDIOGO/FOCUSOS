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
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { categoriesForScope, sortCategories } from '../utils/categories'

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
  /** Posição manual; ausente em docs antigos e nos recém-criados (vão para o fim). */
  order?: number
  created_at?: string
}

/**
 * @param scope quando informado, devolve só as categorias daquela aplicação.
 *
 * A coleção é compartilhada entre Hábitos, Agenda, Metas e Trabalho. Os modais
 * chamavam sem filtro e ofereciam tudo, então ao criar um hábito apareciam
 * "Mercado Livre", "Campaign" e os tipos de trabalho como se fossem categorias
 * de hábito. O filtro roda em `select`, sobre o mesmo cache — uma só leitura.
 *
 * Sem argumento continua devolvendo todas: a tela de gestão e as buscas por id
 * (resolver o nome da categoria de um item) precisam enxergar tudo.
 */
export function useCategories(scope?: CategoryScope | CategoryScope[]) {
  const user = useCurrentUser()
  const scopes = scope ? (Array.isArray(scope) ? scope : [scope]) : null

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
    select: (all: Category[]) => sortCategories(categoriesForScope(all, scopes)),
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddCategory() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'user_id' | 'order' | 'created_at'>) => {
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

export function useUpdateCategory() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name: string; icon: string; color: string }) => {
      await updateDoc(doc(db, 'categories', id), patch)
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

/** Grava a nova ordem (lote atômico). Recebe só os ids que mudaram. */
export function useReorderCategories() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (patches: Array<{ id: string; order: number }>) => {
      if (patches.length === 0) return
      const batch = writeBatch(db)
      patches.forEach(p => batch.update(doc(db, 'categories', p.id), { order: p.order }))
      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}
