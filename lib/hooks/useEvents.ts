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
  setDoc,
  Timestamp 
} from 'firebase/firestore'
import { format, getDay, parseISO, getDate, getMonth, differenceInWeeks, differenceInDays, isToday, subDays } from 'date-fns'
import { CalendarEvent, HabitStatus } from '@/types'

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
      qc.invalidateQueries({ queryKey: ['eventsToday'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  const user = auth.currentUser

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
export function useLogEvent() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    onMutate: async (vars: { eventId: string; status: string; logDate?: string }) => {
      if (!user) return
      const targetDate = vars.logDate || format(new Date(), 'yyyy-MM-dd')
      const queryKey = ['eventsToday', targetDate, user.uid]
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData(queryKey)
      qc.setQueryData(queryKey, (old: any[] | undefined) => {
        if (!old) return old
        return old.map(e => e.id === vars.eventId ? { ...e, status: vars.status } : e)
      })
      return { prev, queryKey }
    },
    onError: (_err: any, _vars: any, context: any) => {
      if (context?.prev) qc.setQueryData(context.queryKey, context.prev)
    },
    mutationFn: async ({ eventId, status, logDate }: {
      eventId: string;
      status: string;
      logDate?: string;
    }) => {
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
    onSuccess: (_, variables) => {
      const targetDate = variables.logDate || format(new Date(), 'yyyy-MM-dd')
      qc.invalidateQueries({ queryKey: ['eventsToday', targetDate, user?.uid] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useEventsToday(selectedDate: Date = new Date()) {
  const user = auth.currentUser
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['eventsToday', dateStr, user?.uid],
    queryFn: async () => {
      if (!user) return []

      const todayDay = getDay(selectedDate)
      const isViewingToday = isToday(selectedDate)

      // Get all events for user
      const q = query(collection(db, 'events'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CalendarEvent[]

      // Filter events that occur ON the selected date
      const occurringToday = allEvents.filter(e => {
        if (e.date === dateStr) return true
        if (e.recurrence) {
          const evDate = parseISO(e.date)
          if (dateStr < e.date) return false
          
          const interval = e.recurrence.interval || 1
          const freq = e.recurrence.frequency

          if (freq === 'daily') {
             const diff = Math.abs(differenceInDays(selectedDate, evDate))
             return diff % interval === 0
          }
          if (freq === 'weekly') {
             const diff = Math.abs(differenceInWeeks(selectedDate, evDate))
             return diff % interval === 0 && todayDay === getDay(evDate)
          }
          if (freq === 'specific_days') {
             const diff = Math.abs(differenceInWeeks(selectedDate, evDate))
             return diff % interval === 0 && e.recurrence.days_of_week?.includes(todayDay)
          }
          if (freq === 'monthly') return getDate(selectedDate) === getDate(evDate)
          if (freq === 'yearly') return getDate(selectedDate) === getDate(evDate) && getMonth(selectedDate) === getMonth(evDate)
        }
        return false
      })

      // Get logs for the selected date
      const logsTodayQ = query(
        collection(db, 'event_logs'),
        where('user_id', '==', user.uid),
        where('log_date', '==', dateStr)
      )
      const logsTodaySnap = await getDocs(logsTodayQ)
      const logsTodayMap = new Map(logsTodaySnap.docs.map(d => [d.data().event_id, d.data().status]))

      const todayResults = occurringToday.map(e => ({
        ...e,
        status: logsTodayMap.get(e.id) || 'none',
        isOverdue: false
      }))

      // --- OVERDUE LOGIC (Only if viewing today) ---
      let overdueResults: (CalendarEvent & { isOverdue: boolean })[] = []
      if (isViewingToday) {
        // Look back up to 7 days for uncompleted items
        const pastDates = Array.from({ length: 7 }, (_, i) => format(subDays(selectedDate, i + 1), 'yyyy-MM-dd'))
        
        // Optimize: Fetch logs for all past dates in one go if possible, or filter in-app
        const logsPastQ = query(
          collection(db, 'event_logs'),
          where('user_id', '==', user.uid),
          where('log_date', 'in', pastDates)
        )
        const logsPastSnap = await getDocs(logsPastQ)
        
        // Map: eventId -> Set of COMPLETED/FAILED/PARTIAL dates (any status that isn't 'none' or 'todo')
        const handledMap = new Map<string, Set<string>>()
        logsPastSnap.docs.forEach(d => {
          const data = d.data()
          if (data.status !== 'none' && data.status !== 'todo') {
            if (!handledMap.has(data.event_id)) handledMap.set(data.event_id, new Set())
            handledMap.get(data.event_id)!.add(data.log_date)
          }
        })

        // Check each event for past occurrences that aren't handled
        allEvents.forEach(e => {
          pastDates.forEach(pDate => {
             const pDateObj = parseISO(pDate)
             const pDay = getDay(pDateObj)
             let occursOnPastDate = false

             // Skip if event was created after the past date
             if (e.created_at && pDate < format(parseISO(e.created_at), 'yyyy-MM-dd')) return

             if (e.date === pDate) occursOnPastDate = true
             else if (e.recurrence) {
                const evDate = parseISO(e.date)
                if (pDate >= e.date) {
                   const interval = e.recurrence.interval || 1
                   const freq = e.recurrence.frequency
                   if (freq === 'daily') occursOnPastDate = (Math.abs(differenceInDays(pDateObj, evDate)) % interval === 0)
                   if (freq === 'weekly') occursOnPastDate = (Math.abs(differenceInWeeks(pDateObj, evDate)) % interval === 0 && pDay === getDay(evDate))
                   if (freq === 'specific_days') occursOnPastDate = (Math.abs(differenceInWeeks(pDateObj, evDate)) % interval === 0 && !!e.recurrence.days_of_week?.includes(pDay))
                   if (freq === 'monthly') occursOnPastDate = (getDate(pDateObj) === getDate(evDate))
                   if (freq === 'yearly') occursOnPastDate = (getDate(pDateObj) === getDate(evDate) && getMonth(pDateObj) === getMonth(evDate))
                }
             }

             if (occursOnPastDate && !handledMap.get(e.id)?.has(pDate)) {
                // Not handled on this past date -> OVERDUE
                overdueResults.push({
                  ...e,
                  date: pDate, 
                  status: 'none',
                  isOverdue: true
                })
             }
          })
        })
      }

      const finalResults = [...todayResults, ...overdueResults]

      return finalResults.sort((a, b) => {
        // Overdue items first? Or just by time?
        // Let's sort by time, but keep overdue indicators
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
