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

// Returns the grace window (in days) based on current streak level.
// Within this window the streak is still shown even if the habit wasn't logged today.
export function getStreakGraceDays(streak: number): number {
  if (streak >= 30) return 3  // 72 h — dedicated users
  if (streak >= 7)  return 2  // 48 h — building momentum
  return 1                    // 24 h — everyone gets at least tonight
}

export interface StreakShieldInfo {
  isAtRisk: boolean       // streak not yet logged today and grace window open
  isProtected: boolean    // still within grace — streak won't break yet
  hoursRemaining: number  // hours until grace expires
  graceDays: number       // total grace window size
}

// Returns shield info for rendering in the UI.
export function getStreakShieldInfo(
  streak: number,
  lastCompletedDate: string | null | undefined,
  todayStr: string
): StreakShieldInfo {
  const empty: StreakShieldInfo = { isAtRisk: false, isProtected: false, hoursRemaining: 0, graceDays: 1 }
  if (!lastCompletedDate || (streak || 0) <= 0) return empty

  const graceDays = getStreakGraceDays(streak)
  const daysSince = differenceInDays(parseISO(todayStr), parseISO(lastCompletedDate))

  if (daysSince === 0) return empty // logged today — safe

  if (daysSince > graceDays) return { ...empty, graceDays } // grace expired

  // Within grace window — compute hours remaining
  const graceExpiry = new Date(lastCompletedDate + 'T00:00:00')
  graceExpiry.setDate(graceExpiry.getDate() + graceDays + 1)
  const hoursRemaining = Math.max(0, (graceExpiry.getTime() - Date.now()) / 3_600_000)

  return { isAtRisk: true, isProtected: true, hoursRemaining: Math.floor(hoursRemaining), graceDays }
}

export function getEffectiveOfensiva(streak: number, lastCompletedDate: string | null | undefined, currentStatus: HabitStatus, todayStr: string): number {
  if (currentStatus === 'failed') return 0
  if (!lastCompletedDate) return streak || 0

  const diff = differenceInDays(parseISO(todayStr), parseISO(lastCompletedDate))
  if (diff <= getStreakGraceDays(streak)) return streak || 0
  return 0
}

export function getOfensivaLabel(days: number): string {
  if (days === 0) return 'Comece hoje!'
  if (days === 1) return '1 dia de ofensiva'
  if (days < 7)  return `${days} dias seguidos`
  if (days < 30) return `${days} dias 🔥`
  return `${days} dias 🏆`
}
