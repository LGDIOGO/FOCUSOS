'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
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

// For the management page (full list)
export function useHabits() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['habits', 'all', user?.uid],
    queryFn: async () => {
      if (!user) return []

      const q = query(
        collection(db, 'habits'),
        where('user_id', '==', user.uid),
        where('is_archived', '==', false)
      )
      const snap = await getDocs(q)
      const habits = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Habit[]
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
    staleTime: 5_000,
  })
}

export function useHabitsToday(selectedDate: Date = new Date()) {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['habits', 'date', format(selectedDate, 'yyyy-MM-dd'), user?.uid],
    queryFn: async () => {
      if (!user) return []

      const todayStr = format(selectedDate, 'yyyy-MM-dd')
      const todayDay = getDay(selectedDate)

      const habitsQuery = query(
        collection(db, 'habits'),
        where('user_id', '==', user.uid),
        where('is_archived', '==', false)
      )
      const habitsSnap = await getDocs(habitsQuery)
      const allHabits = habitsSnap.docs
        .map(d => ({ id: d.id, ...d.data() })) as Habit[]
      
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
        if (freq === 'specific_days') return h.recurrence.days_of_week?.includes(todayDay) ?? false
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

      const logsQuery = query(
        collection(db, 'habit_logs'),
        where('user_id', '==', user.uid),
        where('log_date', '==', todayStr)
      )
      const logsSnap = await getDocs(logsQuery)
      const logsMap = new Map(logsSnap.docs.map(d => [d.data().habit_id, d.data()]))

      return filteredHabits.map(h => ({
        ...h,
        status: logsMap.get(h.id)?.status || 'none',
        count: logsMap.get(h.id)?.count || 0,
        note: logsMap.get(h.id)?.note,
      })) as Habit[]
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

export function useAddHabit() {
  const qc = useQueryClient()
  const user = auth.currentUser

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
  const user = auth.currentUser

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
  const user = auth.currentUser

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'habits', id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}

export function useLogHabit() {
  const qc = useQueryClient()
  const user = auth.currentUser

  return useMutation({
    mutationFn: async ({ habitId, status, logDate, note, linkedGoalId, goalImpact = 1 }: { 
      habitId: string; 
      status: string; 
      logDate?: string;
      note?: string;
      linkedGoalId?: string;
      goalImpact?: number;
    }) => {
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

        // 4. Update Habit Streak (Ofensiva)
        const isSuccess = (s: string) => s === 'done' || s === 'partial'
        const habitRef = doc(db, 'habits', habitId)
        const habitDoc = await getDoc(habitRef)
        
        if (habitDoc.exists()) {
          const habitData = habitDoc.data()
          let currentStreak = habitData.streak || 0
          const lastDate = habitData.last_completed_date
          
          let newStreak = currentStreak
          let newLastDate = lastDate

          const { differenceInDays, parseISO } = await import('date-fns')

          // Status mudou para um estado de SUCESSO?
          if (isSuccess(status) && !isSuccess(prevStatus)) {
             if (!lastDate) {
               newStreak = 1
               newLastDate = targetDate
             } else {
               const diff = differenceInDays(parseISO(targetDate), parseISO(lastDate))
               if (diff === 1) {
                 newStreak += 1
                 newLastDate = targetDate
               } else if (diff > 1) {
                 newStreak = 1
                 newLastDate = targetDate
               } else if (diff === 0) {
                 if (newStreak === 0) newStreak = 1
                 newLastDate = targetDate
               }
             }
          } 
          // Status mudou de SUCESSO para NAO SUCESSO? (Exceto falha direta)
          else if (!isSuccess(status) && isSuccess(prevStatus) && status !== 'failed') {
             if (lastDate === targetDate) {
               newStreak = Math.max(0, newStreak - 1)
               // Tentar recuperar a data anterior seria complexo sem histórico completo, 
               // então apenas resetamos a data se a ofensiva zerar.
               if (newStreak === 0) newLastDate = null
             }
          } 
          // Falha direta ou inatividade
          else if (status === 'failed') {
             newStreak = 0
             // Mantemos a lastDate mas a ofensiva zerou
          }
          
          if (newStreak !== currentStreak || newLastDate !== lastDate) {
             await updateDoc(habitRef, { streak: newStreak, last_completed_date: newLastDate })
          }
        }
    },
    onSuccess: (_, variables) => {
      const targetDate = variables.logDate || format(new Date(), 'yyyy-MM-dd')
      qc.invalidateQueries({ queryKey: ['habits', 'date', targetDate, user?.uid] })
      qc.invalidateQueries({ queryKey: ['performance-metrics', user?.uid] })
    },
  })
}
