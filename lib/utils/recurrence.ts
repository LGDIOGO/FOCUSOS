import {
  parseISO,
  getDay,
  getDate,
  getMonth,
  getDaysInMonth,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns'
import type { RecurrenceRule } from '@/types'

/**
 * Decide se uma série cai em determinada data.
 *
 * Existia uma cópia dessa lógica em useHabits e outra em useEvents, cada uma
 * com furos diferentes: hábitos ignoravam `interval` no modo diário (então
 * "dia sim dia não" caía todo dia) e eventos ignoravam `end_date` (séries com
 * prazo nunca terminavam). As duas erravam mês/ano quando o dia inicial não
 * existe no mês alvo — algo marcado no dia 31 sumia em fevereiro, abril,
 * junho, setembro e novembro.
 *
 * As comparações usam as variantes "calendar" do date-fns de propósito: as
 * versões por duração contam blocos de 24h e escorregam meio dia em qualquer
 * mudança de fuso, o que desalinharia a contagem de intervalos.
 *
 * @param rule    regra de repetição; ausente = evento único
 * @param startISO primeira ocorrência (yyyy-MM-dd)
 * @param targetISO data sendo testada (yyyy-MM-dd)
 * @param endISO  último dia da série, inclusive (opcional)
 */
export function occursOn(
  rule: RecurrenceRule | undefined | null,
  startISO: string | undefined | null,
  targetISO: string,
  endISO?: string | null,
): boolean {
  if (!startISO || typeof startISO !== 'string') return false
  if (targetISO < startISO) return false          // ainda não começou
  if (endISO && targetISO > endISO) return false  // série já encerrou

  if (!rule?.frequency) return targetISO === startISO

  let start: Date
  let target: Date
  try {
    start = parseISO(startISO)
    target = parseISO(targetISO)
    if (isNaN(start.getTime()) || isNaN(target.getTime())) return false
  } catch {
    return false
  }

  const interval = rule.interval && rule.interval > 0 ? rule.interval : 1

  switch (rule.frequency) {
    case 'daily':
      return differenceInCalendarDays(target, start) % interval === 0

    case 'weekly':
      return (
        getDay(target) === getDay(start) &&
        differenceInCalendarWeeks(target, start) % interval === 0
      )

    case 'specific_days': {
      const days = rule.days_of_week
      if (!days?.length) return false
      return (
        days.includes(getDay(target)) &&
        differenceInCalendarWeeks(target, start) % interval === 0
      )
    }

    case 'monthly':
      return (
        getDate(target) === clampDayToMonth(getDate(start), target) &&
        differenceInCalendarMonths(target, start) % interval === 0
      )

    case 'yearly':
      return (
        getMonth(target) === getMonth(start) &&
        getDate(target) === clampDayToMonth(getDate(start), target) &&
        differenceInCalendarYears(target, start) % interval === 0
      )

    default:
      return false
  }
}

/**
 * Encaixa o dia do mês da série no mês alvo. Dia 31 vira 30 em abril e 28/29
 * em fevereiro, para a ocorrência cair no último dia em vez de desaparecer.
 */
function clampDayToMonth(day: number, target: Date): number {
  return Math.min(day, getDaysInMonth(target))
}
