import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns'
import { PeriodFilter, DateRange } from '@/components/dashboard/SharedHistoryBar'

export function getDateRangeFromPeriod(filter: PeriodFilter, customRange: DateRange): { start: string, end: string } {
  const now = new Date()
  
  switch (filter) {
    case 'current_month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
      }
    case 'last_month': {
      const last = subMonths(now, 1)
      return {
        start: format(startOfMonth(last), 'yyyy-MM-dd'),
        end: format(endOfMonth(last), 'yyyy-MM-dd')
      }
    }
    case 'this_year':
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd')
      }
    case 'all_time':
      return {
        start: '2000-01-01',
        end: '2100-12-31'
      }
    case 'custom':
      return {
        start: customRange.start || '2000-01-01',
        end: customRange.end || '2100-12-31'
      }
    default:
      return {
        start: '2000-01-01',
        end: '2100-12-31'
      }
  }
}
