import { motion } from 'framer-motion'
import { memo, useState } from 'react'
import { Check, Minus, X, Pencil, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Task, TaskStatus } from '@/types'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { CustomDateTimePicker } from './CustomDateTimePicker'
import { resolveBubblePosition } from '@/lib/utils/statusBubble'

interface TaskItemProps {
  task: Task
  onToggle?: () => void
  onStatusChange?: (status: TaskStatus) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onContextMenu?: () => void
  onOpenBubble?: (pos: { x: number; y: number }) => void
  onDelete?: () => void
  onUpdate?: (id: string, updates: Partial<Task>) => void
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
  onDelete,
  onUpdate
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDate, setEditDate] = useState(task.due_date || '')
  const [editTime, setEditTime] = useState(task.due_time || '')
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null)

  const dueLabel = (task.due && task.due !== 'Hoje') ? task.due : (task.due_time ? task.due_time : '')

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

  const handleSave = async () => {
    if (!editTitle.trim()) return

    onUpdate?.(task.id, {
      title: editTitle,
      due_date: editDate,
      due_time: editTime || undefined
    })
    setIsEditing(false)
    setActivePicker(null)
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
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Título</label>
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Título do rascunho..."
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-white font-bold text-lg focus:outline-none focus:border-red-500/40"
            />
          </div>

          <div className="flex gap-3">
            <CustomDateTimePicker
              label="Data"
              type="date"
              value={editDate}
              onChange={setEditDate}
              direction="up"
              isOpen={activePicker === 'date'}
              onToggle={() => setActivePicker(activePicker === 'date' ? null : 'date')}
            />
            <CustomDateTimePicker
              label="Hora"
              type="time"
              value={editTime}
              onChange={setEditTime}
              align="right"
              direction="up"
              isOpen={activePicker === 'time'}
              onToggle={() => setActivePicker(activePicker === 'time' ? null : 'time')}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all"
          >
            Salvar Alterações
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setActivePicker(null)
            }}
            className="px-6 bg-[var(--bg-overlay)] hover:bg-white/5 text-[var(--text-muted)] hover:text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      {...longPress}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.()
      }}
      data-status-card="dashboard-task"
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
            'border-white/[0.08] bg-white/[0.04]'
          )}
          data-status-trigger="true"
        >
          {(task.status === 'done' || task.done) ? (
            <Check size={16} strokeWidth={4} className="text-white" />
          ) : task.status === 'partial' ? (
            <Minus size={16} strokeWidth={4} />
          ) : task.status === 'failed' ? (
            <X size={16} strokeWidth={4} />
          ) : null}
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

      {!isSelectionMode && task.emoji && (
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-[var(--bg-overlay)]">
          {task.emoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={cn('text-base font-bold text-[var(--text-primary)] truncate transition-all tracking-tight', (task.done || task.status === 'done') && 'line-through text-[var(--text-muted)]')}>
          {task.title}
        </p>
        {(task.due_time || dueLabel) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {task.due_time ? (
              <span className="flex items-center gap-1 text-[12px] font-medium text-white/40 uppercase tracking-widest">
                <Clock size={11} /> {task.due_time}
              </span>
            ) : dueLabel ? (
              <span className="text-[12px] text-[var(--text-muted)] truncate font-medium uppercase tracking-widest">{dueLabel}</span>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isSelectionMode && !isSelected && (
          <button
            type="button"
            data-bubble-ignore="true"
            data-ignore-action="edit"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            title="Editar Tarefa"
          >
            <Pencil size={14} />
          </button>
        )}
        {!isSelectionMode && !isSelected && (
          <button
            type="button"
            data-bubble-ignore="true"
            data-ignore-action="delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            title="Excluir Tarefa"
          >
            <Trash2 size={14} />
          </button>
        )}
        {!isSelectionMode && !isSelected && (task.status === 'done' || task.status === 'partial' || task.status === 'failed') && (
          <div className={cn(
            'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border',
            task.status === 'done' && 'text-green-400 border-green-400/20 bg-green-400/5',
            task.status === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
            task.status === 'failed' && 'text-red-400 border-red-400/20 bg-red-400/5'
          )}>
            {task.status === 'done' ? 'CONCLUÍDO' :
             task.status === 'partial' ? 'PARCIAL' : 'FALHOU'}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default memo(TaskItem)
