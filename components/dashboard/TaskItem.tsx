'use client'

import { motion } from 'framer-motion'
import { memo, useRef, useState } from 'react'
import { Check, Minus, X, Pencil, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Task, TaskStatus } from '@/types'
import { CustomDateTimePicker } from './CustomDateTimePicker'

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

  const longPressTimer = useRef<NodeJS.Timeout>()
  const didLongPress = useRef(false)

  const isDone = task.status === 'done' || task.done

  const dueLabel = (task.due && task.due !== 'Hoje') ? task.due : ''

  const handleSave = async () => {
    if (!editTitle.trim()) return
    onUpdate?.(task.id, { title: editTitle, due_date: editDate, due_time: editTime || undefined })
    setIsEditing(false)
    setActivePicker(null)
  }

  /* ── Click / Long-press handlers ── */
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didLongPress.current) { didLongPress.current = false; return }
    const target = e.target as HTMLElement
    if (target.closest('[data-bubble-ignore]')) return
    if (isSelectionMode) { onSelect?.(); return }
    onOpenBubble?.({ x: e.clientX, y: e.clientY })
  }

  const handleTouchStart = () => {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      onContextMenu?.()
    }, 500)
  }

  const handleTouchEnd = () => clearTimeout(longPressTimer.current)

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
              label="Data" type="date" value={editDate} onChange={setEditDate}
              direction="up" isOpen={activePicker === 'date'}
              onToggle={() => setActivePicker(activePicker === 'date' ? null : 'date')}
            />
            <CustomDateTimePicker
              label="Hora" type="time" value={editTime} onChange={setEditTime}
              align="right" direction="up" isOpen={activePicker === 'time'}
              onToggle={() => setActivePicker(activePicker === 'time' ? null : 'time')}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all">
            Salvar Alterações
          </button>
          <button onClick={() => { setIsEditing(false); setActivePicker(null) }} className="px-6 bg-[var(--bg-overlay)] hover:bg-white/5 text-[var(--text-muted)] font-black uppercase tracking-widest py-4 rounded-2xl transition-all">
            Cancelar
          </button>
        </div>
      </motion.div>
    )
  }

  const status = task.status || (task.done ? 'done' : 'todo')
  const isNeutral = status === 'todo' || (!task.status && !task.done)

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.() }}
      data-status-card="dashboard-task"
      className={cn(
        'flex items-center gap-3 p-4 rounded-[28px] border cursor-pointer transition-all duration-300 select-none relative group w-full',
        isDone               ? 'bg-green-500/[0.04] border-green-500/20' :
        status === 'partial' ? 'bg-amber-400/[0.04] border-amber-400/20' :
        status === 'failed'  ? 'bg-red-500/[0.04] border-red-500/20' :
        'border-white/[0.06]',
        isSelected && 'border-red-600/50 bg-red-600/[0.08] ring-1 ring-red-600/20'
      )}
    >
      {/* ── Status circle ── */}
      {!isSelectionMode && (
        <div className={cn(
          'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
          isNeutral
            ? 'border-white/[0.1] bg-white/[0.03]'
            : isDone        ? 'border-0 bg-green-500'
            : status === 'partial' ? 'border-0 bg-amber-400'
            : status === 'failed'  ? 'border-0 bg-red-500'
            : 'border-white/[0.1] bg-white/[0.03]'
        )}>
          {isDone          ? <Check size={14} strokeWidth={4} className="text-white" /> :
           status === 'partial' ? <Minus size={14} strokeWidth={4} className="text-white" /> :
           status === 'failed'  ? <X size={14} strokeWidth={4} className="text-white" /> :
           null}
        </div>
      )}

      {isSelectionMode && (
        <div className={cn(
          'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          isSelected ? 'border-red-600 bg-red-600' : 'border-white/[0.1] bg-white/[0.03]'
        )}>
          {isSelected && <Check size={18} strokeWidth={3} className="text-white" />}
        </div>
      )}

      {/* ── Emoji ── */}
      {!isSelectionMode && task.emoji && (
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-white/[0.04]">
          {task.emoji}
        </div>
      )}

      {/* ── Text info ── */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-base font-bold truncate tracking-tight transition-all', isDone && 'line-through text-white/40')}>
          {task.title}
        </p>
        {(task.due_time || dueLabel) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {task.due_time ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-white/35 uppercase tracking-widest">
                <Clock size={10} /> {task.due_time}
              </span>
            ) : dueLabel ? (
              <span className="text-[11px] text-white/30 truncate font-medium uppercase tracking-widest">{dueLabel}</span>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isSelectionMode && !isSelected && (
          <>
            <button
              type="button"
              data-bubble-ignore="true"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => { e.stopPropagation(); clearTimeout(longPressTimer.current) }}
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              title="Editar"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              data-bubble-ignore="true"
              onClick={(e) => { e.stopPropagation(); onDelete?.() }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => { e.stopPropagation(); clearTimeout(longPressTimer.current) }}
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
        {!isSelectionMode && !isSelected && (isDone || status === 'partial' || status === 'failed') && (
          <div className={cn(
            'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex-shrink-0',
            isDone               && 'text-green-400 border-green-400/20 bg-green-400/5',
            status === 'partial' && 'text-amber-400 border-amber-400/20 bg-amber-400/5',
            status === 'failed'  && 'text-red-400 border-red-400/20 bg-red-400/5'
          )}>
            {isDone ? 'CONCLUÍDO' : status === 'partial' ? 'PARCIAL' : 'FALHOU'}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default memo(TaskItem)
