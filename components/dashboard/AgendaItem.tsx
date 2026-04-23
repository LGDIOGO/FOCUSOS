'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Check, Clock, Minus, Pencil, X } from 'lucide-react'
import { isAfter, isToday, parse, subMinutes } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { resolveBubblePosition } from '@/lib/utils/statusBubble'
import { CalendarEvent } from '@/types'

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

const STATUS_CONFIG = {
  todo: { icon: '', card: 'border-white/[0.06]', text: 'text-[var(--text-primary)]' },
  none: { icon: '', card: 'border-white/[0.06]', text: 'text-[var(--text-primary)]' },
  done: { icon: 'bg-green-500', card: 'border-green-500/25 bg-green-500/[0.04]', text: 'text-white/50 line-through' },
  partial: { icon: 'bg-amber-400', card: 'border-amber-400/25 bg-amber-400/[0.04]', text: 'text-white/70' },
  failed: { icon: 'bg-red-500', card: 'border-red-500/25 bg-red-500/[0.04]', text: 'text-white/50' }
} as const

function StatusIcon({ status }: { status: string | undefined }) {
  if (status === 'done') return <Check size={16} strokeWidth={3} className="text-white" />
  if (status === 'partial') return <Minus size={16} strokeWidth={3} className="text-white" />
  if (status === 'failed') return <X size={16} strokeWidth={3} className="text-white" />
  return null
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
  const status = event.status || 'none'
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.none

  const handleShortPress = (eventData: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
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

  const timeStatus = useMemo(() => {
    if (!event.time || event.status === 'done' || !isToday(parse(event.date || '', 'yyyy-MM-dd', new Date()))) {
      return { approaching: false, passed: !!event.isOverdue }
    }

    try {
      const eventTime = parse(event.time, 'HH:mm', currentTime)
      const passed = isAfter(currentTime, eventTime)
      const approaching = !passed && isAfter(currentTime, subMinutes(eventTime, 15))
      return { approaching, passed }
    } catch {
      return { approaching: false, passed: false }
    }
  }, [currentTime, event.date, event.isOverdue, event.status, event.time])

  const isNeutral = status === 'none' || status === 'todo'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      {...longPress}
      onContextMenu={(eventData) => {
        eventData.preventDefault()
        eventData.stopPropagation()
        onContextMenu?.()
      }}
      data-status-card="dashboard-agenda"
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
            isNeutral ? 'border-white/10 bg-white/5' : cn('border-0', cfg.icon)
          )}
        >
          <StatusIcon status={event.status} />
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

      {!isSelectionMode && event.emoji && (
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: event.color ? `${event.color}20` : 'rgba(255,255,255,0.05)' }}
        >
          {event.emoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={cn('text-base font-bold truncate tracking-tight', cfg.text)}>
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {event.time && (
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest',
                timeStatus.passed && status !== 'done'
                  ? 'text-red-400 font-black'
                  : timeStatus.approaching
                    ? 'text-amber-400 font-bold'
                    : 'text-white/35'
              )}
            >
              <Clock size={10} />
              {event.time}
            </span>
          )}
          {event.isOverdue && status !== 'done' && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-[9px] font-black uppercase tracking-widest">
              <AlertCircle size={9} />
              NÃO REALIZADO
            </span>
          )}
          {event.description && !event.isOverdue && (
            <span className="text-[11px] text-white/25 truncate font-normal italic lowercase">
              {event.description}
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
            title="Editar"
          >
            <Pencil size={13} />
          </button>
        )}

        {!isSelectionMode && !isSelected && (status === 'done' || status === 'partial' || status === 'failed') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex-shrink-0',
              status === 'done' && 'text-green-400 border-green-400/20 bg-green-400/5',
              status === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
              status === 'failed' && 'text-red-400 border-red-400/20 bg-red-400/5'
            )}
          >
            {status === 'done' ? 'CONCLUIDO' : status === 'partial' ? 'PARCIAL' : 'FALHOU'}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default memo(AgendaItem)
