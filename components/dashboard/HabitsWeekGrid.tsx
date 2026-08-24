'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Minus, X } from 'lucide-react'
import { format, addDays, isSameDay, isFuture, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { occursOn } from '@/lib/utils/recurrence'
import type { Habit, HabitStatus } from '@/types'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type LogLike = { habit_id: string; log_date: string; status: HabitStatus }

type Cell =
  | { kind: 'off' }                                    // não previsto nesse dia
  | { kind: 'future' }                                 // previsto, mas ainda não chegou
  | { kind: 'open'; status: HabitStatus; date: string } // previsto e registrável

export function HabitsWeekGrid({
  habits,
  logs,
  weekStart,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onToday,
  onCellClick,
}: {
  habits: Habit[]
  logs: LogLike[]
  weekStart: Date
  weekOffset: number
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onCellClick?: (habitId: string, logDate: string, position: { x: number; y: number }) => void
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      return { date, iso: format(date, 'yyyy-MM-dd') }
    }),
    [weekStart]
  )

  const logMap = useMemo(() => {
    const m = new Map<string, HabitStatus>()
    for (const l of logs) m.set(`${l.habit_id}_${l.log_date}`, l.status)
    return m
  }, [logs])

  const rows = useMemo(() => {
    const today = startOfDay(new Date())

    return habits.map(habit => {
      const baseDate = habit.start_date || habit.created_at?.split('T')[0]

      const cells: Cell[] = days.map(({ date, iso }) => {
        const scheduled = habit.recurrence
          ? occursOn(habit.recurrence, baseDate, iso, habit.end_date)
          : !!baseDate && iso >= baseDate && (!habit.end_date || iso <= habit.end_date)

        if (!scheduled) return { kind: 'off' }
        if (isFuture(startOfDay(date)) && !isSameDay(date, today)) return { kind: 'future' }
        return { kind: 'open', status: logMap.get(`${habit.id}_${iso}`) ?? 'none', date: iso }
      })

      // Só dias já vividos entram na conta — senão a semana começa "0 de 7".
      const due = cells.filter(c => c.kind === 'open').length
      const done = cells.filter(c => c.kind === 'open' && c.status === 'done').length
      const partial = cells.filter(c => c.kind === 'open' && c.status === 'partial').length

      return { habit, cells, due, done, partial }
    })
  }, [habits, days, logMap])

  // Percentual por dia, no rodapé: mostra em que dia a semana desandou.
  const dayScores = useMemo(() => {
    return days.map((_, i) => {
      let due = 0, score = 0
      for (const row of rows) {
        const c = row.cells[i]
        if (c.kind !== 'open') continue
        due++
        if (c.status === 'done') score += 1
        else if (c.status === 'partial') score += 0.5
      }
      return due > 0 ? Math.round((score / due) * 100) : null
    })
  }, [rows, days])

  const label = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} — ${format(addDays(weekStart, 6), "d 'de' MMM", { locale: ptBR })}`

  if (habits.length === 0) {
    return <div className="text-[var(--text-muted)] text-sm font-medium pt-4">Nenhum hábito cadastrado ainda.</div>
  }

  return (
    <div className="space-y-4">
      {/* Navegação de semana */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onPrevWeek}
          aria-label="Semana anterior"
          className="w-9 h-9 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <div className="text-sm font-black text-[var(--text-primary)] capitalize">
            {weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana passada' : label}
          </div>
          {weekOffset !== 0 && (
            <button
              onClick={onToday}
              className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-0.5"
            >
              Voltar para hoje
            </button>
          )}
          {weekOffset === 0 && (
            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">{label}</div>
          )}
        </div>

        <button
          onClick={onNextWeek}
          disabled={weekOffset >= 0}
          aria-label="Próxima semana"
          className="w-9 h-9 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all disabled:opacity-25 disabled:hover:text-[var(--text-muted)] disabled:hover:border-[var(--border-subtle)]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[340px]">
          {/* Cabeçalho dos dias */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex-1 min-w-[92px]" />
            {days.map(({ date, iso }, i) => {
              const isToday = isSameDay(date, new Date())
              return (
                <div key={iso} className="w-10 shrink-0 flex flex-col items-center gap-0.5">
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-wider',
                    isToday ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]/60'
                  )}>
                    {WEEKDAYS[i]}
                  </span>
                  <span className={cn(
                    'text-[11px] font-black tabular-nums w-6 h-6 rounded-lg flex items-center justify-center',
                    isToday
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'text-[var(--text-muted)]'
                  )}>
                    {format(date, 'd')}
                  </span>
                </div>
              )
            })}
            <div className="w-11 shrink-0" />
          </div>

          {/* Linhas de hábitos */}
          <div className="space-y-1.5">
            {rows.map(({ habit, cells, due, done, partial }, rowIdx) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIdx * 0.03 }}
                className="flex items-center gap-1.5"
              >
                <div className="flex-1 min-w-[92px] flex items-center gap-1.5 pr-1 min-w-0">
                  <span className="text-base shrink-0">{habit.emoji || '✨'}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={habit.name}>
                    {habit.name}
                  </span>
                </div>

                {cells.map((cell, i) => {
                  const iso = days[i].iso

                  if (cell.kind === 'off') {
                    return (
                      <div
                        key={iso}
                        title={`${habit.name} — não previsto ${format(days[i].date, 'dd/MM')}`}
                        className="w-10 h-10 shrink-0 rounded-xl border border-dashed border-[var(--border-subtle)]/40 flex items-center justify-center"
                      >
                        <span className="text-[var(--text-muted)]/25 text-xs font-black">—</span>
                      </div>
                    )
                  }

                  if (cell.kind === 'future') {
                    return (
                      <div
                        key={iso}
                        title={`${habit.name} — previsto para ${format(days[i].date, 'dd/MM')}`}
                        className="w-10 h-10 shrink-0 rounded-xl border border-[var(--border-subtle)]/50 bg-[var(--bg-overlay)]/30"
                      />
                    )
                  }

                  const s = cell.status
                  const visual =
                    s === 'done'    ? { cls: 'bg-green-500 border-green-400 text-white', icon: <Check size={16} strokeWidth={3.5} /> }
                  : s === 'partial' ? { cls: 'bg-amber-400 border-amber-300 text-black', icon: <Minus size={16} strokeWidth={3.5} /> }
                  : s === 'failed'  ? { cls: 'bg-red-500 border-red-400 text-white',     icon: <X size={16} strokeWidth={3.5} /> }
                  :                   { cls: 'bg-[var(--bg-overlay)] border-[var(--border-subtle)] text-transparent', icon: null }

                  return (
                    <button
                      key={iso}
                      onClick={e => onCellClick?.(habit.id, iso, { x: e.clientX, y: e.clientY })}
                      title={`${habit.name} — ${format(days[i].date, 'dd/MM')} — ${s === 'none' ? 'sem registro' : s}`}
                      className={cn(
                        'w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-all',
                        'hover:scale-110 hover:ring-2 hover:ring-white/30 active:scale-95',
                        visual.cls
                      )}
                    >
                      {visual.icon}
                    </button>
                  )
                })}

                {/* Placar da semana do hábito */}
                <div className="w-11 shrink-0 text-right">
                  {due > 0 ? (
                    <span
                      className={cn(
                        'text-[11px] font-black tabular-nums',
                        done === due ? 'text-green-400'
                          : done + partial === 0 ? 'text-[var(--text-muted)]/50'
                          : 'text-[var(--text-muted)]'
                      )}
                      title={`${done} feitos${partial ? `, ${partial} parciais` : ''} de ${due} dias previstos até hoje`}
                    >
                      {done}/{due}
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-[var(--text-muted)]/25">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Rodapé: aproveitamento por dia */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex-1 min-w-[92px] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Dia
            </div>
            {dayScores.map((pct, i) => (
              <div key={i} className="w-10 shrink-0 text-center">
                <span className={cn(
                  'text-[10px] font-black tabular-nums',
                  pct === null ? 'text-[var(--text-muted)]/25'
                    : pct >= 80 ? 'text-green-400'
                    : pct >= 50 ? 'text-amber-400'
                    : 'text-red-400/80'
                )}>
                  {pct === null ? '—' : `${pct}%`}
                </span>
              </div>
            ))}
            <div className="w-11 shrink-0" />
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 flex-wrap text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        {[
          { cls: 'bg-green-500 border-green-400', label: 'Feito' },
          { cls: 'bg-amber-400 border-amber-300', label: 'Parcial' },
          { cls: 'bg-red-500 border-red-400', label: 'Falhou' },
          { cls: 'bg-[var(--bg-overlay)] border-[var(--border-subtle)]', label: 'Sem registro' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-[4px] border', l.cls)} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 opacity-60">
          <span className="w-3 h-3 rounded-[4px] border border-dashed border-[var(--border-subtle)]" />
          Não previsto
        </span>
      </div>
    </div>
  )
}
