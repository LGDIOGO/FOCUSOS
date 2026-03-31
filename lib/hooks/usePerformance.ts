'use client'

import { useQuery } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isPast, isToday, parseISO, getDay } from 'date-fns'
import { Habit, Task, CalendarEvent, HabitStatus } from '@/types'
import { calculateProgress, calculateWeeklyProgress } from '@/lib/utils/performance'

export function usePerformanceMetrics() {
  const user = auth.currentUser

  return useQuery({
    queryKey: ['performance-metrics', user?.uid],
    queryFn: async () => {
      if (!user) return { daily: 0, weekly: 0 }

      const today = new Date()
      const start = startOfWeek(today, { weekStartsOn: 0 }) // Sunday 00:00
      const end = endOfWeek(today, { weekStartsOn: 0 }) // Saturday 23:59

      const startISO = start.toISOString()
      const todayStr = format(today, 'yyyy-MM-dd')
      const days = eachDayOfInterval({ start, end: today })

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
        where('user_id', '==', user.uid)
      )
      const logsSnap = await getDocs(logsQuery)
      const weekStartStr = format(start, 'yyyy-MM-dd')
      const weekEndStr = format(today, 'yyyy-MM-dd')
      
      const logsMap = new Map(
        logsSnap.docs
          .map(d => d.data())
          .filter(d => d.log_date >= weekStartStr && d.log_date <= weekEndStr)
          .map(d => [`${d.habit_id}_${d.log_date}`, d.status])
      )

      // 2. Fetch Tasks completed in the week
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('user_id', '==', user.uid)
      )
      const tasksSnap = await getDocs(tasksQuery)
      const allTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]

      // 3. Fetch Events for the week
      const eventsQuery = query(
        collection(db, 'events'),
        where('user_id', '==', user.uid)
      )
      const eventsSnap = await getDocs(eventsQuery)
      const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as CalendarEvent[]

      // Calculate Scores using calculateProgress utility
      const todayData = {
        habits: habits
          .filter(h => {
             if (h.start_date && todayStr < h.start_date) return false
             if (h.end_date && todayStr > h.end_date) return false
             if (h.recurrence?.frequency === 'specific_days') {
               return h.recurrence.days_of_week?.includes(getDay(today)) ?? false
             }
             return true
          })
          .map(h => ({ status: logsMap.get(`${h.id}_${todayStr}`) || 'none' })),
        tasks: allTasks.filter(t => (t.due_date || (t.completed_at ? t.completed_at.split('T')[0] : null)) === todayStr),
        events: allEvents.filter(e => e.date === todayStr)
      }

      const daily = calculateProgress(todayData.habits, todayData.tasks, todayData.events)

      // Weekly calculation
      const weeklyData = days.map(day => {
        const dStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = getDay(day)
        return {
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
          tasks: allTasks.filter(t => (t.due_date || (t.completed_at ? t.completed_at.split('T')[0] : null)) === dStr),
          events: allEvents.filter(e => e.date === dStr)
        }
      })

      const weekly = calculateWeeklyProgress(weeklyData)

      return { daily, weekly }
    },
    enabled: !!user,
    staleTime: 10_000,
  })
}
