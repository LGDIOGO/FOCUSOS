import { memo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus, X, Pencil, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Habit, HabitStatus } from '@/types'
import { format } from 'date-fns'
import { getEffectiveOfensiva } from '@/lib/utils/scoring'

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

// ─── Mapeamento de status → estilos ──────────────────────────
const STATUS_CONFIG = {
  none: {
    card:   'bg-[var(--bg-overlay)] border-[var(--border-subtle)]',
    icon:   'bg-[var(--bg-overlay)]',
    btn:    'border-[var(--border-subtle)] bg-[var(--bg-overlay)]',
    text:   'text-[var(--text-primary)]',
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
  onContextMenu,
  onOpenBubble,
  onEdit,
  isToday
}: HabitCardProps) {
  const currentStatus = habit.status || 'none'
  const cfg = (STATUS_CONFIG as any)[currentStatus] || STATUS_CONFIG.none
  
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const activeOfensiva = getEffectiveOfensiva(habit.streak || 0, habit.last_completed_date, currentStatus, todayStr)

  // ─── Long press + click handling (pointer-based, Framer Motion safe) ──
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressActivated = useRef(false)

  function startPress() {
    longPressActivated.current = false
    pressTimer.current = setTimeout(() => {
      longPressActivated.current = true
      onContextMenu?.()
    }, 500)
  }
  function cancelPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }
  function handleClick(e: React.MouseEvent) {
    if (longPressActivated.current) { longPressActivated.current = false; return }
    if (isSelectionMode) { e.preventDefault(); e.stopPropagation(); onSelect?.(); return }
    onOpenBubble?.({ x: e.clientX, y: e.clientY })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        cancelPress()
        onContextMenu?.()
      }}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'flex items-center gap-4 rounded-[28px] border p-4 cursor-pointer select-none transition-all duration-300 relative overflow-hidden group',
        cfg.card,
        isSelected && "border-red-600/50 bg-red-600/[0.08] ring-1 ring-red-600/20 shadow-[0_0_20px_rgba(224,32,32,0.1)]"
      )}
    >

      {/* Status Trigger (Círculo lateral) */}
      {!isSelectionMode && !isSelected && (
        <div
          className={cn(
            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20 flex-none",
            currentStatus === 'none' ? "border-white/10 bg-white/5" : cfg.btn
          )}
        >
          <StatusIcon status={habit.status} />
        </div>
      )}

      {isSelectionMode && (
          <div className={cn(
             "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
             isSelected ? "border-red-600 bg-red-600" : "border-white/10 bg-white/5"
          )}>
           {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
         </div>
      )}

      {/* Ícone do hábito */}
      {!isSelectionMode && habit.emoji && (
        <div 
          className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-colors duration-200', cfg.icon)}
          style={{ backgroundColor: habit.color ? `${habit.color}20` : undefined, color: habit.color }}
        >
          {habit.emoji}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-lg font-bold text-[var(--text-primary)] truncate transition-all duration-300 tracking-tight', cfg.text)}>
          {habit.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {isNegative && (
            <span className="text-[10px] font-black uppercase tracking-widest text-[#e02020] bg-[#e02020]/10 px-1.5 py-0.5 rounded-md">Evitar</span>
          )}
          {habit.time && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-white/40 uppercase tracking-widest">
              <Clock size={11} /> {habit.time}
            </span>
          )}
          {habit.meta && (
            <span className="text-xs font-medium text-white/30 truncate uppercase tracking-widest">{habit.meta}</span>
          )}
          {activeOfensiva > 0 && currentStatus !== 'failed' && (
            <span className="text-[12px] font-black text-amber-400 flex-shrink-0 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">🔥 {activeOfensiva}</span>
          )}
        </div>
      </div>

      {/* Status Label (Right aligned) */}
      <div className="flex items-center gap-2">
        {!isSelectionMode && !isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            className="p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]/80 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            title="Editar Hábito"
          >
            <Pencil size={14} />
          </button>
        )}
        {!isSelectionMode && !isSelected && currentStatus !== 'none' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 border',
              habit.status === 'done'    && 'text-green-400 border-green-400/20 bg-green-400/5',
              habit.status === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
              habit.status === 'failed'  && 'text-[#e02020] border-[#e02020]/20 bg-[#e02020]/5'
            )}
          >
            {cfg.label}
          </motion.div>
        )}
      </div>

      {/* Choice Bubble removed (now managed at root) */}
    </motion.div>
  )
}

export default memo(HabitCard)
