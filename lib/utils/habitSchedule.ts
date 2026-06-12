import { getDay, getDate, getMonth, differenceInWeeks, parseISO, format } from 'date-fns'
import { Habit } from '@/types'

export type HabitScheduleData = Pick<Habit, 'recurrence' | 'start_date' | 'end_date' | 'created_at'>

// Returns true if the habit is scheduled on the given date string (yyyy-MM-dd)
export function isScheduledOn(habit: HabitScheduleData, dateStr: string): boolean {
  if (habit.start_date && dateStr < habit.start_date) return false
  if (habit.end_date && dateStr > habit.end_date) return false

  const baseDateStr = habit.start_date || habit.created_at.split('T')[0]
  if (dateStr < baseDateStr) return false

  if (!habit.recurrence) return dateStr === baseDateStr

  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = getDay(date)
  const evDate = parseISO(baseDateStr)
  const freq = habit.recurrence.frequency
  const interval = habit.recurrence.interval || 1

  if (freq === 'daily') return true
  if (freq === 'specific_days') {
    if (interval > 1 && Math.abs(differenceInWeeks(date, evDate)) % interval !== 0) return false
    return habit.recurrence.days_of_week?.includes(dayOfWeek) ?? false
  }
  if (freq === 'weekly') {
    if (interval > 1 && Math.abs(differenceInWeeks(date, evDate)) % interval !== 0) return false
    return dayOfWeek === getDay(evDate)
  }
  if (freq === 'monthly') return getDate(date) === getDate(evDate)
  if (freq === 'yearly') return getDate(date) === getDate(evDate) && getMonth(date) === getMonth(evDate)
  return false
}

// Returns the most recent scheduled date strictly before `fromDate`, or null if none exists
export function getPrevScheduledDate(habit: HabitScheduleData, fromDate: string): string | null {
  const baseDate = habit.start_date || habit.created_at.split('T')[0]
  const from = new Date(fromDate + 'T00:00:00')
  for (let i = 1; i <= 400; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    const dStr = format(d, 'yyyy-MM-dd')
    if (dStr < baseDate) return null
    if (isScheduledOn(habit, dStr)) return dStr
  }
  return null
}

// Returns all scheduled dates for the habit over the past `days` calendar days, newest first
export function getScheduledDatesNewestFirst(
  habit: HabitScheduleData,
  todayStr: string,
  days = 90
): string[] {
  const today = new Date(todayStr + 'T00:00:00')
  const baseDate = habit.start_date || habit.created_at.split('T')[0]
  const result: string[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dStr = format(d, 'yyyy-MM-dd')
    if (dStr < baseDate) break
    if (isScheduledOn(habit, dStr)) result.push(dStr) // newest first
  }

  return result
}

// Pure streak computation — schedule-aware, no I/O
// scheduledDatesNewestFirst: scheduled dates ordered newest → oldest
// doneDates: set of completed date strings
// todayStr: today's date — if scheduled today but not yet done, pending (don't break streak)
// excludeDate: treat this date as not-done (use when undoing a completion)
export function computeStreakFromDates(
  scheduledDatesNewestFirst: string[],
  doneDates: Set<string>,
  todayStr: string,
  excludeDate?: string
): { streak: number; lastDate: string | null } {
  let streak = 0
  let lastDate: string | null = null

  for (const d of scheduledDatesNewestFirst) {
    const isDone = doneDates.has(d) && d !== excludeDate

    if (isDone) {
      if (lastDate === null) lastDate = d
      streak++
    } else {
      // Today is pending — skip without breaking the streak
      if (d === todayStr) continue
      // Past scheduled day not completed — streak is broken
      break
    }
  }

  return { streak, lastDate }
}
