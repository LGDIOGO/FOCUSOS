'use client'

import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useHabitsHistory, useHabits } from './useHabits'
import { isScheduledOn } from '@/lib/utils/habitSchedule'

export type AnalyticsPeriod = 'week' | 'month' | 'year'

export interface DayData {
  date: string
  score: number | null // null = no habits scheduled that day
  done: number
  partial: number
  failed: number
  total: number
}

export interface HabitStat {
  id: string
  name: string
  emoji?: string
  color?: string
  completionRate: number
  doneDays: number
  scheduledDays: number
  streak: number
}

export interface AnalyticsSummary {
  avgScore: number
  bestScore: number
  worstScore: number
  totalDone: number
  daysAtTarget: number
  daysTotal: number
}


const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  week: 7,
  month: 30,
  year: 365,
}

export function useAnalyticsData(period: AnalyticsPeriod, target: number) {
  const { data: allLogs = [] } = useHabitsHistory()
  const { data: habits = [] } = useHabits()

  return useMemo(() => {
    const days = PERIOD_DAYS[period]
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')

    // Date range: oldest → today
    const dates = Array.from({ length: days }, (_, i) =>
      format(subDays(today, days - 1 - i), 'yyyy-MM-dd')
    )

    // Fast lookup: `${habitId}_${date}` → status
    const logMap = new Map<string, string>()
    allLogs.forEach(log => {
      logMap.set(`${log.habit_id}_${log.log_date}`, log.status)
    })

    // Daily scores
    const dailyData: DayData[] = dates.map(dateStr => {
      const scheduled = habits.filter(h => isScheduledOn(h, dateStr))
      const total = scheduled.length
      if (total === 0) return { date: dateStr, score: null, done: 0, partial: 0, failed: 0, total: 0 }

      let done = 0, partial = 0, failed = 0
      scheduled.forEach(h => {
        const s = logMap.get(`${h.id}_${dateStr}`)
        if (s === 'done') done++
        else if (s === 'partial') partial++
        else if (s === 'failed') failed++
      })

      // future days have no score yet
      if (dateStr > todayStr) return { date: dateStr, score: null, done: 0, partial: 0, failed: 0, total }

      const score = Math.round(((done + partial * 0.5) / total) * 100)
      return { date: dateStr, score, done, partial, failed, total }
    })

    // Per-habit stats
    const habitStats: HabitStat[] = habits
      .map(h => {
        let scheduledDays = 0, doneDays = 0, partialDays = 0
        dates.forEach(dateStr => {
          if (dateStr > todayStr || !isScheduledOn(h, dateStr)) return
          scheduledDays++
          const s = logMap.get(`${h.id}_${dateStr}`)
          if (s === 'done') doneDays++
          else if (s === 'partial') partialDays++
        })
        const completionRate = scheduledDays > 0
          ? Math.round(((doneDays + partialDays * 0.5) / scheduledDays) * 100)
          : 0
        return {
          id: h.id,
          name: h.name,
          emoji: h.emoji,
          color: h.color,
          completionRate,
          doneDays,
          scheduledDays,
          streak: h.streak,
        }
      })
      .filter(h => h.scheduledDays > 0)
      .sort((a, b) => b.completionRate - a.completionRate)

    // Summary
    const scored = dailyData.filter(d => d.score !== null)
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, d) => s + d.score!, 0) / scored.length)
      : 0
    const bestScore = scored.length ? Math.max(...scored.map(d => d.score!)) : 0
    const worstScore = scored.length ? Math.min(...scored.map(d => d.score!)) : 0
    const totalDone = dailyData.reduce((s, d) => s + d.done, 0)
    const daysAtTarget = scored.filter(d => d.score! >= target).length

    const summary: AnalyticsSummary = {
      avgScore, bestScore, worstScore, totalDone,
      daysAtTarget,
      daysTotal: scored.length,
    }

    return { dailyData, habitStats, summary }
  }, [allLogs, habits, period, target])
}

// Builds a week-major grid for the heatmap (Mon-Sun columns)
// Returns flat array of cells where every 7 = one week (row 0=Mon..6=Sun)
export function buildHeatmapGrid(dailyData: DayData[]): (DayData | null)[] {
  if (dailyData.length === 0) return []
  const first = new Date(dailyData[0].date + 'T00:00:00')
  const last = new Date(dailyData[dailyData.length - 1].date + 'T00:00:00')
  // Monday-first: (Sun=0 → 6, Mon=1 → 0, ..., Sat=6 → 5)
  const startPad = (first.getDay() + 6) % 7
  const endPad = 6 - (last.getDay() + 6) % 7
  return [
    ...Array<null>(startPad).fill(null),
    ...dailyData,
    ...Array<null>(endPad).fill(null),
  ]
}
