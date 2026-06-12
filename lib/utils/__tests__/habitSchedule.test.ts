import { describe, it, expect } from 'vitest'
import {
  isScheduledOn,
  getPrevScheduledDate,
  computeStreakFromDates,
  getScheduledDatesNewestFirst,
} from '../habitSchedule'
import type { HabitScheduleData } from '../habitSchedule'

// ─── Helpers ────────────────────────────────────────────────────────────────

const daily = (start = '2025-01-01'): HabitScheduleData => ({
  created_at: start + 'T00:00:00',
  start_date: start,
  recurrence: { frequency: 'daily' },
})

const weeklyOnMonday = (start = '2025-01-06'): HabitScheduleData => ({
  // 2025-01-06 is a Monday
  created_at: start + 'T00:00:00',
  start_date: start,
  recurrence: { frequency: 'weekly', interval: 1 },
})

const monWedFri = (start = '2025-01-06'): HabitScheduleData => ({
  // Mon=1, Wed=3, Fri=5
  created_at: start + 'T00:00:00',
  start_date: start,
  recurrence: { frequency: 'specific_days', days_of_week: [1, 3, 5] },
})

const monthly = (start = '2025-01-15'): HabitScheduleData => ({
  created_at: start + 'T00:00:00',
  start_date: start,
  recurrence: { frequency: 'monthly' },
})

function done(...dates: string[]): Set<string> {
  return new Set(dates)
}

// ─── isScheduledOn ───────────────────────────────────────────────────────────

describe('isScheduledOn', () => {
  it('daily: true on any day after start', () => {
    const h = daily('2025-01-01')
    expect(isScheduledOn(h, '2025-01-01')).toBe(true)
    expect(isScheduledOn(h, '2025-06-15')).toBe(true)
    expect(isScheduledOn(h, '2024-12-31')).toBe(false) // before start
  })

  it('daily: false before start_date', () => {
    expect(isScheduledOn(daily('2025-03-01'), '2025-02-28')).toBe(false)
  })

  it('daily: false after end_date', () => {
    const h: HabitScheduleData = {
      created_at: '2025-01-01T00:00:00',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      recurrence: { frequency: 'daily' },
    }
    expect(isScheduledOn(h, '2025-01-31')).toBe(true)
    expect(isScheduledOn(h, '2025-02-01')).toBe(false)
  })

  it('weekly on Monday: true only on Mondays', () => {
    const h = weeklyOnMonday('2025-01-06') // Jan 6 is Monday
    expect(isScheduledOn(h, '2025-01-06')).toBe(true)  // Mon
    expect(isScheduledOn(h, '2025-01-13')).toBe(true)  // Mon
    expect(isScheduledOn(h, '2025-01-07')).toBe(false) // Tue
    expect(isScheduledOn(h, '2025-01-08')).toBe(false) // Wed
    expect(isScheduledOn(h, '2025-01-12')).toBe(false) // Sun
  })

  it('specific_days Mon/Wed/Fri: true only on those days', () => {
    const h = monWedFri('2025-01-06')
    expect(isScheduledOn(h, '2025-01-06')).toBe(true)  // Mon
    expect(isScheduledOn(h, '2025-01-07')).toBe(false) // Tue
    expect(isScheduledOn(h, '2025-01-08')).toBe(true)  // Wed
    expect(isScheduledOn(h, '2025-01-09')).toBe(false) // Thu
    expect(isScheduledOn(h, '2025-01-10')).toBe(true)  // Fri
    expect(isScheduledOn(h, '2025-01-11')).toBe(false) // Sat
    expect(isScheduledOn(h, '2025-01-12')).toBe(false) // Sun
  })

  it('monthly: true only on same day of month', () => {
    const h = monthly('2025-01-15')
    expect(isScheduledOn(h, '2025-01-15')).toBe(true)
    expect(isScheduledOn(h, '2025-02-15')).toBe(true)
    expect(isScheduledOn(h, '2025-03-15')).toBe(true)
    expect(isScheduledOn(h, '2025-01-16')).toBe(false)
    expect(isScheduledOn(h, '2025-02-14')).toBe(false)
  })
})

// ─── getPrevScheduledDate ────────────────────────────────────────────────────

