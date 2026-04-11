import { memo, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus, X, Calendar, Clock, RefreshCcw, Circle, Pencil, AlertCircle } from 'lucide-react'
import { format, parse, isAfter, subMinutes, isToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { CalendarEvent } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { StatusChoiceBubble } from './StatusChoiceBubble'

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

  // Status de tempo real
  const timeStatus = useMemo(() => {
    if (!event.time || event.status === 'done' || !isToday(parse(event.date || '', 'yyyy-MM-dd', new Date()))) {
      return { approaching: false, passed: event.isOverdue }
    }
    
    try {
      const eventTime = parse(event.time, 'HH:mm', currentTime)
      const now = currentTime
      
      const isPassed = isAfter(now, eventTime)
      // Flash red if it's within 15 mins of starting
      const isApproaching = !isPassed && isAfter(now, subMinutes(eventTime, 15))
      
      return { approaching: isApproaching, passed: isPassed }
    } catch (e) {
      return { approaching: false, passed: false }
    }
  }, [event.time, event.status, event.isOverdue, event.date, currentTime])

  const longPress = useLongPress(
    () => {
      onContextMenu?.()
    },
    () => {}, // Remove o click do longPress para evitar double-toggling
    { delay: 500 }
  )

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) return
    onOpenBubble?.({ x: e.clientX, y: e.clientY })
  }

  const STATUS_OPTIONS = [
    { id: 'done', label: 'Concluído', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'Parcial', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'Falhou', icon: X, color: 'text-red-500', bg: 'hover:bg-red-500/10' },
    { id: 'todo', label: 'Limpar', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' },
    { id: 'reschedule', label: 'Remarcar', icon: RefreshCcw, color: 'text-red-400', bg: 'hover:bg-red-500/10' }
  ]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      {...longPress}
      onClick={(e) => {
        if (isSelectionMode) {
          e.preventDefault()
          e.stopPropagation()
          onSelect?.()
        } else {
          handleStatusClick(e)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.()
      }}
      className={cn(
        "bg-[var(--bg-overlay)] border rounded-[28px] p-4 flex items-center justify-between gap-4 transition-all group relative overflow-hidden cursor-pointer",
        cfg.border,
        isSelected && "border-red-600/50 bg-red-600/[0.08] ring-1 ring-red-600/20 shadow-[0_0_20px_rgba(224,32,32,0.1)]"
      )}
    >
      
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Status Trigger */}
        {!isSelectionMode && !isSelected && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleStatusClick}
            className={cn(
              "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
              (event.status === 'todo' || !event.status) ? "border-white/10 bg-white/5" : cfg.icon
            )}
          >
            <StatusIcon status={event.status} />
          </motion.div>
        )}

        {isSelectionMode && (
           <div className={cn(
              "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
              isSelected ? "border-red-600 bg-red-600" : "border-white/10 bg-white/5"
           )}>
             {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
           </div>
        )}

        {/* Emoji/Ícone do evento (só aparece se tiver emoji e status for todo/none) */}
        {!isSelectionMode && event.emoji && (event.status === 'todo' || !event.status) && (
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-[var(--bg-overlay)]">
            {event.emoji}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className={cn("text-lg font-bold truncate transition-all tracking-tight", cfg.text)}>
            {event.title}
          </h4>
          <div className="flex items-center gap-3 text-xs font-medium text-white/30 uppercase tracking-widest">
            <span className={cn(
              "flex items-center gap-1.5 transition-all duration-700",
              timeStatus.passed ? "text-[#FF453A] font-black scale-105" : 
              timeStatus.approaching ? "animate-flash-red font-bold" : ""
            )}>
              <Clock size={12} className={cn(timeStatus.passed || timeStatus.approaching ? "text-[#FF453A]" : "")} /> 
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
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
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
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                event.status === 'done' && "text-green-400 border-green-400/20 bg-green-400/5",
                event.status === 'partial' && "text-amber-400 border-amber-400/20 bg-amber-400/5",
                event.status === 'failed' && "text-red-400 border-red-400/20 bg-red-400/5"
              )}
           >
              {event.status === 'done' ? 'CONCLUÍDO' : 
               event.status === 'partial' ? 'PARCIAL' : 'FALHOU'}
           </motion.div>
        )}
      </div>

      {/* Choice Bubble removed (now managed at root) */}
    </motion.div>
  )
}

function StatusIcon({ status }: { status: any }) {
  if (status === 'done')    return <Check size={18} strokeWidth={3} className="text-white" />
  if (status === 'partial') return <Minus size={18} strokeWidth={3} className="text-white" />
  if (status === 'failed')  return <X     size={18} strokeWidth={3} className="text-white" />
  return null
}

export default memo(AgendaItem)
