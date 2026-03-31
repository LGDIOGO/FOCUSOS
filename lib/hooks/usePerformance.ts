'use client'

import { useQuery } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isPast, isToday, parseISO, getDay, addDays } from 'date-fns'
import { Habit, Task, CalendarEvent, HabitStatus } from '@/types'
import { calculateProgress, calculateWeeklyProgress } from '@/lib/utils/performance'

export function usePerformanceMetrics(weekOffset: number = 0) {
  const user = auth.currentUser

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

      // 1. Fetch Habits & Logs for the week
      const habitsQuery = query(
        collection(db, 'habits'),
        where('user_id', '==', user.uid),
        where('is_archived', '==', false)
      )
      const habitsSnap = await getDocs(habitsQuery)
      const habits = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Habit[]

      const logsQuery = query(
        collection(db, 'habit_logs'),
        where('user_id', '==', user.uid),
        where('log_date', '>=', startStr),
        where('log_date', '<=', endStr)
      )
      const logsSnap = await getDocs(logsQuery)
      
      const logsMap = new Map(
        logsSnap.docs
          .map(d => d.data())
          .map(d => [`${d.habit_id}_${d.log_date}`, d.status])
      )

      // 2. Fetch Tasks for the week
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('user_id', '==', user.uid),
        where('due_date', '>=', startStr),
        where('due_date', '<=', endStr)
      )
      const tasksSnap = await getDocs(tasksQuery)
      const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]

      // 3. Fetch Events for the week
      const eventsQuery = query(
        collection(db, 'events'),
        where('user_id', '==', user.uid),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
      )
      const eventsSnap = await getDocs(eventsQuery)
      const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as CalendarEvent[]

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
    staleTime: 10_000,
  })
}
