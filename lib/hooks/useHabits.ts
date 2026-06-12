'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc, 
  orderBy, 
  Timestamp,
  increment 
} from 'firebase/firestore'
import { format, getDay, parseISO, getDate, getMonth, differenceInWeeks } from 'date-fns'
import { Habit } from '@/types'
import {
  isScheduledOn as isScheduledOnUtil,
  getPrevScheduledDate,
  getScheduledDatesNewestFirst,
  computeStreakFromDates,
  HabitScheduleData,
} from '@/lib/utils/habitSchedule'

export function useHabitsHistory(startDate?: string, endDate?: string) {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['habits', 'history', user?.uid, startDate, endDate],
    queryFn: async () => {
      if (!user) return []

      const qStart = startDate || '2000-01-01'
      const qEnd = endDate || '2100-12-31'

      // Single-field query — no composite index required
      const q = query(
        collection(db, 'habit_logs'),
        where('user_id', '==', user.uid)
      )
      const snap = await getDocs(q)
      const logs = snap.docs.map(d => d.data())
      // Filter date range and status client-side
      return logs.filter(l =>
        (l.status === 'done' || l.status === 'partial') &&
        l.log_date >= qStart &&
        l.log_date <= qEnd
      )
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

// For the management page (full list)
export function useHabits() {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['habits', 'all', user?.uid],
    queryFn: async () => {
      if (!user) return []

      // Single-field query — no composite index required
      const q = query(
        collection(db, 'habits'),
        where('user_id', '==', user.uid)
      )
      const snap = await getDocs(q)
      // Filter archived client-side
      const habits = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((h: any) => !h.is_archived) as Habit[]
      return habits.sort((a, b) => {
        if (a.time && b.time) {
          const tCmp = a.time.localeCompare(b.time)
          if (tCmp !== 0) return tCmp
        }
        if (a.time && !b.time) return -1
        if (!a.time && b.time) return 1
        return (a.sort_order || 0) - (b.sort_order || 0)
      })
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useHabitsToday(selectedDate: Date = new Date()) {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['habits', 'date', format(selectedDate, 'yyyy-MM-dd'), user?.uid],
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return []

      const todayStr = format(selectedDate, 'yyyy-MM-dd')
      const todayDay = getDay(selectedDate)

      // Single-field query — no composite index required; filter archived client-side
      const habitsQuery = query(
        collection(db, 'habits'),
        where('user_id', '==', user.uid)
      )
      const habitsSnap = await getDocs(habitsQuery)
      const allHabits = habitsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((h: any) => !h.is_archived) as Habit[]
      
      const sortedHabits = allHabits.sort((a, b) => {
        if (a.time && b.time) {
          const tCmp = a.time.localeCompare(b.time)
          if (tCmp !== 0) return tCmp
        }
        if (a.time && !b.time) return -1
        if (!a.time && b.time) return 1
        return (a.sort_order || 0) - (b.sort_order || 0)
      })

      const filteredHabits = sortedHabits.filter(h => {
        if (h.start_date && todayStr < h.start_date) return false
        if (h.end_date && todayStr > h.end_date) return false
        if (!h.recurrence) return true
        
        const baseDateStr = h.start_date || h.created_at.split('T')[0]
        if (todayStr < baseDateStr) return false

        const freq = h.recurrence.frequency
        const evDate = parseISO(baseDateStr)
        const interval = h.recurrence.interval || 1
        
        if (freq === 'daily') return true
        if (freq === 'specific_days') {
          if (interval > 1) {
            const diffWeeks = Math.abs(differenceInWeeks(selectedDate, evDate))
            if (diffWeeks % interval !== 0) return false
          }
          return h.recurrence.days_of_week?.includes(todayDay) ?? false
        }
        if (freq === 'weekly') {
           if (interval > 1) {
              const diffWeeks = Math.abs(differenceInWeeks(selectedDate, evDate));
              if (diffWeeks % interval !== 0) return false;
           }
           return todayDay === getDay(evDate)
        }
        if (freq === 'monthly') return getDate(selectedDate) === getDate(evDate)
        if (freq === 'yearly') return getDate(selectedDate) === getDate(evDate) && getMonth(selectedDate) === getMonth(evDate)
        
        return true
      })

      // Fetch each log by its known document ID — zero composite indexes needed
      // Use allSettled so a permission-denied on a non-existing doc doesn't abort all
      const logResults = await Promise.allSettled(
        filteredHabits.map(h => getDoc(doc(db, 'habit_logs', `${h.id}_${todayStr}`)))
      )
      const logDocs = logResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)
      const logsMap = new Map(
        logDocs
          .filter(d => d.exists())
          .map(d => [d.data()!.habit_id, d.data()])
      )

      return filteredHabits.map(h => ({
        ...h,
        status: logsMap.get(h.id)?.status || 'none',
        count: logsMap.get(h.id)?.count || 0,
        note: logsMap.get(h.id)?.note,
      })) as Habit[]
    },
    enabled: !!user,
  })
}

