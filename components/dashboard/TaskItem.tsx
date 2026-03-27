import { motion } from 'framer-motion'
import { memo } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Task, TaskPriority } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-[#b80000]',
  high:     'bg-amber-400',
  medium:   'bg-blue-400',
  low:      'bg-white/20',
}

function TaskItem({ 
  task, 
  onToggle,
  isSelectionMode,
  isSelected,
  onSelect,
  onContextMenu
}: { 
  task: Task; 
  onToggle: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onContextMenu?: () => void;
}) {
  const dueLabel = task.due || (task.due_time ? `Hoje · ${task.due_time}` : 'Hoje')

  const longPress = useLongPress(
    () => {
      onContextMenu?.()
    },
    () => {
      if (isSelectionMode && onSelect) {
        onSelect()
      } else {
        onToggle()
      }
    },
    { delay: 500 }
  )

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      {...longPress}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          onContextMenu()
        }
      }}
      className={cn(
        'flex items-center gap-3 px-4 py-4 rounded-[28px] border cursor-pointer transition-all duration-300 select-none relative',
        task.done ? 'bg-white/[0.02] border-white/[0.05] opacity-50' : 'bg-white/[0.04] border-white/[0.08]',
        isSelected && 'border-blue-500/50 bg-blue-500/[0.08] ring-1 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
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
      {/* Check circle */}
      <div className={cn(
        'w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-200',
        task.done ? 'bg-green-500 border-green-500' : 'border-white/25'
      )}>
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {task.emoji && <span className="text-lg flex-shrink-0">{task.emoji}</span>}
        <div className="min-w-0 flex-1">
          <p className={cn('text-base font-medium text-white truncate', task.done && 'line-through text-white/60')}>
            {task.title}
          </p>
          <p className="text-[13px] text-white/50 mt-0.5 truncate">{dueLabel}</p>
        </div>
      </div>

      {/* Priority */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task.priority === 'critical' && (
          <span className="text-[12px] font-bold text-[#e02020] uppercase tracking-wider">Crítico</span>
        )}
        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_COLORS[task.priority])} />
      </div>
    </motion.div>
  )
}

export default memo(TaskItem)
