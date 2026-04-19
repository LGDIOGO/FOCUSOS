import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { authWithApiKey, unauthorizedResponse, errorResponse } from '../_auth'

export async function GET(req: NextRequest) {
  const auth = await authWithApiKey(req)
  if (!auth) return unauthorizedResponse()

  const { searchParams } = new URL(req.url)
  const days = Math.min(Number(searchParams.get('days') || 7), 90)
  const to = searchParams.get('to') || new Date().toISOString().slice(0, 10)
  const from = searchParams.get('from') || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  try {
    const [habitsSnap, habitLogsSnap, tasksSnap, eventLogsSnap] = await Promise.all([
      adminDb.collection('habits').where('user_id', '==', auth.userId).where('is_archived', '==', false).get(),
      adminDb.collection('habit_logs').where('user_id', '==', auth.userId).where('log_date', '>=', from).where('log_date', '<=', to).get(),
      adminDb.collection('tasks').where('user_id', '==', auth.userId).where('created_at', '>=', from).get(),
      adminDb.collection('event_logs').where('user_id', '==', auth.userId).where('log_date', '>=', from).where('log_date', '<=', to).get(),
    ])

    const totalHabits = habitsSnap.size

    // Group logs by date
    const habitLogsByDate: Record<string, { done: number; failed: number; skipped: number }> = {}
    habitLogsSnap.docs.forEach(d => {
      const { log_date, status } = d.data()
      if (!habitLogsByDate[log_date]) habitLogsByDate[log_date] = { done: 0, failed: 0, skipped: 0 }
      if (status === 'done') habitLogsByDate[log_date].done++
      else if (status === 'failed') habitLogsByDate[log_date].failed++
      else if (status === 'skipped') habitLogsByDate[log_date].skipped++
    })

    const eventLogsByDate: Record<string, { done: number; failed: number }> = {}
    eventLogsSnap.docs.forEach(d => {
      const { log_date, status } = d.data()
      if (!eventLogsByDate[log_date]) eventLogsByDate[log_date] = { done: 0, failed: 0 }
      if (status === 'done') eventLogsByDate[log_date].done++
      else if (status === 'failed') eventLogsByDate[log_date].failed++
    })

    // Build daily breakdown
    const daily = []
    const cursor = new Date(from)
    const end = new Date(to)
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10)
      const hl = habitLogsByDate[dateStr] ?? { done: 0, failed: 0, skipped: 0 }
      const el = eventLogsByDate[dateStr] ?? { done: 0, failed: 0 }
      const score = totalHabits > 0 ? Math.round((hl.done / totalHabits) * 100) : null

      daily.push({
        date: dateStr,
        habits_done: hl.done,
        habits_failed: hl.failed,
        habits_skipped: hl.skipped,
        habits_total: totalHabits,
        score_pct: score,
        events_done: el.done,
        events_failed: el.failed,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const scores = daily.map(d => d.score_pct).filter((s): s is number => s !== null)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const bestDay = daily.reduce((best, d) => (!best || (d.score_pct ?? -1) > (best.score_pct ?? -1) ? d : best), daily[0])
    const totalDone = daily.reduce((sum, d) => sum + d.habits_done, 0)
    const streak = (() => {
      let count = 0
      for (let i = daily.length - 1; i >= 0; i--) {
        if ((daily[i].score_pct ?? 0) >= 50) count++
        else break
      }
      return count
    })()

    return Response.json({
      period: { from, to, days: daily.length },
      summary: {
        average_score_pct: avgScore,
        total_habits_done: totalDone,
        best_day: bestDay?.date ?? null,
        current_streak_days: streak,
      },
      daily,
    })
  } catch (e) {
    return errorResponse('Failed to fetch performance')
  }
}