export function useAddHabit() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    mutationFn: async (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'status' | 'streak'> & {
      color: string
      emoji: string
      category_id?: string
    }) => {
      if (!user) throw new Error('Not authenticated')
      
      await addDoc(collection(db, 'habits'), {
        ...habit,
        user_id: user.uid,
        status: 'none',
        streak: 0,
        is_archived: false,
        created_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Habit> & { id: string }) => {
      const ref = doc(db, 'habits', id)
      await updateDoc(ref, data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  const user = useCurrentUser()

  return useMutation({
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['habits'] })
      // Snapshot all habits caches for rollback
      const snapshots = qc.getQueriesData<any[]>({ queryKey: ['habits'] })
      // Optimistically remove the habit from every cached list immediately
      snapshots.forEach(([key, old]) => {
        if (old) qc.setQueryData(key, old.filter((h: any) => h.id !== id))
      })
      return { snapshots }
    },
    onError: (_err, _id, context: any) => {
      context?.snapshots?.forEach(([key, old]: [unknown, unknown]) => qc.setQueryData(key as any, old))
    },
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'habits', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

// Schedule-aware streak recomputation from Firestore logs.
// Reads only scheduled dates (not every calendar day) — correct for weekly/specific_days habits.
async function computeStreakFromLogs(
  habitId: string,
  habitData: HabitScheduleData,
  excludeDate?: string
): Promise<{ streak: number; lastDate: string | null }> {
  const user = auth.currentUser
  if (!user) return { streak: 0, lastDate: null }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const scheduledDates = getScheduledDatesNewestFirst(habitData, todayStr, 90)
  if (scheduledDates.length === 0) return { streak: 0, lastDate: null }

  const snaps = await Promise.all(
    scheduledDates.map(date => getDoc(doc(db, 'habit_logs', `${habitId}_${date}`)))
  )

  const doneDates = new Set<string>()
  snaps.forEach((snap, i) => {
    if (snap.exists() && snap.data().status === 'done') {
      doneDates.add(scheduledDates[i])
    }
  })

  return computeStreakFromDates(scheduledDates, doneDates, todayStr, excludeDate)
}

export function useLogHabit() {
  const qc = useQueryClient()

  return useMutation({
    onMutate: async (vars: any) => {
      const user = auth.currentUser
      if (!user) return
      const targetDate = vars.logDate || format(new Date(), 'yyyy-MM-dd')
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const isBackdating = targetDate < todayStr
      const todayKey = ['habits', 'date', targetDate, user.uid]
      const allKey = ['habits', 'all', user.uid]

      await qc.cancelQueries({ queryKey: todayKey })
      await qc.cancelQueries({ queryKey: allKey })

      const previousHabits = qc.getQueryData(todayKey)
      const previousAllHabits = qc.getQueryData(allKey)

      const prevHabit = (previousHabits as Habit[] | undefined)?.find(h => h.id === vars.habitId)
      const newStatus = vars.status
      const prevStatus = (prevHabit as any)?.status || 'none'

      // Optimistic streak — schedule-aware, no Firestore reads
      let newStreak = prevHabit?.streak || 0
      let newLastDate: string | null = (prevHabit?.last_completed_date as string | null | undefined) ?? null

      if (!isBackdating && prevHabit) {
        if (newStatus === 'failed') {
          newStreak = 0
          newLastDate = null
        } else if (newStatus === 'done' && prevStatus !== 'done') {
          const prevScheduled = getPrevScheduledDate(prevHabit as HabitScheduleData, targetDate)
          if (!newLastDate) {
            newStreak = 1
          } else if (newLastDate === targetDate) {
            // Same-day re-mark — keep streak as-is
          } else if (prevScheduled && newLastDate === prevScheduled) {
            // Last done was the previous scheduled occurrence — extend streak
            newStreak += 1
          } else {
            // Gap — reset
            newStreak = 1
          }
          newLastDate = targetDate
        } else if (prevStatus === 'done' && newStatus !== 'done' && newStatus !== 'failed') {
          // Undoing done — approximate (server will recompute exact value)
          if (newLastDate === targetDate) {
            newStreak = Math.max(0, newStreak - 1)
            const prevScheduled = getPrevScheduledDate(prevHabit as HabitScheduleData, targetDate)
            newLastDate = newStreak > 0 ? (prevScheduled ?? null) : null
          }
        }
      }

      // Update habit list for the selected date view
      qc.setQueryData(todayKey, (old: Habit[] | undefined) => {
        if (!old) return old
        return old.map(h => {
          if (h.id !== vars.habitId) return h
          if (isBackdating) {
            // Only update status — streak recomputed server-side after invalidation
            return { ...h, status: vars.status }
          }
          return { ...h, status: newStatus, streak: newStreak, last_completed_date: newLastDate }
        })
      })

      // Update all-habits list (skip streak for backdating)
      qc.setQueryData(allKey, (old: Habit[] | undefined) => {
        if (!old || isBackdating) return old
        return old.map(h => {
          if (h.id !== vars.habitId) return h
          return { ...h, streak: newStreak, last_completed_date: newLastDate }
        })
      })

      return { previousHabits, previousAllHabits, todayKey, allKey }
    },
    onError: (err, newTodo, context: any) => {
      if (context?.previousHabits) qc.setQueryData(context.todayKey, context.previousHabits)
      if (context?.previousAllHabits) qc.setQueryData(context.allKey, context.previousAllHabits)
    },
    mutationFn: async ({ habitId, status, logDate, note, linkedGoalId, goalImpact = 1 }: {
      habitId: string;
      status: string;
      logDate?: string;
      note?: string;
      linkedGoalId?: string;
      goalImpact?: number;
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const targetDate = logDate || format(new Date(), 'yyyy-MM-dd')
      const logId = `${habitId}_${targetDate}`
      const logRef = doc(db, 'habit_logs', logId)

      // 1. Get previous status to calculate progress change
      const prevDoc = await getDoc(logRef)
      const prevStatus = prevDoc.exists() ? prevDoc.data().status : 'none'

      // 2. Perform log update
      await setDoc(logRef, {
        user_id: user.uid,
        habit_id: habitId,
        log_date: targetDate,
        status,
        note: note || null,
        logged_at: Timestamp.now()
      }, { merge: true })

      // 3. Update linked goal if applicable
      if (linkedGoalId && status !== prevStatus) {
        let delta = 0
        
        // If transitioning TO 'done', add impact
        if (status === 'done' && prevStatus !== 'done') {
          delta = goalImpact
        } 
        // If transitioning FROM 'done', subtract impact
        else if (status !== 'done' && prevStatus === 'done') {
          delta = -goalImpact
        }

        if (delta !== 0) {
          const goalRef = doc(db, 'goals', linkedGoalId)
          await updateDoc(goalRef, {
            current_value: increment(delta),
            updated_at: new Date().toISOString()
          })
        }
      }

        // 4. Update Habit Streak — schedule-aware for all recurrence types
        const habitRef = doc(db, 'habits', habitId)
        const habitDoc = await getDoc(habitRef)

        if (habitDoc.exists()) {
          const habitData = habitDoc.data() as HabitScheduleData & {
            streak: number
            last_completed_date?: string | null
          }
          const currentStreak = habitData.streak || 0
          const lastDate = (habitData.last_completed_date as string | null | undefined) ?? null

          let newStreak = currentStreak
          let newLastDate: string | null = lastDate

          const todayStr = format(new Date(), 'yyyy-MM-dd')
          const isBackdating = targetDate < todayStr

          if (status === 'failed') {
            newStreak = 0
            newLastDate = null
          } else if (status === 'done' && prevStatus !== 'done') {
            if (isBackdating) {
              // Recompute from logs — handles gap-filling, out-of-order marking, midnight recovery
              const computed = await computeStreakFromLogs(habitId, habitData)
              newStreak = computed.streak
              newLastDate = computed.lastDate
            } else {
              // Marking today: schedule-aware prev-day check (no extra Firestore reads)
              const prevScheduled = getPrevScheduledDate(habitData, targetDate)
              if (!lastDate) {
                newStreak = 1
              } else if (lastDate === targetDate) {
                // Already counted (same day re-check) — keep streak
              } else if (prevScheduled && lastDate === prevScheduled) {
                // Completed the previous scheduled occurrence → extend streak
                newStreak = currentStreak + 1
              } else {
                // Missed at least one scheduled occurrence → reset
                newStreak = 1
              }
              newLastDate = targetDate
            }
          } else if (prevStatus === 'done' && status !== 'done' && status !== 'failed') {
            // Undoing done → recompute excluding this date
            const computed = await computeStreakFromLogs(habitId, habitData, targetDate)
            newStreak = computed.streak
            newLastDate = computed.lastDate
          }

          if (newStreak !== currentStreak || newLastDate !== lastDate) {
            await updateDoc(habitRef, { streak: newStreak, last_completed_date: newLastDate })
          }
        }
    },
    onSuccess: () => {
      // Invalidação ampla — não depende de uid no cache key
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics'] })
    },
  })
}
