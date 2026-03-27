import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus, X, Zap, ShieldAlert, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Habit, HabitStatus } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { StatusChoiceBubble } from './StatusChoiceBubble'

interface HabitCardProps {
  habit: Habit
  onStatusChange: (status: HabitStatus) => void
  isNegative?: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
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
    text:   'line-through text-white/60 text-emerald-400/80',
    label:  'CONCLUÍDO',
  },
  partial: {
    card:   'bg-amber-400/[0.06] border-amber-400/25',
    icon:   'bg-amber-400/15',
    btn:    'bg-amber-400 border-amber-400',
    text:   'text-amber-200/90',
    label:  'PARCIAL',
  },
  failed: {
    card:   'bg-[#b80000]/[0.07] border-[#b80000]/25',
    icon:   'bg-[#b80000]/15',
    btn:    'bg-[#b80000] border-[#b80000]',
    text:   'text-red-300/80',
    label:  'FALHOU',
  },
} as const

// ─── Ícone do botão por status ───────────────────────────────
function StatusIcon({ status }: { status: HabitStatus }) {
  if (status === 'done')    return <Check size={13} strokeWidth={3} className="text-white" />
  if (status === 'partial') return <Minus size={13} strokeWidth={3} className="text-white" />
  if (status === 'failed')  return <X     size={13} strokeWidth={3} className="text-white" />
  return null
}

export function HabitCard({ 
  habit, 
  onStatusChange, 
  isNegative,
  isSelectionMode,
  isSelected,
  onSelect,
  onContextMenu
}: HabitCardProps) {
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 })
  const cfg = STATUS_CONFIG[habit.status]

  const longPress = useLongPress(
    () => {
      onContextMenu?.() // Deixa o dashboard cuidar da seleção
    },
    () => {
      if (isSelectionMode) {
        onSelect?.()
      }
    },
    { delay: 500 }
  )

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) return
    setBubblePos({ x: e.clientX, y: e.clientY })
    setBubbleOpen(true)
  }

  const STATUS_OPTIONS = [
    { id: 'done', label: 'CONCLUÍDO', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'PARCIAL', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'FALHOU', icon: X, color: 'text-[#e02020]', bg: 'hover:bg-[#e02020]/10' },
    { id: 'none', label: 'LIMPAR', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' }
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      {...longPress}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.()
      }}
      className={cn(
        'flex items-center gap-3 rounded-[28px] border px-4 py-4 cursor-pointer select-none transition-all duration-300 relative overflow-hidden group',
        cfg.card,
        isSelected && "border-blue-500/50 bg-blue-500/[0.08] ring-1 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
      )}
    >
      {isSelected && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10 shadow-lg"
        >
          <Check size={12} className="text-white" strokeWidth={4} />
        </motion.div>
      )}

      {/* Status Trigger (Círculo lateral) */}
      {!isSelectionMode && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleStatusClick}
          className={cn(
            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
            habit.status === 'none' ? "border-white/10 bg-white/5" : cfg.btn
          )}
        >
          <StatusIcon status={habit.status} />
        </motion.button>
      )}

      {isSelectionMode && (
         <div className={cn(
            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
            isSelected ? "border-blue-500 bg-blue-500" : "border-white/10 bg-white/5"
         )}>
           {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
         </div>
      )}

      {/* Ícone do hábito */}
      {!isSelectionMode && habit.status === 'none' && (
        <div 
          className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-colors duration-200', cfg.icon)}
          style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined, color: habit.color }}
        >
          {habit.emoji || (habit.type === 'positive' ? <Zap size={20} /> : <ShieldAlert size={20} />)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-lg font-bold text-white truncate transition-all duration-300 tracking-tight', cfg.text)}>
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {isNegative && (
            <span className="text-[10px] font-black uppercase tracking-widest text-[#e02020] bg-[#e02020]/10 px-1.5 py-0.5 rounded-md">Evitar</span>
          )}
          <span className="text-xs font-medium text-white/30 truncate uppercase tracking-widest">{habit.meta}</span>
          {habit.streak > 0 && habit.status !== 'failed' && (
            <span className="text-[12px] font-black text-amber-400 ml-1 flex-shrink-0 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">🔥 {habit.streak}</span>
          )}
        </div>
      </div>

      {/* Status Label (Right aligned) */}
      {habit.status !== 'none' && !isSelectionMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 border',
            habit.status === 'done'    && 'text-green-400 border-green-400/20 bg-green-400/5',
            habit.status === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
            habit.status === 'failed'  && 'text-[#e02020] border-[#e02020]/20 bg-[#e02020]/5',
          )}
        >
          {cfg.label}
        </motion.div>
      )}

      {/* Choice Bubble Popover */}
      <StatusChoiceBubble
        isOpen={bubbleOpen}
        onClose={() => setBubbleOpen(false)}
        onSelect={(status) => onStatusChange(status)}
        options={STATUS_OPTIONS}
        position={bubblePos}
      />
    </motion.div>
  )
}

export default memo(HabitCard)
