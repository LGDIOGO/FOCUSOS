'use client'

import { useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch,
} from 'firebase/firestore'
import { useSettings, useUpdateSettings } from '@/lib/hooks/useSettings'
import type { WorkItem } from '@/types'

/**
 * Categorias e tipos do módulo Trabalho, definidos pelo próprio usuário.
 *
 * Antes eram duas listas fixas de marketplaces e de tipos de e-commerce, o que
 * prendia o app a um único público. Agora vivem na coleção `categories` já
 * existente, separadas pelo campo `type`, e cada uma tem a cor que a pessoa
 * escolher.
 *
 * Os itens continuam guardando o NOME do rótulo, não um id. Isso mantém tudo
 * que já foi cadastrado funcionando sem migração, e é por isso que renomear
 * propaga para os itens que usavam o nome antigo.
 */
export type LabelScope = 'work_category' | 'work_type'

export interface WorkLabel {
  id: string
  user_id: string
  name: string
  color: string
  type: LabelScope
}

/** Rótulo mostrado na UI — pode vir do banco ou ter sido inferido dos itens. */
export interface ResolvedLabel {
  name: string
  color: string
  id?: string
  /** Sem doc próprio: apareceu num item mas nunca foi cadastrado. */
  implicit?: boolean
}

export const FALLBACK_COLOR = '#6B7280'

/** Paleta oferecida no seletor de cor. */
export const LABEL_COLORS = [
  '#EF4444', '#F97316', '#F5C518', '#22C55E', '#10B981',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#14524B', '#1F3864', '#7B2D8E', '#333333', '#6B7280',
]

/** Conjunto inicial neutro, servindo a qualquer profissão. */
/**
 * Três de cada, criados sozinhos na primeira vez que alguém abre o módulo.
 *
 * São propositalmente genéricos: servem a quem é CLT, autônomo ou estudante.
 * Uma lista maior viraria faxina antes do primeiro uso, e uma lista de nicho
 * repetiria o erro dos canais de e-commerce fixos no código.
 */
export const DEFAULT_TYPES: Array<{ name: string; color: string }> = [
  { name: 'Tarefa',  color: '#3B82F6' },
  { name: 'Reunião', color: '#8B5CF6' },
  { name: 'Prazo',   color: '#EF4444' },
]

export const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: 'Trabalho', color: '#0277BD' },
  { name: 'Pessoal',  color: '#EC4899' },
  { name: 'Projeto',  color: '#22C55E' },
]

/** Texto preto sobre fundo claro, para o rótulo continuar legível. */
export function labelTextColor(bg: string): string {
  const hex = (bg || FALLBACK_COLOR).replace('#', '')
  if (hex.length < 6) return '#fff'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}

// ─── Consultas ───────────────────────────────────────────────────────────────

export function useWorkLabels() {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['work_labels', user?.uid],
    queryFn: async () => {
      if (!user) return []
      // Campo único na consulta; o escopo é filtrado aqui para não exigir índice.
      const snap = await getDocs(query(collection(db, 'categories'), where('user_id', '==', user.uid)))
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as WorkLabel)
        .filter(l => l.type === 'work_category' || l.type === 'work_type')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    },
    enabled: !!user,
    staleTime: 10_000,
  })
}

/**
 * Junta o que está cadastrado com o que aparece nos itens. Sem isso, quem já
 * usava os canais fixos veria os rótulos antigos sumirem da lista ao abrir a
 * tela pela primeira vez depois da mudança.
 */
export function useResolvedLabels(scope: LabelScope, items: WorkItem[] = []) {
  const { data: labels = [], isLoading } = useWorkLabels()

  return useMemo(() => {
    const own = labels.filter(l => l.type === scope)
    const byName = new Map<string, ResolvedLabel>()

    for (const l of own) {
      byName.set(l.name.trim().toLowerCase(), { name: l.name, color: l.color || FALLBACK_COLOR, id: l.id })
    }

    const usedNames = items
      .map(i => (scope === 'work_category' ? i.marketplace : i.kind))
      .map(v => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)

    for (const name of usedNames) {
      const key = name.toLowerCase()
      if (!byName.has(key)) byName.set(key, { name, color: FALLBACK_COLOR, implicit: true })
    }

    const list = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
    return { labels: list, stored: own, isLoading }
  }, [labels, scope, items, isLoading])
}

