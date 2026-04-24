'use client'

import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/firebase/config'
import { useCurrentUser } from '@/lib/context/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isPast, isToday, parseISO, getDay, addDays } from 'date-fns'
import { Habit, Task, CalendarEvent, HabitStatus } from '@/types'
import { calculateProgress, calculateWeeklyProgress } from '@/lib/utils/performance'

export function usePerformanceMetrics(weekOffset: number = 0) {
  const user = useCurrentUser()

  return useQuery({
    queryKey: ['performance-metrics', user?.uid, weekOffset],
    queryFn: async () => {
      if (!user) return { daily: 0, weekly: 0, dailyScores: {} as Record<string, number> }

      const today = new Date()
      const start = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 }) 
      const end = endOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 }) 

      const days = eachDayOfInterval({ start, end })
      const startStr = format(start, 'yyyy-MM-dd')
      const endStr = format(end, 'yyyy-MM-dd')
      const todayStr = format(today, 'yyyy-MM-dd')

      // All queries use a single where('user_id') — no composite indexes needed.
      // Date/archive filtering happens client-side.

      // 1. Fetch Habits & Logs for the week
      const [habitsSnap, logsSnap, tasksSnap, eventsSnap] = await Promise.all([
        getDocs(query(collection(db, 'habits'), where('user_id', '==', user.uid))),
        getDocs(query(collection(db, 'habit_logs'), where('user_id', '==', user.uid))),
        getDocs(query(collection(db, 'tasks'), where('user_id', '==', user.uid))),
        getDocs(query(collection(db, 'events'), where('user_id', '==', user.uid))),
      ])

      // Filter archived habits client-side
      const habits = habitsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((h: any) => !h.is_archived) as Habit[]

      // Filter logs to the current week client-side
      const logsMap = new Map(
        logsSnap.docs
          .map(d => d.data())
          .filter(d => d.log_date >= startStr && d.log_date <= endStr)
          .map(d => [`${d.habit_id}_${d.log_date}`, d.status])
      )

      // 2. Filter Tasks to the current week client-side
      const allTasks = tasksSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((t: any) => t.due_date >= startStr && t.due_date <= endStr) as Task[]

      // 3. Filter Events to the current week client-side
      const allEvents = eventsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((e: any) => e.date >= startStr && e.date <= endStr) as CalendarEvent[]

      // Calculate Scores per day
      const dailyScores: Record<string, number> = {}
      
      const daysData = days.map(day => {
        const dStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = getDay(day)
        
        const dayMetrics = {
          habits: habits
            .filter(h => {
              if (h.start_date && dStr < h.start_date) return false
              if (h.end_date && dStr > h.end_date) return false
              if (h.recurrence?.frequency === 'specific_days') {
                return h.recurrence.days_of_week?.includes(dayOfWeek) ?? false
              }
              return true
            })
            .map(h => ({ status: logsMap.get(`${h.id}_${dStr}`) || 'none' })),
          tasks: allTasks.filter(t => t.due_date === dStr),
          events: allEvents.filter(e => e.date === dStr)
        }
        
        const score = calculateProgress(dayMetrics.habits, dayMetrics.tasks, dayMetrics.events)
        dailyScores[dStr] = score
        
        return dayMetrics
      })

      const daily = dailyScores[todayStr] || 0
      const weekly = calculateWeeklyProgress(daysData)

      return { daily, weekly, dailyScores }
    },
    enabled: !!user,
    staleTime: 300_000, // 5 minutes
    gcTime: 600_000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}
