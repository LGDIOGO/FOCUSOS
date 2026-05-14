import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore'
import { format, getDay, parseISO, getDate, getMonth, differenceInWeeks, differenceInDays, isToday, subDays } from 'date-fns'
import { CalendarEvent, HabitStatus } from '@/types'

export function useEvents() {
  const user = useCurrentUser()

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
        if (a.time && b.time) return a.time.localeCompare(b.time)
        if (a.time) return -1
        if (b.time) return 1
        return 0
      })
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddEvent() {
  const qc = useQueryClient()
  const user = useCurrentUser()

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
      qc.invalidateQueries({ queryKey: ['eventsToday'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    onMutate: async (vars: any) => {
      await qc.cancelQueries({ queryKey: ['events', user?.uid] })
      await qc.cancelQueries({ queryKey: ['eventsToday'] })
      
      qc.setQueriesData({ queryKey: ['events', user?.uid] }, (old: any) => {
        if (!old) return old
        return old.map((e: any) => e.id === vars.id ? { ...e, ...vars } : e)
      })
      qc.setQueriesData({ queryKey: ['eventsToday'] }, (old: any) => {
        if (!old) return old
        return old.map((e: any) => e.id === vars.id ? { ...e, ...vars } : e)
      })
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['events', user?.uid] })
      qc.invalidateQueries({ queryKey: ['eventsToday'] })
    },
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
      qc.invalidateQueries({ queryKey: ['eventsToday'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['events'] })
      await qc.cancelQueries({ queryKey: ['eventsToday'] })
      // Snapshot both cache groups for rollback
      const eventSnaps = qc.getQueriesData<any[]>({ queryKey: ['events'] })
      const todaySnaps = qc.getQueriesData<any[]>({ queryKey: ['eventsToday'] })
      // Optimistically remove from every cached list immediately
      eventSnaps.forEach(([key, old]) => {
        if (old) qc.setQueryData(key, old.filter((e: any) => e.id !== id))
      })
      todaySnaps.forEach(([key, old]) => {
        if (old) qc.setQueryData(key, old.filter((e: any) => e.id !== id))
      })
      return { eventSnaps, todaySnaps }
    },
    onError: (_err, _id, context: any) => {
      context?.eventSnaps?.forEach(([key, old]: [unknown, unknown]) => qc.setQueryData(key as any, old))
      context?.todaySnaps?.forEach(([key, old]: [unknown, unknown]) => qc.setQueryData(key as any, old))
    },
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'events', id))
    },
    onSuccess: () => {
      // Invalidate both — ['eventsToday'] was missing before (key mismatch with useEventsToday)
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['eventsToday'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}
export function useLogEvent() {
  const qc = useQueryClient()

  return useMutation({
    // ── Atualização otimista ────────────────────────────────────────────────
    onMutate: async (vars: { eventId: string; status: string; logDate?: string }) => {
      // Cancela queries em andamento para não sobrescrever o otimismo
      await qc.cancelQueries({ queryKey: ['eventsToday'] })

      // Salva snapshot de TODOS os caches de eventsToday para rollback
      const snapshots: Array<{ queryKey: readonly unknown[]; data: unknown }> = []
      qc.getQueriesData<any[]>({ queryKey: ['eventsToday'] }).forEach(([key, data]) => {
        snapshots.push({ queryKey: key, data })
        // Atualiza imediatamente o evento em qualquer cache que o contenha
        qc.setQueryData(key, (old: any[] | undefined) => {
          if (!old) return old
          return old.map(e => e.id === vars.eventId ? { ...e, status: vars.status } : e)
        })
      })

      return { snapshots }
    },
    // ── Rollback em caso de erro ───────────────────────────────────────────
    onError: (_err, _vars, context: any) => {
      context?.snapshots?.forEach(({ queryKey, data }: any) => {
        qc.setQueryData(queryKey, data)
      })
    },
    // ── Mutação real ───────────────────────────────────────────────────────
    mutationFn: async ({ eventId, status, logDate }: {
      eventId: string;
      status: string;
      logDate?: string;
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const targetDate = logDate || format(new Date(), 'yyyy-MM-dd')
      const logId = `${eventId}_${targetDate}`

      await setDoc(doc(db, 'event_logs', logId), {
        user_id: user.uid,
        event_id: eventId,
        log_date: targetDate,
        status,
        logged_at: Timestamp.now()
      }, { merge: true })
    },
    // ── Sincroniza cache com servidor após confirmação ─────────────────────
    onSuccess: () => {
      const user = auth.currentUser
      qc.invalidateQueries({ queryKey: ['eventsToday'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
      // Also refresh the agenda page logs so completed events move to history immediately
      qc.invalidateQueries({ queryKey: ['event-logs-agenda'] })
    },
  })
}

// ─── Shared sort: pending first (ascending time), resolved last (ascending time) ───
function timeToMin(t?: string): number {
  if (!t) return Infinity
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function sortEvents(a: { status?: string; time?: string }, b: { status?: string; time?: string }) {
  const aResolved = a.status === 'done' || a.status === 'partial' || a.status === 'failed'
  const bResolved = b.status === 'done' || b.status === 'partial' || b.status === 'failed'
  if (aResolved && !bResolved) return 1   // a resolved, b pending → a goes after b
  if (!aResolved && bResolved) return -1  // a pending, b resolved → a goes before b
  // Same group (both pending or both resolved): ascending time; no time → goes last
  return timeToMin(a.time) - timeToMin(b.time)
}

export function useEventsToday(selectedDate: Date = new Date()) {
  const user = useCurrentUser()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['eventsToday', dateStr, user?.uid],
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return []

      const isViewingToday = isToday(selectedDate)

      // Get all events for user
      const q = query(collection(db, 'events'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CalendarEvent[]

      // Helper: check if an event occurs on a given date
      function occursOnDate(e: CalendarEvent, targetStr: string, targetDate: Date): boolean {
        if (!e.date || typeof e.date !== 'string') return false
        if (e.date === targetStr) return true
        if (!e.recurrence) return false
        if (targetStr < e.date) return false
        try {
          const evDate = parseISO(e.date)
          const targetDay = getDay(targetDate)
          const interval = e.recurrence.interval || 1
          const freq = e.recurrence.frequency
          if (freq === 'daily') return Math.abs(differenceInDays(targetDate, evDate)) % interval === 0
          if (freq === 'weekly') return Math.abs(differenceInWeeks(targetDate, evDate)) % interval === 0 && targetDay === getDay(evDate)
          if (freq === 'specific_days') return Math.abs(differenceInWeeks(targetDate, evDate)) % interval === 0 && !!e.recurrence.days_of_week?.includes(targetDay)
          if (freq === 'monthly') return getDate(targetDate) === getDate(evDate)
          if (freq === 'yearly') return getDate(targetDate) === getDate(evDate) && getMonth(targetDate) === getMonth(evDate)
        } catch { /* invalid date — skip */ }
        return false
      }

      // Filter events that occur ON the selected date
      const occurringToday = allEvents.filter(e => occursOnDate(e, dateStr, selectedDate))

      // Fetch each log by its known document ID — zero composite indexes needed
      // Use allSettled so a permission-denied on a non-existing doc doesn't abort all
      const logTodayResults = await Promise.allSettled(
        occurringToday.map(e => getDoc(doc(db, 'event_logs', `${e.id}_${dateStr}`)))
      )
      const logTodayDocs = logTodayResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)
      const logsTodayMap = new Map(
        logTodayDocs
          .filter(d => d.exists())
          .map(d => [d.data()!.event_id, d.data()!.status])
      )

      let todayResults: (CalendarEvent & { isOverdue: boolean })[] = occurringToday.map(e => ({
        ...e,
        date: dateStr,  // normalize to today so setEventStatus logs to the right date
        status: logsTodayMap.get(e.id) || 'none',
        isOverdue: false
      }))

      // --- OVERDUE LOGIC (Only if viewing today) ---
      // Looks back 30 days — same window as the agenda page — so nothing shown
      // there is "missing" from today's Resumo tab.
      let overdueResults: (CalendarEvent & { isOverdue: boolean })[] = []

      if (isViewingToday) {
        // pastDates[0] = yesterday (most recent), pastDates[29] = 30 days ago
        const pastDates = Array.from({ length: 30 }, (_, i) =>
          format(subDays(selectedDate, i + 1), 'yyyy-MM-dd')
        )

        // Single-field query + client-side date filter — no composite indexes needed
        const pastDatesSet = new Set(pastDates)
        const allLogsSnap = await getDocs(query(
          collection(db, 'event_logs'),
          where('user_id', '==', user.uid)
        ))
        const allPastLogDocs = allLogsSnap.docs.filter(d =>
          pastDatesSet.has(d.data().log_date)
        )

        // handledMap: eventId → Set of past dates that already have a real status
        // lastHandledMap: eventId → the most recent date (past or today) with a real status
        // — used to suppress OLD overdue occurrences once a more-recent one was logged,
        //   so the user isn't forced to retroactively mark every missed occurrence one-by-one.
        const handledMap = new Map<string, Set<string>>()
        const lastHandledMap = new Map<string, string>()
        allPastLogDocs.forEach(d => {
          const data = d.data()
          if (data.status !== 'none' && data.status !== 'todo') {
            if (!handledMap.has(data.event_id)) handledMap.set(data.event_id, new Set())
            handledMap.get(data.event_id)!.add(data.log_date)
            const cur = lastHandledMap.get(data.event_id)
            if (!cur || data.log_date > cur) lastHandledMap.set(data.event_id, data.log_date)
          }
        })

        // Also factor in today's logged status — if today's occurrence was handled,
        // ALL past overdue occurrences are suppressed (today is newer than any past date).
        logsTodayMap.forEach((status, eventId) => {
          if (status !== 'none' && status !== 'todo') {
            const cur = lastHandledMap.get(eventId)
            if (!cur || dateStr > cur) lastHandledMap.set(eventId, dateStr)
          }
        })

        // allPastMap: eventId → most recent past occurrence date (handled OR unhandled).
        // Iterates from most-recent to oldest and stops at the very first occurrence
        // found for each event. This is the single date we surface per event.
        //
        // Key difference from the old overdueMap approach: we no longer skip handled
        // dates — so the event STAYS in the results after being marked, letting the
        // user see their chosen status (CONCLUÍDO/PARCIAL/FALHOU) on reload.
        const allPastMap = new Map<string, string>()

        allEvents.forEach(e => {
          if (!e.date || typeof e.date !== 'string') return
          const lastHandled = lastHandledMap.get(e.id)

          for (const pDate of pastDates) {
            try {
              if (e.created_at && pDate < format(parseISO(e.created_at as string), 'yyyy-MM-dd')) continue
            } catch { continue }
            const pDateObj = parseISO(pDate)
            if (!occursOnDate(e, pDate, pDateObj)) continue
            allPastMap.set(e.id, pDate) // most recent past occurrence
            break
          }
        })

        // IDs of events that already have a today occurrence
        const todayEventIds = new Set(todayResults.map(e => e.id))

        // ── Case 1: event occurs today AND has a recent past occurrence
        //   → flag isOverdue only if the most recent past occurrence was NOT handled
        //     AND today hasn't been resolved yet (avoids ghost NÃO REALIZADO after marking)
        todayResults = todayResults.map(e => {
          const recentPastDate = allPastMap.get(e.id)
          if (!recentPastDate) return e
          const pastWasHandled = handledMap.get(e.id)?.has(recentPastDate) ?? false
          if (!pastWasHandled && (e.status === 'none' || !e.status)) {
            return { ...e, date: dateStr, isOverdue: true }
          }
          return e
        })

        // ── Case 2: event has a recent past occurrence but does NOT occur today
        //   → fetch the actual log status for each event so it persists after marking.
        //   → isOverdue = true only when unresolved (shows NÃO REALIZADO tag).
        //   → after marking done/partial/failed the status is read back from Firestore
        //     on every reload — the event stays visible with the correct badge.
        const case2Entries = [...allPastMap.entries()].filter(([id]) => !todayEventIds.has(id))

        const case2LogResults = await Promise.allSettled(
          case2Entries.map(([id, date]) => getDoc(doc(db, 'event_logs', `${id}_${date}`)))
        )

        case2Entries.forEach(([eventId, pDate], i) => {
          const event = allEvents.find(e => e.id === eventId)
          if (!event) return

          const result = case2LogResults[i]
          const logStatus = (result.status === 'fulfilled' && result.value.exists())
            ? (result.value.data().status || 'none')
            : 'none'

          const isResolved = logStatus === 'done' || logStatus === 'partial' || logStatus === 'failed'

          overdueResults.push({
            ...event,
            date: pDate,       // past date — marking logs to the correct day
            status: logStatus, // actual Firestore value, not hardcoded 'none'
            isOverdue: !isResolved, // NÃO REALIZADO tag only for unresolved events
          })
        })
      }

      const finalResults = [...todayResults, ...overdueResults]

      // Sort: pendentes primeiro (ordem crescente de horário), resolvidos no fundo (também crescente)
      return finalResults.sort(sortEvents)
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}