/** Cor de um rótulo pelo nome, com fallback neutro. */
export function useLabelColor(scope: LabelScope, items: WorkItem[] = []) {
  const { labels } = useResolvedLabels(scope, items)
  return useMemo(() => {
    const map = new Map(labels.map(l => [l.name.trim().toLowerCase(), l.color]))
    return (name?: string) => map.get((name || '').trim().toLowerCase()) || FALLBACK_COLOR
  }, [labels])
}

// ─── Mutações ────────────────────────────────────────────────────────────────

export function useCreateWorkLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color, scope }: { name: string; color: string; scope: LabelScope }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre novamente.')
      const clean = name.trim()
      if (!clean) throw new Error('Dê um nome ao rótulo.')

      const snap = await getDocs(query(collection(db, 'categories'), where('user_id', '==', user.uid)))
      const duplicate = snap.docs.some(d => {
        const data = d.data()
        return data.type === scope && String(data.name || '').trim().toLowerCase() === clean.toLowerCase()
      })
      if (duplicate) throw new Error(`"${clean}" já existe.`)

      await addDoc(collection(db, 'categories'), {
        user_id: user.uid,
        name: clean,
        color,
        type: scope,
        icon: '',
        created_at: new Date().toISOString(),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work_labels'] }),
  })
}

/**
 * Renomear precisa arrastar os itens junto, já que eles referenciam pelo nome.
 * Um batch mantém rótulo e itens consistentes mesmo se algo falhar no meio.
 */
export function useUpdateWorkLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, color, scope, previousName }: {
      id: string; name: string; color: string; scope: LabelScope; previousName: string
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre novamente.')
      const clean = name.trim()
      if (!clean) throw new Error('Dê um nome ao rótulo.')

      const batch = writeBatch(db)
      batch.update(doc(db, 'categories', id), { name: clean, color })

      if (clean !== previousName) {
        const field = scope === 'work_category' ? 'marketplace' : 'kind'
        const itemsSnap = await getDocs(query(collection(db, 'work_items'), where('user_id', '==', user.uid)))
        itemsSnap.docs
          .filter(d => String(d.data()[field] || '').trim() === previousName)
          .forEach(d => batch.update(d.ref, { [field]: clean }))
      }

      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_labels'] })
      qc.invalidateQueries({ queryKey: ['work_items'] })
    },
  })
}

/**
 * Apagar o rótulo não apaga os itens: eles perdem a marcação e voltam a ficar
 * sem categoria/tipo, o que é recuperável. Apagar trabalho junto não seria.
 */
export function useDeleteWorkLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, scope }: { id: string; name: string; scope: LabelScope }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre novamente.')

      const field = scope === 'work_category' ? 'marketplace' : 'kind'
      const itemsSnap = await getDocs(query(collection(db, 'work_items'), where('user_id', '==', user.uid)))
      const affected = itemsSnap.docs.filter(d => String(d.data()[field] || '').trim() === name)

      const batch = writeBatch(db)
      // Tipo é obrigatório no item; cai para "Tarefa" em vez de ficar vazio.
      affected.forEach(d => batch.update(d.ref, { [field]: scope === 'work_type' ? 'Tarefa' : '' }))
      batch.delete(doc(db, 'categories', id))
      await batch.commit()

      return affected.length
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_labels'] })
      qc.invalidateQueries({ queryKey: ['work_items'] })
    },
  })
}

/**
 * Adota um rótulo que só existia dentro dos itens: cria o documento e reescreve
 * os itens que usavam o valor antigo.
 *
 * É o caminho de quem tinha os tipos fixos em inglês — `listing` vira "Anúncio"
 * no banco também, não só na tela, e a partir daí pode ser renomeado à vontade.
 */
