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
        className="col-span-1 bg-white rounded-2xl p-4 flex flex-col gap-1"
      >
        <span className="text-[12px] font-semibold uppercase tracking-widest text-black/80">Score</span>
        <span className="text-2xl font-extrabold tracking-tighter text-black">{combined}%</span>
        <span className="text-[13px] text-black">
          {combined >= 70 ? 'No caminho!' : combined >= 40 ? 'Pode melhorar' : 'Vamos lá!'}
        </span>
        <div className="h-0.5 bg-black/10 rounded-full mt-1 overflow-hidden">
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
        className="col-span-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-1"
      >
        <span className="text-[12px] font-semibold uppercase tracking-widest text-white/50">Hábitos</span>
        <span className="text-2xl font-extrabold tracking-tighter text-white">{done}/{total}</span>
        <span className="text-[13px] text-white/60">+{partial} parciais</span>
        <div className="h-0.5 bg-white/10 rounded-full mt-1 overflow-hidden">
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
        className="col-span-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-1"
      >
        <span className="text-[12px] font-semibold uppercase tracking-widest text-white/50">Tarefas</span>
        <span className="text-2xl font-extrabold tracking-tighter text-white">{tasksDone}/{tasksTotal}</span>
        <span className="text-[13px] text-white/60">{getDateLabel(selectedDate)}</span>
        <div className="h-0.5 bg-white/10 rounded-full mt-1 overflow-hidden">
          <motion.div
            className="h-full bg-white/40 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
        </div>
      </motion.div>
    </div>
  )
}