describe('getPrevScheduledDate', () => {
  it('daily: returns yesterday', () => {
    expect(getPrevScheduledDate(daily('2025-01-01'), '2025-06-11')).toBe('2025-06-10')
    expect(getPrevScheduledDate(daily('2025-01-01'), '2025-01-01')).toBe(null) // nothing before start
  })

  it('weekly (Monday): returns last Monday', () => {
    const h = weeklyOnMonday('2025-01-06')
    // from Tuesday Jan 7 → prev scheduled is Monday Jan 6
    expect(getPrevScheduledDate(h, '2025-01-07')).toBe('2025-01-06')
    // from Monday Jan 13 → prev scheduled is Monday Jan 6
    expect(getPrevScheduledDate(h, '2025-01-13')).toBe('2025-01-06')
    // from Monday Jan 20 → prev scheduled is Monday Jan 13
    expect(getPrevScheduledDate(h, '2025-01-20')).toBe('2025-01-13')
  })

  it('Mon/Wed/Fri: returns correct previous scheduled day', () => {
    const h = monWedFri('2025-01-06')
    // from Thursday Jan 9 → prev is Wed Jan 8
    expect(getPrevScheduledDate(h, '2025-01-09')).toBe('2025-01-08')
    // from Wed Jan 8 → prev is Mon Jan 6
    expect(getPrevScheduledDate(h, '2025-01-08')).toBe('2025-01-06')
    // from Mon Jan 6 → null (before start)
    expect(getPrevScheduledDate(h, '2025-01-06')).toBe(null)
  })
})

// ─── computeStreakFromDates ──────────────────────────────────────────────────

describe('computeStreakFromDates', () => {
  const TODAY = '2025-06-11'

  describe('daily habit', () => {
    it('5 consecutive days done → streak=5', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      const d = done('2025-06-11', '2025-06-10', '2025-06-09', '2025-06-08', '2025-06-07')
      expect(computeStreakFromDates(scheduled, d, TODAY)).toEqual({ streak: 5, lastDate: '2025-06-11' })
    })

    it('today pending (not marked) but yesterday done → streak=1 (alive)', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      const d = done('2025-06-10', '2025-06-09')
      const result = computeStreakFromDates(scheduled, d, TODAY)
      expect(result).toEqual({ streak: 2, lastDate: '2025-06-10' })
    })

    it('gap yesterday → streak=0', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      // Today done, yesterday NOT done, day before done
      const d = done('2025-06-11', '2025-06-09')
      const result = computeStreakFromDates(scheduled, d, TODAY)
      // streak starts from today (done), then hits yesterday (not done, past) → breaks
      expect(result).toEqual({ streak: 1, lastDate: '2025-06-11' })
    })

    it('nothing done → streak=0', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      const result = computeStreakFromDates(scheduled, new Set(), TODAY)
      expect(result).toEqual({ streak: 0, lastDate: null })
    })

    it('excludeDate: undo today restores yesterday streak', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      // Today and yesterday done, but we're undoing today
      const d = done('2025-06-11', '2025-06-10', '2025-06-09')
      const result = computeStreakFromDates(scheduled, d, TODAY, '2025-06-11')
      // today excluded → starts from yesterday, 2 consecutive
      expect(result).toEqual({ streak: 2, lastDate: '2025-06-10' })
    })

    it('backdating: marking 3 days ago fills gap and restores streak', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      // Before backdating: done today + day before gap = would be streak=1
      // After backdating (adding June 8): done Jun 11, Jun 10, Jun 9, Jun 8
      const d = done('2025-06-11', '2025-06-10', '2025-06-09', '2025-06-08')
      const result = computeStreakFromDates(scheduled, d, TODAY)
      expect(result).toEqual({ streak: 4, lastDate: '2025-06-11' })
    })
  })

  describe('weekly habit (every Monday)', () => {
    // Jun 9 2025 is Monday
    const MONDAY_TODAY = '2025-06-09'

    it('3 Mondays in a row → streak=3', () => {
      const h = weeklyOnMonday('2025-05-19') // May 19 is Monday
      const scheduled = getScheduledDatesNewestFirst(h, MONDAY_TODAY, 90)
      // Jun 9, Jun 2, May 26 are Mondays
      const d = done('2025-06-09', '2025-06-02', '2025-05-26')
      const result = computeStreakFromDates(scheduled, d, MONDAY_TODAY)
      expect(result).toEqual({ streak: 3, lastDate: '2025-06-09' })
    })

    it('missed one Monday → streak breaks at last consecutive', () => {
      const h = weeklyOnMonday('2025-05-05') // May 5 is Monday
      const scheduled = getScheduledDatesNewestFirst(h, MONDAY_TODAY, 90)
      // Jun 9 done, Jun 2 done, May 26 NOT done, May 19 done
      const d = done('2025-06-09', '2025-06-02', '2025-05-19')
      const result = computeStreakFromDates(scheduled, d, MONDAY_TODAY)
      // streak: Jun 9 ✓, Jun 2 ✓, May 26 ✗ → stop
      expect(result).toEqual({ streak: 2, lastDate: '2025-06-09' })
    })

    it('today (Monday) pending but last Monday done → streak=1 alive', () => {
      const h = weeklyOnMonday('2025-05-19')
      const scheduled = getScheduledDatesNewestFirst(h, MONDAY_TODAY, 90)
      // Today (Jun 9) not done, last Monday (Jun 2) done
      const d = done('2025-06-02', '2025-05-26')
      const result = computeStreakFromDates(scheduled, d, MONDAY_TODAY)
      // today pending → skip; Jun 2 done → streak=1; May 26 done → streak=2
      expect(result).toEqual({ streak: 2, lastDate: '2025-06-02' })
    })
  })

  describe('Mon/Wed/Fri habit', () => {
    // Jun 11 2025 is Wednesday
    it('7 consecutive Mon/Wed/Fri → streak=7', () => {
      const h = monWedFri('2025-05-26') // May 26 is Monday
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90) // TODAY = Jun 11 (Wed)
      // Jun 11 (Wed), Jun 9 (Mon), Jun 6 (Fri), Jun 4 (Wed), Jun 2 (Mon), May 30 (Fri), May 28 (Wed), May 26 (Mon)
      const d = done('2025-06-11', '2025-06-09', '2025-06-06', '2025-06-04', '2025-06-02', '2025-05-30', '2025-05-28')
      const result = computeStreakFromDates(scheduled, d, TODAY)
      expect(result.streak).toBe(7)
      expect(result.lastDate).toBe('2025-06-11')
    })

    it('missed one → streak breaks', () => {
      const h = monWedFri('2025-05-26')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      // Jun 11 ✓, Jun 9 ✓, Jun 6 ✗ (missed), Jun 4 ✓
      const d = done('2025-06-11', '2025-06-09', '2025-06-04')
      const result = computeStreakFromDates(scheduled, d, TODAY)
      expect(result).toEqual({ streak: 2, lastDate: '2025-06-11' })
    })
  })

  describe('excludeDate edge cases', () => {
    it('undoing yesterday: streak reduces by 1', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      // Today NOT done, yesterday (Jun 10) done, Jun 9 done — undoing Jun 10
      const d = done('2025-06-10', '2025-06-09', '2025-06-08')
      const result = computeStreakFromDates(scheduled, d, TODAY, '2025-06-10')
      // today pending → skip; Jun 10 excluded (treated as not-done, past) → break
      expect(result).toEqual({ streak: 0, lastDate: null })
    })

    it('undoing older backdate: streak goes back to previous chain', () => {
      const h = daily('2025-01-01')
      const scheduled = getScheduledDatesNewestFirst(h, TODAY, 90)
      // Today done, Jun 10 done, Jun 9 done, Jun 8 done (undoing Jun 8)
      const d = done('2025-06-11', '2025-06-10', '2025-06-09', '2025-06-08')
      const result = computeStreakFromDates(scheduled, d, TODAY, '2025-06-08')
      // Jun 11 ✓, Jun 10 ✓, Jun 9 ✓, Jun 8 excluded → break
      expect(result).toEqual({ streak: 3, lastDate: '2025-06-11' })
    })
  })
})

