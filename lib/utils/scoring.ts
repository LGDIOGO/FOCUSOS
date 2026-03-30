export type HabitStatus = 'done' | 'partial' | 'failed' | 'none'

export interface HabitLog {
  habit_id: string
  status: HabitStatus
  type: 'positive' | 'negative'
}

export function calcDailyScore(logs: HabitLog[]): number {
  if (logs.length === 0) return 0
  const points = logs.reduce((acc, log) => {
    if (log.status === 'done')    return acc + 1
    if (log.status === 'partial') return acc + 0.5
    return acc
  }, 0)
  return Math.round((points / logs.length) * 100)
}

export function calcWeekScore(dailyScores: number[]): number {
  if (dailyScores.length === 0) return 0
  return Math.round(dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length)
}

import { differenceInDays, parseISO } from 'date-fns'

export function getEffectiveStreak(streak: number, lastCompletedDate: string | null | undefined, currentStatus: HabitStatus, todayStr: string): number {
  if (currentStatus === 'failed') return 0;
  if (!lastCompletedDate) return streak || 0;

  const diff = differenceInDays(parseISO(todayStr), parseISO(lastCompletedDate));
  
  // If the last completion was today or yesterday, the streak is still valid.
  if (diff <= 1) {
    return streak || 0;
  }
  
  // Break streak if not done yesterday.
  return 0;
}

export function getStreakLabel(days: number): string {
  if (days === 0) return 'Comece hoje!'
  if (days === 1) return '1 dia seguido'
  if (days < 7)  return `${days} dias seguidos`
  if (days < 30) return `${days} dias 🔥`
  return `${days} dias 🏆`
}
