'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import {
  collection, query, where, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { occursOn } from '@/lib/utils/recurrence'
import type { WorkItem, WorkLog, WorkStatus } from '@/types'

function stripUndefined<T extends Record<string, any>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T
}

/** Um item já resolvido para um dia específico. */
export interface WorkOccurrence extends WorkItem {
  occurrence_date: string
  status: WorkStatus
  note?: string | null
  minutes_spent?: number | null
}

// ─── Itens ───────────────────────────────────────────────────────────────────

export function useWorkItems() {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['work_items', user?.uid],
    queryFn: async () => {
      if (!user) return []
      // Consulta de campo único — não exige índice composto.
      const snap = await getDocs(query(collection(db, 'work_items'), where('user_id', '==', user.uid)))
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((i: any) => !i.is_archived) as WorkItem[]

      return items.sort((a, b) => {
        if (a.time && b.time) {
          const t = a.time.localeCompare(b.time)
          if (t !== 0) return t
        }
        if (a.time && !b.time) return -1
        if (!a.time && b.time) return 1
        return a.title.localeCompare(b.title)
      })
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useCreateWorkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<WorkItem, 'id' | 'user_id' | 'created_at'>) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')
      await addDoc(collection(db, 'work_items'), stripUndefined({
        ...data,
        user_id: user.uid,
        is_archived: false,
        created_at: new Date().toISOString(),
      }))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work_items'] }),
  })
}

export function useUpdateWorkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkItem> & { id: string }) => {
      await updateDoc(doc(db, 'work_items', id), stripUndefined({
        ...updates,
        updated_at: new Date().toISOString(),
      }))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work_items'] }),
  })
}

export function useDeleteWorkItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await deleteDoc(doc(db, 'work_items', id)) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_items'] })
      qc.invalidateQueries({ queryKey: ['work_logs'] })
    },
  })
}

// ─── Registros por dia ───────────────────────────────────────────────────────

/** Todos os logs num intervalo. Filtra client-side para evitar índice composto. */
export function useWorkLogs(startDate: string, endDate: string) {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['work_logs', user?.uid, startDate, endDate],
    queryFn: async () => {
      if (!user) return []
      const snap = await getDocs(query(collection(db, 'work_logs'), where('user_id', '==', user.uid)))
      return snap.docs
        .map(d => d.data() as WorkLog)
        .filter(l => l.log_date >= startDate && l.log_date <= endDate)
    },
    enabled: !!user && !!startDate && !!endDate,
    staleTime: 5_000,
  })
}

