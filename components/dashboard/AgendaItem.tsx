import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus, X, Clock, Pencil, AlertCircle } from 'lucide-react'
import { parse, isAfter, subMinutes, isToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { CalendarEvent } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { resolveBubblePosition } from '@/lib/utils/statusBubble'

interface AgendaItemProps {
  event: CalendarEvent
  onStatusChange: (status: 'todo' | 'done' | 'partial' | 'failed') => void
  onReschedule: () => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  onOpenBubble?: (pos: { x: number; y: number }) => void
  onEdit?: () => void
  currentTime?: Date
}

const DEFAULT_STATUS_CONFIG = {
  icon: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
  border: 'border-[var(--border-subtle)]',
  text: 'text-[var(--text-primary)]'
}

const STATUS_CONFIG = {
  todo: {
    icon: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
    border: 'border-[var(--border-subtle)]',
    text: 'text-[var(--text-primary)]'
  },
  done: {
    icon: 'bg-green-500 text-white',
    border: 'border-green-500/30 bg-green-500/[0.03]',
    text: 'text-[var(--text-muted)] line-through'
  },
  partial: {
    icon: 'bg-amber-400 text-black',
    border: 'border-amber-400/30 bg-amber-400/[0.03]',
    text: 'text-[var(--text-primary)]/70'
  },
  failed: {
    icon: 'bg-red-500 text-white',
    border: 'border-red-500/30 bg-red-500/[0.03]',
    text: 'text-[var(--text-muted)]'
  },
  none: DEFAULT_STATUS_CONFIG
}

function AgendaItem({
  event,
  onStatusChange,
  onReschedule,
  isSelectionMode,
  isSelected,
  onSelect,
  onContextMenu,
  onOpenBubble,
  onEdit,
  currentTime = new Date()
}: AgendaItemProps) {
  const currentStatus = event.status || 'none'
  const cfg = (STATUS_CONFIG as any)[currentStatus] || STATUS_CONFIG.none || DEFAULT_STATUS_CONFIG

  const timeStatus = useMemo(() => {
    if (!event.time || event.status === 'done' || !isToday(parse(event.date || '', 'yyyy-MM-dd', new Date()))) {
      return { approaching: false, passed: event.isOverdue }
    }

    try {
      const eventTime = parse(event.time, 'HH:mm', currentTime)
      const now = currentTime
      const isPassed = isAfter(now, eventTime)
      const isApproaching = !isPassed && isAfter(now, subMinutes(eventTime, 15))

      return { approaching: isApproaching, passed: isPassed }
    } catch {
      return { approaching: false, passed: false }
    }
  }, [event.time, event.status, event.isOverdue, event.date, currentTime])

  const handleShortPress = (eventData: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    if (isSelectionMode) {
      onSelect?.()
      return
    }
    onOpenBubble?.(resolveBubblePosition(eventData, eventData.currentTarget))
  }

  const longPress = useLongPress(
    () => {
      onContextMenu?.()
    },
    handleShortPress,
    { delay: 500 }
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      {...longPress}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.()
      }}
      data-status-card="dashboard-agenda"
      className={cn(
        'bg-[var(--bg-overlay)] border rounded-[28px] p-4 flex items-center justify-between gap-4 transition-all group relative overflow-hidden cursor-pointer',
        cfg.border,
        isSelected && 'border-red-600/50 bg-red-600/[0.08] ring-1 ring-red-600/20 shadow-[0_0_20px_rgba(224,32,32,0.1)]'
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {!isSelectionMode && !isSelected && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20 flex-none',
              (event.status === 'todo' || !event.status) ? 'border-white/[0.08] bg-white/[0.04]' : cfg.icon
            )}
            data-status-trigger="true"
          >
            <StatusIcon status={event.status} />
          </motion.div>
        )}

        {isSelectionMode && (
          <div className={cn(
            'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20',
            isSelected ? 'border-red-600 bg-red-600' : 'border-white/[0.08] bg-white/[0.04]'
          )}>
            {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
          </div>
        )}

        {!isSelectionMode && event.emoji && (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: event.color ? `${event.color}20` : 'rgba(255,255,255,0.05)', color: event.color || '#FFFFFF' }}
          >
            {event.emoji}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className={cn('text-lg font-bold truncate transition-all tracking-tight', cfg.text)}>
            {event.title}
          </h4>
          <div className="flex items-center gap-3 text-xs font-medium text-white/30 uppercase tracking-widest">
            <span className={cn(
              'flex items-center gap-1.5 transition-all duration-700',
              timeStatus.passed ? 'text-[#FF453A] font-black scale-105' :
              timeStatus.approaching ? 'animate-flash-red font-bold' : ''
            )}>
              <Clock size={12} className={cn(timeStatus.passed || timeStatus.approaching ? 'text-[#FF453A]' : '')} />
              {event.time}
            </span>

            {event.isOverdue && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-lg text-[#FF453A] text-[9px] font-black animate-in fade-in zoom-in duration-500">
                <AlertCircle size={10} /> ATRASADO
              </span>
            )}

            {event.description && !event.isOverdue && (
              <span className="flex items-center gap-1.5 text-[var(--text-muted)] lowercase italic tracking-normal font-normal truncate">
                · {event.description}
              </span>
            )}
            {event.status === 'partial' && (
              <span className="text-amber-400 font-black ml-2">REAGENDAR</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isSelectionMode && !isSelected && (
          <button
            type="button"
            data-bubble-ignore="true"
            data-ignore-action="edit"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]/80 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            title="Editar Compromisso"
          >
            <Pencil size={14} />
          </button>
        )}
        {!isSelectionMode && !isSelected && (event.status === 'done' || event.status === 'partial' || event.status === 'failed') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border',
              event.status === 'done' && 'text-green-400 border-green-400/20 bg-green-400/5',
              event.status === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
              event.status === 'failed' && 'text-red-400 border-red-400/20 bg-red-400/5'
            )}
          >
            {event.status === 'done' ? 'CONCLUÍDO' :
             event.status === 'partial' ? 'PARCIAL' : 'FALHOU'}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function StatusIcon({ status }: { status: any }) {
  if (status === 'done') return <Check size={18} strokeWidth={3} className="text-white" />
  if (status === 'partial') return <Minus size={18} strokeWidth={3} className="text-white" />
  if (status === 'failed') return <X size={18} strokeWidth={3} className="text-white" />
  return null
}

export default memo(AgendaItem)
