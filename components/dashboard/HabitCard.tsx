'use client'

import { motion } from 'framer-motion'
import { Check, Minus, X, Zap, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Habit, HabitStatus } from '@/types'

interface HabitCardProps {
  habit: Habit
  onCycle: () => void
  isNegative?: boolean
}

// ─── Mapeamento de status → estilos ──────────────────────────
const STATUS_CONFIG = {
  none: {
    card:   'bg-white/[0.04] border-white/[0.07]',
    icon:   'bg-white/[0.07]',
    btn:    'border-white/20 bg-transparent',
    text:   '',
    label:  '',
  },
  done: {
    card:   'bg-green-500/[0.06] border-green-500/25',
    icon:   'bg-green-500/15',
    btn:    'bg-green-500 border-green-500',
    text:   'line-through text-white/60',
    label:  'Feito',
  },
  partial: {
    card:   'bg-amber-400/[0.06] border-amber-400/25',
    icon:   'bg-amber-400/15',
    btn:    'bg-amber-400 border-amber-400',
    text:   '',
    label:  'Parcial',
  },
  failed: {
    card:   'bg-[#b80000]/[0.07] border-[#b80000]/25',
    icon:   'bg-[#b80000]/15',
    btn:    'bg-[#b80000] border-[#b80000]',
    text:   '',
    label:  'Falhou',
  },
} as const

// ─── Ícone do botão por status ───────────────────────────────
function StatusIcon({ status }: { status: HabitStatus }) {
  if (status === 'done')    return <Check size={13} strokeWidth={3} className="text-white" />
  if (status === 'partial') return <Minus size={13} strokeWidth={3} className="text-white" />
  if (status === 'failed')  return <X     size={13} strokeWidth={3} className="text-white" />
  return null
}

// ─── Component ───────────────────────────────────────────────
export default function HabitCard({ habit, onCycle, isNegative }: HabitCardProps) {
  const cfg = STATUS_CONFIG[habit.status]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.975 }}
      onClick={onCycle}
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-3.5 py-3 cursor-pointer select-none transition-colors duration-200',
        cfg.card
      )}
    >
      {/* Ícone do hábito */}
      <div 
        className={cn('w-10 h-10 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0 transition-colors duration-200', cfg.icon)}
        style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined, color: habit.color }}
      >
        {habit.emoji || (habit.type === 'positive' ? <Zap size={18} /> : <ShieldAlert size={18} />)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-base font-semibold text-white truncate transition-all duration-200', cfg.text)}>
          {habit.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isNegative && (
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#e02020]">Evitar ·</span>
          )}
          <span className="text-[13px] text-white/50 truncate">{habit.meta}</span>
          {habit.streak > 0 && habit.status !== 'failed' && (
            <span className="text-[12px] text-amber-400/70 ml-1 flex-shrink-0">🔥 {habit.streak}</span>
          )}
        </div>
      </div>

      {/* Status label */}
      {habit.status !== 'none' && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'text-[12px] font-semibold uppercase tracking-wider flex-shrink-0',
            habit.status === 'done'    && 'text-green-400',
            habit.status === 'partial' && 'text-amber-400',
            habit.status === 'failed'  && 'text-[#e02020]',
          )}
        >
          {cfg.label}
        </motion.span>
      )}

      {/* Botão de check */}
      <div className={cn(
        'w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-200',
        cfg.btn
      )}>
        <StatusIcon status={habit.status} />
      </div>
    </motion.div>
  )
}
