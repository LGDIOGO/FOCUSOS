'use client'

import { useMemo, useRef, useEffect } from 'react'
import { format, parseISO, eachDayOfInterval, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { occursOn } from '@/lib/utils/recurrence'
import type { Habit, HabitStatus } from '@/types'

/** Teto de colunas: "todo o tempo" chega a milhares de dias. */
const MAX_DAYS = 91

type LogLike = { habit_id: string; log_date: string; status: HabitStatus }

/** Estado de uma célula: sem `scheduled`, o hábito nem era previsto naquele dia. */
type Cell =
  | { scheduled: false }
  | { scheduled: true; status: HabitStatus; date: string }

const STATUS_STYLE: Record<Exclude<HabitStatus, 'none'>, string> = {
  done:    'bg-green-500 border-green-400/40',
  partial: 'bg-amber-400 border-amber-300/40',
  failed:  'bg-red-500/80 border-red-400/40',
}

const PENDING_STYLE = 'bg-[var(--bg-overlay)] border-[var(--border-subtle)]'

export function HabitsMatrix({
  habits,
  logs,
  rangeStart,
  rangeEnd,
  onCellClick,
}: {
  habits: Habit[]
  logs: LogLike[]
  rangeStart: string
  rangeEnd: string
  onCellClick?: (habitId: string, logDate: string, position: { x: number; y: number }) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Janela visível: nunca passa de hoje (dia futuro não tem o que registrar)
  // e nunca excede MAX_DAYS, mantendo os dias mais recentes.
  const days = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const endStr = rangeEnd > todayStr ? todayStr : rangeEnd
    if (!rangeStart || endStr < rangeStart) return []

    try {
      const all = eachDayOfInterval({ start: parseISO(rangeStart), end: parseISO(endStr) })
      return all.slice(-MAX_DAYS).map(d => ({ date: d, iso: format(d, 'yyyy-MM-dd') }))
    } catch {
      return []
    }
  }, [rangeStart, rangeEnd])

  // habit_id + data -> status, para consulta O(1) por célula.
  const logMap = useMemo(() => {
    const m = new Map<string, HabitStatus>()
    for (const l of logs) m.set(`${l.habit_id}_${l.log_date}`, l.status)
    return m
  }, [logs])

  const rows = useMemo(() => {
    return habits.map(habit => {
      const baseDate = habit.start_date || habit.created_at?.split('T')[0]

      const cells: Cell[] = days.map(({ iso }) => {
        const scheduled = habit.recurrence
          ? occursOn(habit.recurrence, baseDate, iso, habit.end_date)
          : !!baseDate && iso >= baseDate && (!habit.end_date || iso <= habit.end_date)

        if (!scheduled) return { scheduled: false }
        return { scheduled: true, status: logMap.get(`${habit.id}_${iso}`) ?? 'none', date: iso }
      })

      const planned = cells.filter(c => c.scheduled).length
      const done = cells.filter(c => c.scheduled && c.status === 'done').length
      const partial = cells.filter(c => c.scheduled && c.status === 'partial').length
      // Parcial conta metade — senão "quase fiz" pesa igual a "fiz".
      const rate = planned > 0 ? Math.round(((done + partial * 0.5) / planned) * 100) : null

      return { habit, cells, planned, done, rate }
    })
  }, [habits, days, logMap])

  // Abre já mostrando os dias mais recentes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [days.length, habits.length])

  if (habits.length === 0) {
    return <div className="text-[var(--text-muted)] text-sm font-medium pt-4">Nenhum hábito cadastrado ainda.</div>
  }
  if (days.length === 0) {
    return <div className="text-[var(--text-muted)] text-sm font-medium pt-4">Período inválido — ajuste as datas.</div>
  }

  return (
    <div className="space-y-3">
      {/* Legenda */}
      <div className="flex items-center gap-4 flex-wrap text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        {[
          { cls: STATUS_STYLE.done, label: 'Feito' },
          { cls: STATUS_STYLE.partial, label: 'Parcial' },
          { cls: STATUS_STYLE.failed, label: 'Falhou' },
          { cls: PENDING_STYLE, label: 'Sem registro' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-[3px] border', l.cls)} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 opacity-60">
          <span className="w-2.5 h-2.5 rounded-[3px] border border-dashed border-[var(--border-subtle)]" />
          Não previsto
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="min-w-fit">
          {/* Cabeçalho: mês + dia */}
          <div className="flex items-end gap-1 mb-1.5 pl-[136px]">
            {days.map(({ date, iso }, i) => {
              const prev = i > 0 ? days[i - 1].date : null
              const startsMonth = !prev || !isSameMonth(date, prev)
              return (
                <div key={iso} className="w-5 shrink-0 flex flex-col items-center">
                  <span className={cn(
                    'text-[8px] font-black uppercase tracking-wider whitespace-nowrap h-3',
                    startsMonth ? 'text-[var(--text-muted)]' : 'text-transparent'
                  )}>
                    {startsMonth ? format(date, 'MMM', { locale: ptBR }) : '·'}
                  </span>
                  <span className="text-[8px] font-bold text-[var(--text-muted)]/50 tabular-nums">
                    {format(date, 'd')}
                  </span>
                </div>
              )
            })}
            <div className="w-12 shrink-0" />
          </div>

          {/* Linhas */}
          <div className="space-y-1">
            {rows.map(({ habit, cells, planned, rate }) => (
              <div key={habit.id} className="flex items-center gap-1">
                <div className="w-[136px] shrink-0 pr-2 flex items-center gap-1.5 min-w-0 sticky left-0 bg-[var(--bg-primary)] z-10">
                  <span className="text-sm shrink-0">{habit.emoji || '✨'}</span>
                  <span
                    className="text-[11px] font-bold text-[var(--text-primary)] truncate"
                    title={habit.name}
                  >
                    {habit.name}
                  </span>
                </div>

                {cells.map((cell, i) => {
                  const iso = days[i].iso
                  if (!cell.scheduled) {
                    return (
                      <div
                        key={iso}
                        className="w-5 h-5 shrink-0 rounded-[4px] border border-dashed border-[var(--border-subtle)]/40"
                        title={`${habit.name} — não previsto em ${format(days[i].date, "dd/MM")}`}
                      />
                    )
                  }
                  const style = cell.status === 'none'
                    ? PENDING_STYLE
                    : STATUS_STYLE[cell.status as Exclude<HabitStatus, 'none'>]
                  const label = cell.status === 'none' ? 'sem registro' : cell.status
                  return (
                    <button
                      key={iso}
                      onClick={e => onCellClick?.(habit.id, iso, { x: e.clientX, y: e.clientY })}
                      title={`${habit.name} — ${format(days[i].date, "dd/MM")} — ${label}`}
                      className={cn(
                        'w-5 h-5 shrink-0 rounded-[4px] border transition-transform hover:scale-125 hover:ring-1 hover:ring-white/40',
                        style
                      )}
                    />
                  )
                })}

                <div className="w-12 shrink-0 text-right pl-1">
                  {rate !== null && (
                    <span className={cn(
                      'text-[10px] font-black tabular-nums',
                      rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                    )} title={`${planned} dias previstos no período`}>
                      {rate}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {days.length === MAX_DAYS && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]/60">
          Mostrando os últimos {MAX_DAYS} dias do período
        </p>
      )}
    </div>
  )
}
