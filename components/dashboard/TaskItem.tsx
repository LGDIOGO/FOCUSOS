'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

import { Task, TaskPriority } from '@/types'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-[#b80000]',
  high:     'bg-amber-400',
  medium:   'bg-blue-400',
  low:      'bg-white/20',
}

export default function TaskItem({ 
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

  const handleClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect()
    } else {
      onToggle()
    }
  }

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          onContextMenu()
        }
      }}
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-all duration-200 select-none relative',
        task.done ? 'bg-white/[0.02] border-white/[0.05] opacity-50' : 'bg-white/[0.04] border-white/[0.08]',
        isSelected && 'border-blue-500 bg-blue-500/5 opacity-100'
      )}
    >
      {isSelectionMode && (
        <div className="absolute top-2 right-2 z-10">
           <div className={cn(
             "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
             isSelected ? "bg-blue-500 border-blue-500" : "border-white/20"
           )}>
             {isSelected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
           </div>
        </div>
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
