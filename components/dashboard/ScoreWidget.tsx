'use client'

import { motion } from 'framer-motion'
import { isToday, isTomorrow, isYesterday, format } from 'date-fns'

interface ScoreData {
  combined: number
  habitPct: number
  taskPct: number
  done: number
  partial: number
  total: number
  tasksDone: number
  tasksTotal: number
}

function getDateLabel(date: Date) {
  if (isToday(date)) return 'HOJE'
  if (isTomorrow(date)) return 'AMANHÃ'
  if (isYesterday(date)) return 'ONTEM'
  return format(date, 'dd/MM/yyyy')
}

export default function ScoreWidget({ score, selectedDate = new Date() }: { score: ScoreData, selectedDate?: Date }) {
  const { combined, done, partial, total, tasksDone, tasksTotal } = score

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-2.5">
      {/* Score geral */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-1 bg-[var(--text-primary)] rounded-2xl p-4 flex flex-col gap-1 transition-colors duration-300 shadow-xl"
      >
        <span className="text-[12px] font-bold uppercase tracking-widest text-black/40">Compromissos e Hábitos</span>
        <span className="text-3xl font-black tracking-tighter text-black">{combined}%</span>
        <span className="text-[13px] font-medium text-black/60">
          {combined >= 80 ? 'Excelente performance!' : combined >= 50 ? 'Bom progresso' : 'Continue focado'}
        </span>
        <div className="h-1 bg-black/10 rounded-full mt-2 overflow-hidden">
          <motion.div
            className="h-full bg-black rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${combined}%` }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
      </motion.div>

      {/* Hábitos */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="col-span-1 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-1 transition-colors duration-300"
      >
        <span className="text-[12px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Hábitos</span>
        <span className="text-2xl font-extrabold tracking-tighter text-[var(--text-primary)]">{done}/{total}</span>
        <span className="text-[13px] text-[var(--text-muted)]">+{partial} parciais</span>
        <div className="h-0.5 bg-[var(--bg-overlay)]/40 rounded-full mt-1 overflow-hidden">
          <motion.div
            className="h-full bg-red-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </div>
      </motion.div>

      {/* Tarefas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="col-span-1 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-1 transition-colors duration-300"
      >
        <span className="text-[12px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Tarefas</span>
        <span className="text-2xl font-extrabold tracking-tighter text-[var(--text-primary)]">{tasksDone}/{tasksTotal}</span>
        <span className="text-[13px] text-[var(--text-muted)] uppercase" suppressHydrationWarning>{getDateLabel(selectedDate)}</span>
        <div className="h-0.5 bg-[var(--bg-overlay)]/40 rounded-full mt-1 overflow-hidden">
          <motion.div
            className="h-full bg-[var(--text-muted)]/40 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
        </div>
      </motion.div>
    </div>
  )
}
