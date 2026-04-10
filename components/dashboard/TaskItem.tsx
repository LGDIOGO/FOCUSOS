import { motion } from 'framer-motion'
import { memo } from 'react'
import { Check, Minus, X, Circle, Zap, Target, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { useState } from 'react'
import { StatusChoiceBubble } from './StatusChoiceBubble'
import { CustomDateTimePicker } from './CustomDateTimePicker'

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
  onDelete,
  onUpdate
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
  onUpdate?: (id: string, updates: Partial<Task>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDate, setEditDate] = useState(task.due_date || '')
  const [editTime, setEditTime] = useState(task.due_time || '')

  const dueLabel = (task.due && task.due !== 'Hoje') ? task.due : (task.due_time ? task.due_time : '')

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) return
    onOpenBubble?.({ x: e.clientX, y: e.clientY })
  }

  const longPress = useLongPress(
    () => {
      onContextMenu?.()
    },
    () => {}, // Remove o click do longPress para evitar double-toggling
    { delay: 500 }
  )

  const handleSave = () => {
    onUpdate?.(task.id, {
      title: editTitle,
      due_date: editDate,
      due_time: editTime
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 p-5 rounded-[40px] bg-[var(--bg-primary)] border border-red-500/30 shadow-2xl relative z-[1001]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80">Editando Rascunho</span>
             <button onClick={() => setIsEditing(false)} className="text-[var(--text-muted)] hover:text-white p-1">
               <X size={16} />
             </button>
          </div>
          
          <div className="space-y-2">
            <input 
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Título do rascunho..."
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-white font-bold text-lg focus:outline-none focus:border-red-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <CustomDateTimePicker 
               label="Data" 
               type="date" 
               value={editDate} 
               onChange={setEditDate} 
               direction="up"
             />
             <CustomDateTimePicker 
               label="Hora" 
               type="time" 
               value={editTime} 
               onChange={setEditTime} 
               align="right"
               direction="up"
             />
          </div>

          <div className="flex gap-2 pt-2">
             <button
               onClick={handleSave}
               className="flex-1 bg-white text-black font-black py-4 rounded-[22px] hover:opacity-90 active:scale-95 transition-all text-xs uppercase tracking-widest"
             >
               Salvar
             </button>
             <button
               onClick={() => setIsEditing(false)}
               className="px-6 bg-white/5 text-[var(--text-muted)] font-black py-4 rounded-[22px] hover:bg-white/10 active:scale-95 transition-all text-xs uppercase tracking-widest"
             >
               Cancelar
             </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
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
              setIsEditing(true)
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
        {!isSelectionMode && !isSelected && (task.status === 'done' || task.status === 'partial' || task.status === 'failed') && (
          <div className={cn(
            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
            task.status === 'done' && "text-green-400 border-green-400/20 bg-green-400/5",
            task.status === 'partial' && "text-amber-400 border-amber-400/20 bg-amber-400/5",
            task.status === 'failed' && "text-red-400 border-red-400/20 bg-red-400/5"
          )}>
             {task.status === 'done' ? 'CONCLUÍDO' : 
              task.status === 'partial' ? 'PARCIAL' : 'FALHOU'}
          </div>
        )}
      </div>

      {/* Choice Bubble removed (now managed at root) */}
    </motion.div>
  )
}

export default memo(TaskItem)

