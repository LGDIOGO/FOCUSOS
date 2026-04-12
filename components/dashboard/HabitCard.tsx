'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Clock, Minus, Pencil, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { isBubbleIgnoredTarget, resolveBubblePosition } from '@/lib/utils/statusBubble'
import { getEffectiveOfensiva } from '@/lib/utils/scoring'
import { Habit, HabitStatus } from '@/types'

interface HabitCardProps {
  habit: Habit
  onStatusChange: (status: HabitStatus) => void
  isNegative?: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  onOpenBubble?: (pos: { x: number; y: number }) => void
  onEdit?: () => void
  isToday?: boolean
}

const STATUS_CONFIG = {
  none: {
    card: 'border-white/[0.06]',
    icon: '',
    btn: '',
    text: 'text-[var(--text-primary)]',
    label: ''
  },
  done: {
    card: 'border-green-500/25 bg-green-500/[0.04]',
    icon: 'bg-green-500/15',
    btn: 'bg-green-500 border-0',
    text: 'line-through text-white/50',
    label: 'CONCLUIDO'
  },
  partial: {
    card: 'border-amber-400/25 bg-amber-400/[0.04]',
    icon: 'bg-amber-400/15',
    btn: 'bg-amber-400 border-0',
    text: 'text-amber-200/90',
    label: 'PARCIAL'
  },
  failed: {
    card: 'border-red-700/25 bg-red-700/[0.04]',
    icon: 'bg-red-700/15',
    btn: 'bg-[#b80000] border-0',
    text: 'text-red-300/80',
    label: 'FALHOU'
  }
} as const

function StatusIcon({ status }: { status: HabitStatus | undefined }) {
  if (status === 'done') return <Check size={13} strokeWidth={3} className="text-white" />
  if (status === 'partial') return <Minus size={13} strokeWidth={3} className="text-white" />
  if (status === 'failed') return <X size={13} strokeWidth={3} className="text-white" />
  return null
}

export function HabitCard({
  habit,
  onStatusChange,
  isNegative,
  isSelectionMode,
  isSelected,
  onSelect,
  onContextMenu,
  onOpenBubble,
  onEdit,
  isToday
}: HabitCardProps) {
  const currentStatus = habit.status || 'none'
  const cfg = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.none

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const activeOfensiva = getEffectiveOfensiva(habit.streak || 0, habit.last_completed_date, currentStatus, todayStr)

  const handleShortPress = (eventData: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    if (isBubbleIgnoredTarget(eventData.target)) {
      return
    }

    eventData.preventDefault()
    eventData.stopPropagation()

    if (isSelectionMode) {
      onSelect?.()
      return
    }

    onOpenBubble?.(resolveBubblePosition(eventData, eventData.currentTarget))
  }

  const longPress = useLongPress(
    () => onContextMenu?.(),
    handleShortPress,
    { delay: 500 }
  )

  const isNeutral = currentStatus === 'none'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      {...longPress}
      onContextMenu={(eventData) => {
        eventData.preventDefault()
        eventData.stopPropagation()
        onContextMenu?.()
      }}
      data-status-card={isNegative ? 'dashboard-avoid' : 'dashboard-habit'}
      className={cn(
        'flex items-center gap-3 rounded-[28px] border p-4 cursor-pointer select-none transition-all duration-300 relative group',
        cfg.card,
        isSelected && 'border-red-600/50 bg-red-600/[0.08] ring-1 ring-red-600/20'
      )}
    >
      {!isSelectionMode && (
        <div
          data-status-trigger="true"
          className={cn(
            'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
            isNeutral ? 'border-white/10 bg-white/5' : cn('border-0', cfg.btn)
          )}
        >
          <StatusIcon status={habit.status} />
        </div>
      )}

      {isSelectionMode && (
        <div
          className={cn(
            'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
            isSelected ? 'border-red-600 bg-red-600' : 'border-white/10 bg-white/5'
          )}
        >
          {isSelected && <Check size={18} strokeWidth={3} className="text-white" />}
        </div>
      )}

      {!isSelectionMode && habit.emoji && (
        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-colors duration-200',
            cfg.icon
          )}
          style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined, color: habit.color }}
        >
          {habit.emoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={cn('text-base font-bold truncate tracking-tight transition-all duration-300', cfg.text)}>
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {isNegative && (
            <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
              Evitar
            </span>
          )}
          {habit.time && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/35 uppercase tracking-widest">
              <Clock size={10} />
              {habit.time}
            </span>
          )}
          {habit.meta && (
            <span className="text-[11px] font-medium text-white/25 truncate uppercase tracking-widest">
              {habit.meta}
            </span>
          )}
          {activeOfensiva > 0 && currentStatus !== 'failed' && (
            <span className="text-[11px] font-black text-amber-400 flex-shrink-0 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
              🔥 {activeOfensiva}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!isSelectionMode && !isSelected && (
          <button
            type="button"
            data-bubble-ignore="true"
            data-ignore-action="edit"
            onClick={(eventData) => {
              eventData.stopPropagation()
              onEdit?.()
            }}
            onMouseDown={(eventData) => eventData.stopPropagation()}
            onMouseUp={(eventData) => eventData.stopPropagation()}
            onPointerDown={(eventData) => eventData.stopPropagation()}
            onPointerUp={(eventData) => eventData.stopPropagation()}
            onTouchStart={(eventData) => eventData.stopPropagation()}
            onTouchEnd={(eventData) => eventData.stopPropagation()}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            title="Editar Habito"
          >
            <Pencil size={13} />
          </button>
        )}

        {!isSelectionMode && !isSelected && currentStatus !== 'none' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex-shrink-0',
              currentStatus === 'done' && 'text-green-400 border-green-400/20 bg-green-400/5',
              currentStatus === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
              currentStatus === 'failed' && 'text-red-400 border-red-400/20 bg-red-400/5'
            )}
          >
            {cfg.label}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default memo(HabitCard)