export function useLogWorkItem() {
  const qc = useQueryClient()

  return useMutation({
    // Otimismo restrito ao dia registrado: escrever em todos os caches faria a
    // ocorrência de outro dia mudar junto (mesmo bug já corrigido na agenda).
    onMutate: async (vars: { itemId: string; status: WorkStatus; logDate: string; note?: string; minutesSpent?: number }) => {
      await qc.cancelQueries({ queryKey: ['work_logs'] })
      const snapshots = qc.getQueriesData<WorkLog[]>({ queryKey: ['work_logs'] })

      snapshots.forEach(([key, data]) => {
        if (!data) return
        const [, , start, end] = key as unknown[] as [string, string, string, string]
        if (vars.logDate < start || vars.logDate > end) return

        const idx = data.findIndex(l => l.item_id === vars.itemId && l.log_date === vars.logDate)
        const next = [...data]
        if (idx >= 0) next[idx] = { ...next[idx], status: vars.status }
        else next.push({
          user_id: auth.currentUser?.uid || '',
          item_id: vars.itemId,
          log_date: vars.logDate,
          status: vars.status,
        })
        qc.setQueryData(key, next)
      })

      return { snapshots }
    },
    onError: (_e, _v, ctx: any) => {
      ctx?.snapshots?.forEach(([key, data]: [unknown, unknown]) => qc.setQueryData(key as any, data))
    },
    mutationFn: async ({ itemId, status, logDate, note, minutesSpent }: {
      itemId: string; status: WorkStatus; logDate: string; note?: string; minutesSpent?: number
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      await setDoc(doc(db, 'work_logs', `${itemId}_${logDate}`), stripUndefined({
        user_id: user.uid,
        item_id: itemId,
        log_date: logDate,
        status,
        note: note ?? null,
        minutes_spent: minutesSpent ?? null,
        logged_at: Timestamp.now(),
      }), { merge: true })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work_logs'] }),
  })
}

// ─── Expansão de ocorrências ─────────────────────────────────────────────────

/**
 * Expande os itens nas ocorrências que caem no intervalo, já com o status do
 * dia. Usa o mesmo motor de recorrência dos hábitos e da agenda.
 */
export function expandOccurrences(
  items: WorkItem[],
  logs: WorkLog[],
  startDate: string,
  endDate: string,
): WorkOccurrence[] {
  if (!startDate || endDate < startDate) return []

  let days: string[]
  try {
    days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      .map(d => format(d, 'yyyy-MM-dd'))
  } catch {
    return []
  }

  const logMap = new Map<string, WorkLog>()
  for (const l of logs) logMap.set(`${l.item_id}_${l.log_date}`, l)

  const out: WorkOccurrence[] = []
  for (const item of items) {
    for (const day of days) {
      if (!occursOn(item.recurrence, item.date, day, item.end_date)) continue
      const log = logMap.get(`${item.id}_${day}`)
      out.push({
        ...item,
        occurrence_date: day,
        status: log?.status ?? 'none',
        note: log?.note,
        minutes_spent: log?.minutes_spent,
      })
    }
  }

  return out.sort((a, b) => {
    const d = a.occurrence_date.localeCompare(b.occurrence_date)
    if (d !== 0) return d
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time) return -1
    if (b.time) return 1
    return a.title.localeCompare(b.title)
  })
}

// ─── Relatório ───────────────────────────────────────────────────────────────

export interface WorkReport {
  total: number
  done: number
  partial: number
  failed: number
  pending: number
  completionRate: number        // % com parcial valendo metade
  plannedMinutes: number
  spentMinutes: number
  byProject: Array<{ project: string; total: number; done: number; rate: number }>
  byKind: Array<{ kind: string; total: number; done: number }>
  byDay: Array<{ date: string; total: number; done: number; rate: number | null }>
  concluded: WorkOccurrence[]
  unresolved: WorkOccurrence[]  // falhou ou ficou sem registro
}

/**
 * Só conta ocorrências até hoje: incluir dias que ainda não chegaram derrubaria
 * o percentual da semana só por ela não ter terminado.
 */
export function buildReport(occurrences: WorkOccurrence[], todayStr: string): WorkReport {
  const past = occurrences.filter(o => o.occurrence_date <= todayStr)

  const done = past.filter(o => o.status === 'done')
  const partial = past.filter(o => o.status === 'partial')
  const failed = past.filter(o => o.status === 'failed')
  const pending = past.filter(o => o.status === 'none')

  const total = past.length
  const score = done.length + partial.length * 0.5
  const completionRate = total > 0 ? Math.round((score / total) * 100) : 0

  const groupBy = <K extends string>(key: (o: WorkOccurrence) => K) => {
    const m = new Map<K, { total: number; done: number }>()
    for (const o of past) {
      const k = key(o)
      const cur = m.get(k) ?? { total: 0, done: 0 }
      cur.total++
      if (o.status === 'done') cur.done++
      m.set(k, cur)
    }
    return m
  }

  const byProject = Array.from(groupBy(o => (o.project?.trim() || 'Sem projeto') as string))
    .map(([project, v]) => ({
      project, total: v.total, done: v.done,
      rate: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const byKind = Array.from(groupBy(o => o.kind as string))
    .map(([kind, v]) => ({ kind, total: v.total, done: v.done }))
    .sort((a, b) => b.total - a.total)

  const dayMap = new Map<string, { total: number; score: number }>()
  for (const o of past) {
    const cur = dayMap.get(o.occurrence_date) ?? { total: 0, score: 0 }
    cur.total++
    if (o.status === 'done') cur.score += 1
    else if (o.status === 'partial') cur.score += 0.5
    dayMap.set(o.occurrence_date, cur)
  }
  const byDay = Array.from(dayMap)
    .map(([date, v]) => ({
      date, total: v.total, done: Math.round(v.score),
      rate: v.total > 0 ? Math.round((v.score / v.total) * 100) : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    total,
    done: done.length,
    partial: partial.length,
    failed: failed.length,
    pending: pending.length,
    completionRate,
    plannedMinutes: past.reduce((s, o) => s + (o.duration_min || 0), 0),
    spentMinutes: past.reduce((s, o) => s + (o.minutes_spent || 0), 0),
    byProject,
    byKind,
    byDay,
    concluded: [...done, ...partial].sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date)),
    unresolved: [...failed, ...pending].sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date)),
  }
}
