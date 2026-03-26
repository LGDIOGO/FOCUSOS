import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus, X, Calendar, Clock, RefreshCcw, Circle } from 'lucide-react'
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
}

const STATUS_CONFIG = {
  todo: {
    icon: 'bg-white/5 text-white/40',
    border: 'border-white/10',
    text: 'text-white'
  },
  done: {
    icon: 'bg-green-500 text-white',
    border: 'border-green-500/30 bg-green-500/[0.03]',
    text: 'text-white/40 line-through'
  },
  partial: {
    icon: 'bg-amber-400 text-black',
    border: 'border-amber-400/30 bg-amber-400/[0.03]',
    text: 'text-white/70'
  },
  failed: {
    icon: 'bg-red-500 text-white',
    border: 'border-red-500/30 bg-red-500/[0.03]',
    text: 'text-white/40'
  }
}

export default function AgendaItem({ 
  event, 
  onStatusChange, 
  onReschedule,
  isSelectionMode,
  isSelected,
  onSelect,
  onContextMenu
}: AgendaItemProps) {
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 })
  const cfg = STATUS_CONFIG[event.status || 'todo']

  const longPress = useLongPress(
    () => {
      onContextMenu?.()
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
    { id: 'done', label: 'Feito', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'Parcial', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'Falhou', icon: X, color: 'text-red-500', bg: 'hover:bg-red-500/10' },
    { id: 'todo', label: 'Limpar', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' },
    { id: 'reschedule', label: 'Remarcar', icon: RefreshCcw, color: 'text-blue-400', bg: 'hover:bg-blue-500/10' }
  ]

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      {...longPress}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.()
      }}
      className={cn(
        "bg-white/[0.03] border rounded-[28px] p-4 flex items-center justify-between gap-4 hover:bg-white/[0.05] transition-all group relative overflow-hidden",
        cfg.border,
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
      
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Status Trigger */}
        {!isSelectionMode && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleStatusClick}
            className={cn(
              "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
              event.status === 'todo' ? "border-white/10 bg-white/5" : cfg.icon
            )}
          >
            {event.status === 'done' ? <Check size={18} strokeWidth={3} /> :
             event.status === 'partial' ? <Minus size={18} strokeWidth={3} /> :
             event.status === 'failed' ? <X size={18} strokeWidth={3} /> :
             <Calendar size={18} />}
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

        <div className="flex-1 min-w-0">
          <h4 className={cn("text-lg font-bold truncate transition-all tracking-tight", cfg.text)}>
            {event.title}
          </h4>
          <div className="flex items-center gap-3 text-xs font-medium text-white/30 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Clock size={12} /> {event.time}</span>
            <span className="bg-white/5 px-2 py-0.5 rounded-md">{event.type}</span>
            {event.status === 'partial' && (
              <span className="text-amber-400 font-black">REAGENDAR</span>
            )}
          </div>
        </div>
      </div>

      {!isSelectionMode && event.status !== 'todo' && (
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
          {event.status}
        </motion.div>
      )}

      {/* Choice Bubble Popover */}
      <StatusChoiceBubble
        isOpen={bubbleOpen}
        onClose={() => setBubbleOpen(false)}
        onSelect={(status) => {
          if (status === 'reschedule') {
            onReschedule()
          } else {
            onStatusChange(status)
          }
        }}
        options={STATUS_OPTIONS}
        position={bubblePos}
      />
    </motion.div>
  )
}
