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
import { format, getDay, parseISO, getDate, getMonth, differenceInWeeks, differenceInDays } from 'date-fns'
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
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['eventsToday', targetDate] })
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

      // Get all events for user
      const q = query(collection(db, 'events'), where('user_id', '==', user.uid))
      const snap = await getDocs(q)
      const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CalendarEvent[]

      // Filter events that occur on this date
      const occurringEvents = allEvents.filter(e => {
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

      // Get logs for this date
      const logsQ = query(
        collection(db, 'event_logs'),
        where('user_id', '==', user.uid),
        where('log_date', '==', dateStr)
      )
      const logsSnap = await getDocs(logsQ)
      const logsMap = new Map(logsSnap.docs.map(d => [d.data().event_id, d.data().status]))

      return occurringEvents.map(e => ({
        ...e,
        status: logsMap.get(e.id) || 'none'
      })).sort((a, b) => {
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
