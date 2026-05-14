'use client'

import { motion } from 'framer-motion'
import { isToday, isTomorrow, isYesterday, format } from 'date-fns'

import { useProfile } from '@/lib/hooks/useProfile'

interface ScoreData {
  combined: number
  habitPct: number
  taskPct: number
  done: number
  partial: number
  total: number
  tasksDone: number
  tasksTotal: number
  eventsDone: number
  eventsTotal: number
}

export default function ScoreWidget({ score, selectedDate = new Date() }: { score: ScoreData, selectedDate?: Date }) {
  const { combined, done, partial, total, eventsDone, eventsTotal } = score
  const { data: profile } = useProfile()
  const threshold = profile?.daily_goal || 80

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-2.5">
      {/* Score geral */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-1 bg-[var(--text-primary)] rounded-2xl p-2.5 md:p-4 flex flex-col gap-0.5 md:gap-1 transition-colors duration-300 shadow-xl"
      >
        <span className="text-[9px] md:text-[12px] font-bold uppercase tracking-widest text-black/40">SCORE</span>
        <span className="text-xl md:text-3xl font-black tracking-tighter text-black">{combined}%</span>
        <span className="text-[10px] md:text-[13px] font-medium text-black/60 leading-tight">
          {combined >= threshold ? 'Excelente!' : combined >= 50 ? 'Bom progresso' : 'Continue!'}
        </span>
        <div className="h-1 bg-black/10 rounded-full mt-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-black rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${combined}%` }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
      </motion.div>

      {/* Compromissos */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="col-span-1 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-2.5 md:p-4 flex flex-col gap-0.5 md:gap-1 transition-colors duration-300"
      >
        <span className="text-[9px] md:text-[12px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Compromissos</span>
        <span className="text-xl md:text-2xl font-extrabold tracking-tighter text-[var(--text-primary)]">{eventsDone}/{eventsTotal}</span>
        <span className="text-[10px] md:text-[13px] text-[var(--text-muted)] uppercase">hoje</span>
        <div className="h-0.5 bg-[var(--bg-overlay)]/40 rounded-full mt-1 overflow-hidden">
          <motion.div
            className="h-full bg-red-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${eventsTotal > 0 ? (eventsDone / eventsTotal) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </div>
      </motion.div>

      {/* Hábitos */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="col-span-1 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl p-2.5 md:p-4 flex flex-col gap-0.5 md:gap-1 transition-colors duration-300"
      >
        <span className="text-[9px] md:text-[12px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Hábitos</span>
        <span className="text-xl md:text-2xl font-extrabold tracking-tighter text-[var(--text-primary)]">{done}/{total}</span>
        <span className="text-[10px] md:text-[13px] text-[var(--text-muted)]">+{partial} parciais</span>
        <div className="h-0.5 bg-[var(--bg-overlay)]/40 rounded-full mt-1 overflow-hidden">
          <motion.div
            className="h-full bg-[var(--text-muted)]/40 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
        </div>
      </motion.div>
    </div>
  )
}