export function useAdoptWorkLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rawName, newName, color, scope }: {
      rawName: string; newName: string; color: string; scope: LabelScope
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre novamente.')
      const clean = newName.trim()
      if (!clean) throw new Error('Dê um nome ao rótulo.')

      const catSnap = await getDocs(query(collection(db, 'categories'), where('user_id', '==', user.uid)))
      const duplicate = catSnap.docs.some(d => {
        const data = d.data()
        return data.type === scope && String(data.name || '').trim().toLowerCase() === clean.toLowerCase()
      })
      if (duplicate) throw new Error(`"${clean}" já existe.`)

      const batch = writeBatch(db)
      batch.set(doc(collection(db, 'categories')), {
        user_id: user.uid,
        name: clean,
        color,
        type: scope,
        icon: '',
        created_at: new Date().toISOString(),
      })

      if (clean !== rawName) {
        const field = scope === 'work_category' ? 'marketplace' : 'kind'
        const itemsSnap = await getDocs(query(collection(db, 'work_items'), where('user_id', '==', user.uid)))
        itemsSnap.docs
          .filter(d => String(d.data()[field] || '').trim() === rawName)
          .forEach(d => batch.update(d.ref, { [field]: clean }))
      }

      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_labels'] })
      qc.invalidateQueries({ queryKey: ['work_items'] })
    },
  })
}

/**
 * Cria os rótulos padrão na primeira visita, e só nela.
 *
 * As três guardas existem para não mexer em conta alguma que já esteja em uso:
 * a flag em settings impede recriar o que a pessoa apagou de propósito, a
 * ausência de rótulos impede duplicar, e a ausência de itens garante que
 * ninguém com histórico receba rótulos que não pediu.
 */
export function useSeedDefaultLabelsOnce(items: WorkItem[] | undefined, itemsLoaded: boolean) {
  const { data: labels, isLoading: labelsLoading } = useWorkLabels()
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const seed = useSeedWorkLabels()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    if (labelsLoading || settingsLoading || !itemsLoaded) return
    if (!settings) return                              // deslogado
    if (settings.work_labels_seeded) return            // já passou por aqui
    if ((labels?.length ?? 0) > 0) return              // conta já tem rótulos
    if ((items?.length ?? 0) > 0) return               // conta já tem trabalho

    ranRef.current = true
    Promise.all([
      seed.mutateAsync({ scope: 'work_type', names: DEFAULT_TYPES }),
      seed.mutateAsync({ scope: 'work_category', names: DEFAULT_CATEGORIES }),
    ])
      .then(() => updateSettings.mutate({ work_labels_seeded: true }))
      .catch(() => { ranRef.current = false })         // deixa tentar de novo
  }, [labelsLoading, settingsLoading, itemsLoaded, settings, labels, items]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Cria de uma vez os rótulos que já aparecem nos itens, ou o conjunto padrão. */
export function useSeedWorkLabels() {
  const qc = useQueryClient()
  // Renomear ao adotar mexe nos itens, então ambos precisam ser invalidados.
  return useMutation({
    mutationFn: async ({ scope, names }: {
      scope: LabelScope
      /** `from` é o valor cru gravado nos itens, quando diferente do nome final. */
      names: Array<{ name: string; color: string; from?: string }>
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Sessão expirada. Entre novamente.')

      const snap = await getDocs(query(collection(db, 'categories'), where('user_id', '==', user.uid)))
      const existing = new Set(
        snap.docs
          .filter(d => d.data().type === scope)
          .map(d => String(d.data().name || '').trim().toLowerCase())
      )

      // Só lê os itens se algum rótulo for renomeado ao ser adotado.
      const renames = names.filter(n => n.from && n.from !== n.name.trim())
      const itemsSnap = renames.length
        ? await getDocs(query(collection(db, 'work_items'), where('user_id', '==', user.uid)))
        : null
      const field = scope === 'work_category' ? 'marketplace' : 'kind'

      const batch = writeBatch(db)
      let created = 0
      for (const { name, color, from } of names) {
        const clean = name.trim()
        if (!clean || existing.has(clean.toLowerCase())) continue
        batch.set(doc(collection(db, 'categories')), {
          user_id: user.uid,
          name: clean,
          color,
          type: scope,
          icon: '',
          created_at: new Date().toISOString(),
        })
        existing.add(clean.toLowerCase())
        created++

        if (itemsSnap && from && from !== clean) {
          itemsSnap.docs
            .filter(d => String(d.data()[field] || '').trim() === from)
            .forEach(d => batch.update(d.ref, { [field]: clean }))
        }
      }
      if (created > 0) await batch.commit()
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_labels'] })
      qc.invalidateQueries({ queryKey: ['work_items'] })
    },
  })
}