// ─── getScheduledDatesNewestFirst ────────────────────────────────────────────

describe('getScheduledDatesNewestFirst', () => {
  it('daily: returns all dates newest first', () => {
    const h = daily('2025-06-08')
    const result = getScheduledDatesNewestFirst(h, '2025-06-11', 90)
    expect(result[0]).toBe('2025-06-11')
    expect(result[1]).toBe('2025-06-10')
    expect(result[2]).toBe('2025-06-09')
    expect(result[3]).toBe('2025-06-08')
    expect(result.length).toBe(4) // only 4 days from start_date
  })

  it('weekly: only returns Mondays', () => {
    const h = weeklyOnMonday('2025-01-06')
    const result = getScheduledDatesNewestFirst(h, '2025-01-27', 90) // Jan 27 = Monday
    expect(result).toEqual(['2025-01-27', '2025-01-20', '2025-01-13', '2025-01-06'])
  })

  it('Mon/Wed/Fri: only returns those days', () => {
    const h = monWedFri('2025-06-09') // Jun 9 = Monday
    const result = getScheduledDatesNewestFirst(h, '2025-06-11', 90) // Jun 11 = Wed
    expect(result).toEqual(['2025-06-11', '2025-06-09'])
  })

  it('stops at start_date', () => {
    const h = daily('2025-06-10')
    const result = getScheduledDatesNewestFirst(h, '2025-06-11', 90)
    expect(result).toEqual(['2025-06-11', '2025-06-10'])
  })
})
