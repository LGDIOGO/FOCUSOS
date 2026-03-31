import { motion } from 'framer-motion'
import { memo } from 'react'
import { Check, Minus, X, Circle, Zap, Target, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { useState } from 'react'
import { StatusChoiceBubble } from './StatusChoiceBubble'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-[#b80000]',
  high:     'bg-amber-400',
  medium:   'bg-white/40',
  low:      'bg-white/20',
}

function TaskItem({ 
  task, 
  onToggle,
  onStatusChange,
  isSelectionMode,
  isSelected,
  onSelect,
  onContextMenu,
  onOpenBubble,
  onEdit,
  onDelete
}: { 
  task: Task; 
  onToggle?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onContextMenu?: () => void;
  onOpenBubble?: (pos: { x: number; y: number }) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  
  const dueLabel = (task.due && task.due !== 'Hoje') ? task.due : (task.due_time ? task.due_time : '')

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) return
    onOpenBubble?.({ x: e.clientX, y: e.clientY })
  }

  const STATUS_OPTIONS = [
    { id: 'done', label: 'CONCLUÍDO', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'PARCIAL', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'FALHOU', icon: X, color: 'text-[#e02020]', bg: 'hover:bg-[#e02020]/10' },
    { id: 'todo', label: 'LIMPAR', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' }
  ]

  const longPress = useLongPress(
    () => {
      onContextMenu?.()
    },
    () => {}, // Remove o click do longPress para evitar double-toggling
    { delay: 500 }
  )

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
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
        'flex items-center gap-4 p-4 rounded-[28px] border cursor-pointer transition-all duration-300 select-none relative group w-full',
        (task.status === 'done' || task.done) ? 'bg-green-500/[0.03] border-green-500/20' : 
        task.status === 'partial' ? 'bg-amber-400/[0.03] border-amber-400/20' :
        task.status === 'failed' ? 'bg-red-500/[0.03] border-red-500/20' :
        'bg-[var(--bg-overlay)] border-[var(--border-subtle)]',
        isSelected && 'border-red-600/50 bg-red-600/[0.08] ring-1 ring-red-600/20 shadow-[0_0_20px_rgba(224,32,32,0.1)]'
      )}
    >
      {!isSelectionMode && (
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'w-12 h-12 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200',
            (task.status === 'done' || task.done) ? 'bg-green-500 border-green-500' : 
            task.status === 'partial' ? 'bg-amber-400 border-amber-400 text-black' :
            task.status === 'failed' ? 'bg-red-500 border-red-500' :
            'border-white/25 bg-white/5'
          )}
        >
          {(task.status === 'done' || task.done) ? (
            <Check size={16} strokeWidth={4} className="text-white" />
          ) : task.status === 'partial' ? (
            <Minus size={16} strokeWidth={4} />
          ) : task.status === 'failed' ? (
            <X size={16} strokeWidth={4} />
          ) : (
            null
          )}
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

      {/* Info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {task.emoji && <span className="text-lg flex-shrink-0">{task.emoji}</span>}
        <div className="min-w-0 flex-1">
          <p className={cn('text-base font-bold text-[var(--text-primary)] truncate transition-all', (task.done || task.status === 'done') && 'line-through text-[var(--text-muted)]')}>
            {task.title}
          </p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate font-medium uppercase tracking-widest">{dueLabel}</p>
        </div>
      </div>

      {/* Status Badge & Actions */}
      <div className="flex items-center gap-2">
        {!isSelectionMode && !isSelected && (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            className="p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all active:scale-90"
            title="Editar Tarefa"
          >
            <Pencil size={14} />
          </button>
        )}
        {!isSelectionMode && !isSelected && (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.()
            }}
            className="p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
            title="Excluir Tarefa"
          >
            <Trash2 size={14} />
          </button>
        )}
        {!isSelectionMode && !isSelected && ((task.status && task.status !== 'todo') || task.done) && (
          <div className={cn(
            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
            (task.status === 'done' || task.done) && "text-green-400 border-green-400/20 bg-green-400/5",
            task.status === 'partial' && "text-amber-400 border-amber-400/20 bg-amber-400/5",
            task.status === 'failed' && "text-red-400 border-red-400/20 bg-red-400/5",
            (!task.status || task.status === 'todo') && !task.done && "text-[var(--text-muted)] border-[var(--border-subtle)] bg-[var(--bg-overlay)]/10"
          )}>
             {(task.status === 'done' || task.done) ? 'CONCLUÍDO' : 
              task.status === 'partial' ? 'PARCIAL' : 
              task.status === 'failed' ? 'FALHOU' : 'PENDENTE'}
          </div>
        )}
      </div>

      {/* Choice Bubble removed (now managed at root) */}
    </motion.div>
  )
}

export default memo(TaskItem)
