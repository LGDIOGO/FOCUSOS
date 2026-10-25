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
import { occursOn } from '@/lib/utils/recurrence'
import { decideStreakUpdate } from '@/lib/utils/streakRule'
import { scheduleCalendarSync } from '@/lib/hooks/useGoogleCalendar'
import { Habit, HabitLog } from '@/types'
import {
  isScheduledOn as isScheduledOnUtil,
  getPrevScheduledDate,
  getScheduledDatesNewestFirst,
  computeStreakFromDates,
  HabitScheduleData,
} from '@/lib/utils/habitSchedule'

/**
 * @param includeAll mantém também os logs 'failed'. A lista do histórico mostra
 *   só o que foi cumprido, mas a grade precisa das falhas para pintar vermelho
 *   e distinguir "falhei" de "nem estava previsto".
 */
export function useHabitsHistory(startDate?: string, endDate?: string, includeAll = false) {
  const user = useCurrentUser()
  return useQuery({
    queryKey: ['habits', 'history', user?.uid, startDate, endDate, includeAll],
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
      const logs = snap.docs.map(d => d.data() as HabitLog)
      // Filter date range and status client-side
      return logs.filter(l =>
        (includeAll
          ? l.status === 'done' || l.status === 'partial' || l.status === 'failed'
          : l.status === 'done' || l.status === 'partial') &&
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

        // Hábitos criados antes de `start_date` existir caem no dia de criação.
        const baseDateStr = h.start_date || h.created_at.split('T')[0]
        return occursOn(h.recurrence, baseDateStr, todayStr, h.end_date)
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
      scheduleCalendarSync('habits')
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
      scheduleCalendarSync('habits')
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
      const todayKey = ['habits', 'date', targetDate, user.uid]
      const allKey = ['habits', 'all', user.uid]

      await qc.cancelQueries({ queryKey: todayKey })
      await qc.cancelQueries({ queryKey: allKey })

      const previousHabits = qc.getQueryData(todayKey)
      const previousAllHabits = qc.getQueryData(allKey)

      const prevHabit = (previousHabits as Habit[] | undefined)?.find(h => h.id === vars.habitId)
      const newStatus = vars.status
      const prevStatus = (prevHabit as any)?.status || 'none'

      // Optimistic streak — regra única em lib/utils/streakRule (a mesma do servidor)
      let newStreak = prevHabit?.streak || 0
      let newLastDate: string | null = (prevHabit?.last_completed_date as string | null | undefined) ?? null
      let touchStreak = false

      if (prevHabit) {
        const action = decideStreakUpdate({
          targetDate,
          today: todayStr,
          status: newStatus,
          previousStatus: prevStatus,
          currentStreak: newStreak,
          lastCompletedDate: newLastDate,
          prevScheduledDate: () => getPrevScheduledDate(prevHabit as HabitScheduleData, targetDate),
        })
        if (action.type === 'set') {
          newStreak = action.streak
          newLastDate = action.lastDate
          touchStreak = true
        } else if (action.type === 'recompute' && action.approximate) {
          // aproximado; o servidor recalcula o valor exato
          newStreak = action.approximate.streak
          newLastDate = action.approximate.lastDate
          touchStreak = true
        }
      }

      // Update habit list for the selected date view
      qc.setQueryData(todayKey, (old: Habit[] | undefined) => {
        if (!old) return old
        return old.map(h => {
          if (h.id !== vars.habitId) return h
          if (!touchStreak) {
            // Only update status — streak recomputed server-side after invalidation
            return { ...h, status: vars.status }
          }
          return { ...h, status: newStatus, streak: newStreak, last_completed_date: newLastDate }
        })
      })

      // Update all-habits list (skip streak for backdating)
      qc.setQueryData(allKey, (old: Habit[] | undefined) => {
        if (!old || !touchStreak) return old
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

          // Regra única (futuro: keep; passado: recompute; hoje: set/recompute/keep).
          // Marcar um dia que não é hoje nunca carimba o estado de hoje.
          const action = decideStreakUpdate({
            targetDate,
            today: format(new Date(), 'yyyy-MM-dd'),
            status,
            previousStatus: prevStatus,
            currentStreak,
            lastCompletedDate: lastDate,
            prevScheduledDate: () => getPrevScheduledDate(habitData, targetDate),
          })
          if (action.type === 'set') {
            newStreak = action.streak
            newLastDate = action.lastDate
          } else if (action.type === 'recompute') {
            const computed = await computeStreakFromLogs(habitId, habitData, action.excludeDate)
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
