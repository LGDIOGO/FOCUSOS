import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithApiKey, unauthorizedResponse, errorResponse } from '../_auth'

export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  try {
    const [habitsSnap, eventsSnap, tasksSnap, goalsSnap, habitLogsSnap] = await Promise.all([
      adminDb.collection('habits').where('user_id', '==', auth.userId).where('is_archived', '==', false).get(),
      adminDb.collection('events').where('user_id', '==', auth.userId).where('date', '>=', today).orderBy('date').limit(20).get(),
      adminDb.collection('tasks').where('user_id', '==', auth.userId).where('status', 'in', ['todo', 'in_progress']).orderBy('created_at', 'desc').limit(30).get(),
      adminDb.collection('goals').where('user_id', '==', auth.userId).where('status', '==', 'active').get(),
      adminDb.collection('habit_logs').where('user_id', '==', auth.userId).where('log_date', '>=', weekAgo).where('log_date', '<=', today).get(),
    ])

    const habits = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const upcomingEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const pendingTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const activeGoals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Build daily habit performance for last 7 days
    const logsByDate: Record<string, { done: number; total: number }> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      logsByDate[d] = { done: 0, total: habits.length }
    }
    habitLogsSnap.docs.forEach(d => {
      const data = d.data()
      if (logsByDate[data.log_date] && data.status === 'done') {
        logsByDate[data.log_date].done++
      }
    })

    const weeklyPerformance = Object.entries(logsByDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, { done, total }]) => ({
        date,
        habits_done: done,
        habits_total: total,
        score_pct: total > 0 ? Math.round((done / total) * 100) : 0,
      }))

    const todayLogs = habitLogsSnap.docs
      .filter(d => d.data().log_date === today)
      .reduce<Record<string, string>>((acc, d) => {
        const data = d.data()
        acc[data.habit_id] = data.status
        return acc
      }, {})

    const todayHabits = habits.map((h: any) => ({
      ...h,
      today_status: todayLogs[h.id] ?? 'none',
    }))

    const todayEvents = upcomingEvents.filter((e: any) => e.date === today)

    return Response.json({
      date: today,
      summary: {
        habits_total: habits.length,
        habits_done_today: Object.values(todayLogs).filter(s => s === 'done').length,
        tasks_pending: pendingTasks.length,
        goals_active: activeGoals.length,
        events_today: todayEvents.length,
      },
      today: {
        habits: todayHabits,
        events: todayEvents,
      },
      upcoming_events: upcomingEvents,
      pending_tasks: pendingTasks,
      active_goals: activeGoals,
      weekly_performance: weeklyPerformance,
    })
  } catch (e) {
    return errorResponse('Failed to generate summary')
  }
}
