'use client'

import { useQuery } from '@tanstack/react-query'
import { auth, db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { startOfWeek, endOfWeek, format, eachDayOfInterval, isPast, isToday, parseISO, getDay } from 'date-fns'
import { Habit, Task, CalendarEvent, HabitStatus } from '@/types'

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

      // Calculate Scores
      const days = eachDayOfInterval({ start, end: today })
      let totalPoints = 0
      let maxPoints = 0

      let todayPoints = 0
      let todayMax = 0

      days.forEach(day => {
        const dStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = getDay(day)
        const isTdy = isToday(day)

        // Habits contribution
        habits.forEach(h => {
          // Check if habit is active on this day
          if (h.start_date && dStr < h.start_date) return
          if (h.end_date && dStr > h.end_date) return
          
          let active = true
          if (h.recurrence) {
            if (h.recurrence.frequency === 'specific_days') {
              active = h.recurrence.days_of_week?.includes(dayOfWeek) ?? false
            }
          }

          if (active) {
            maxPoints += 1
            if (isTdy) todayMax += 1
            
            const status = logsMap.get(`${h.id}_${dStr}`)
            if (status === 'done') {
              totalPoints += 1
              if (isTdy) todayPoints += 1
            } else if (status === 'partial') {
              totalPoints += 0.5
              if (isTdy) todayPoints += 0.5
            }
          }
        })

        // Tasks contribution
        // Tasks active on this day: due_date === dStr OR (no due_date and completed_at on this day)
        allTasks.forEach(t => {
          const taskDate = t.due_date || (t.completed_at ? t.completed_at.split('T')[0] : null)
          if (taskDate === dStr) {
            maxPoints += 1
            if (isTdy) todayMax += 1
            if (t.status === 'done') {
              totalPoints += 1
              if (isTdy) todayPoints += 1
            }
          }
        })

        // Events contribution
        allEvents.forEach(e => {
          if (e.date === dStr) {
            maxPoints += 1
            if (isTdy) todayMax += 1
            if (e.status === 'done') {
              totalPoints += 1
              if (isTdy) todayPoints += 1
            }
          }
        })
      })

      return {
        daily: todayMax > 0 ? Math.round((todayPoints / todayMax) * 100) : 0,
        weekly: maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
      }
    },
    enabled: !!user,
    staleTime: 10_000,
  })
}
