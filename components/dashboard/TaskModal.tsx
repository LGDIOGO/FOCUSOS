import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, RefreshCcw, ChevronDown, Flag, Clock, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmojiPicker } from './EmojiPicker'
import { CustomDateTimePicker } from './CustomDateTimePicker'
import { useGoals } from '@/lib/hooks/useGoals'
import { useAddTask, useUpdateTask } from '@/lib/hooks/useTasks'
import { Task, TaskPriority } from '@/types'
import { cn } from '@/lib/utils/cn'

export function TaskModal({ isOpen, onClose, taskToEdit }: { isOpen: boolean, onClose: () => void, taskToEdit?: Task | null }) {
  const { data: goals } = useGoals()
  const addTask = useAddTask()
  const updateTask = useUpdateTask()

  const [isGoalSelectOpen, setIsGoalSelectOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)

  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: format(new Date(), 'yyyy-MM-dd'),
    due_time: '',
    emoji: '',
    goal_id: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTaskData({
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          priority: taskToEdit.priority || 'medium',
          due_date: taskToEdit.due_date || format(new Date(), 'yyyy-MM-dd'),
          due_time: taskToEdit.due_time || '',
          emoji: taskToEdit.emoji || '',
          goal_id: taskToEdit.goal_id || ''
        })
      } else {
        setTaskData({
          title: '',
          description: '',
          priority: 'medium',
          due_date: format(new Date(), 'yyyy-MM-dd'),
          due_time: '',
          emoji: '',
          goal_id: ''
        })
      }
    }
  }, [isOpen, taskToEdit])

  const handleMagicParse = async () => {
    if (!taskData.title || isParsing) return
    setIsParsing(true)
    try {
      const response = await fetch('/api/ai/parse-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: taskData.title,
          type: 'tasks',
          currentDetails: {
            today: format(new Date(), 'yyyy-MM-dd'),
            dayName: format(new Date(), 'EEEE', { locale: ptBR })
          }
        })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setTaskData(prev => ({
        ...prev,
        title: data.title || prev.title,
        due_time: data.time || prev.due_time,
        due_date: data.date || prev.due_date,
        emoji: data.emoji || prev.emoji,
        priority: data.priority || prev.priority
      }))
    } catch (err) {
      console.error('Magic Parse Fail:', err)
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskToEdit) {
      updateTask.mutate({
        id: taskToEdit.id,
        ...taskData
      }, {
        onSuccess: () => {
          onClose()
        }
      })
    } else {
       addTask.mutate({
        ...taskData
      } as any, {
        onSuccess: () => {
          onClose()
        }
      })
    }
  }

  if (!isOpen) return null

  const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
    { id: 'critical', label: 'Crítica', color: 'bg-red-600' },
    { id: 'high', label: 'Alta', color: 'bg-amber-400' },
    { id: 'medium', label: 'Média', color: 'bg-white/40' },
    { id: 'low', label: 'Baixa', color: 'bg-white/20' },
  ]

  return (
    <div className="fixed inset-0 z-[10000] flex items-end md:items-center md:justify-center md:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="relative w-full md:max-w-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-t-[32px] md:rounded-[48px] p-5 md:p-8 overflow-y-auto max-h-[92dvh] md:max-h-[90vh] shadow-2xl z-[10001]"
      >
        {/* Drag handle — mobile only */}
        <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mb-4 md:hidden" />

        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-black tracking-tightest text-[var(--text-primary)]">{taskToEdit ? 'Editar Rascunho' : 'Novo Rascunho'}</h2>
          <button onClick={onClose} className="p-2.5 md:p-3 hover:bg-[var(--bg-overlay)] rounded-2xl transition-all">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Título & Magic Parse */}
          <div className="space-y-2">
            <label className="text-[13px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Título da Tarefa</label>
            <div className="relative group">
              <input 
                required
                value={taskData.title}
                onChange={e => setTaskData({ ...taskData, title: e.target.value })}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-bold text-xl pr-14"
                placeholder="O que precisa ser feito?"
              />
              <button
                type="button"
                onClick={handleMagicParse}
                disabled={isParsing || !taskData.title}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                  isParsing ? "bg-[var(--bg-overlay)] animate-pulse" : "bg-transparent hover:bg-[var(--bg-overlay)]",
                  taskData.title ? "text-red-500 opacity-100" : "text-[var(--text-muted)] opacity-0 pointer-events-none"
                )}
              >
                {isParsing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} className={cn(taskData.title && "animate-pulse")} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Personalização (Emoji) */}
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Ícone</label>
              <div className="flex items-center gap-4">
                <EmojiPicker value={taskData.emoji || ''} onChange={emoji => setTaskData({ ...taskData, emoji })} />
              </div>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Prioridade</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTaskData({ ...taskData, priority: p.id })}
                    className={cn(
                      "py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                      taskData.priority === p.id 
                        ? (p.id === 'critical' ? "bg-red-600 border-red-600 text-white shadow-lg" : "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg")
                        : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", p.color)} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agendamento */}
          <div className="space-y-2">
             <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Quando</label>
             <div className="grid grid-cols-2 gap-3">
                <CustomDateTimePicker 
                  label="Data" 
                  type="date" 
                  value={taskData.due_date} 
                  onChange={val => setTaskData({ ...taskData, due_date: val })} 
                  direction="up" 
                />
                <CustomDateTimePicker 
                  label="Hora (Opcional)" 
                  type="time" 
                  value={taskData.due_time || ''} 
                  onChange={val => setTaskData({ ...taskData, due_time: val })} 
                  align="right" 
                  direction="up" 
                />
             </div>
          </div>

          {/* Vincular a Meta */}
          <div className="space-y-2">
            <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Vincular a Meta (Opcional)</label>
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setIsGoalSelectOpen(!isGoalSelectOpen)} 
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-bold text-sm flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  {taskData.goal_id ? (
                    <>
                      <span className="text-xl">{goals?.find(g => g.id === taskData.goal_id)?.emoji}</span>
                      <span className="truncate max-w-[250px]">{goals?.find(g => g.id === taskData.goal_id)?.title}</span>
                    </>
                  ) : <span className="text-[var(--text-muted)]">Nenhuma Meta vinculada</span>}
                </span>
                <ChevronDown size={18} className={cn("text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-all transform", isGoalSelectOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {isGoalSelectOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    className="absolute bottom-full mb-2 left-0 w-full z-[100] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto backdrop-blur-xl"
                  >
                    <button 
                      type="button" 
                      onClick={() => { setTaskData({ ...taskData, goal_id: '' }); setIsGoalSelectOpen(false); }} 
                      className={cn(
                        "w-full text-left px-5 py-4 text-sm font-bold transition-colors flex items-center gap-3 border-b border-[var(--border-subtle)]",
                        !taskData.goal_id ? "bg-[var(--bg-overlay)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--bg-overlay)]"><X size={12}/></div>
                      <span>Nenhuma Meta</span>
                    </button>
                    {goals?.filter(g => g.status === 'active').map(goal => (
                      <button 
                        key={goal.id} 
                        type="button" 
                        onClick={() => { setTaskData({ ...taskData, goal_id: goal.id }); setIsGoalSelectOpen(false); }} 
                        className={cn(
                          "w-full text-left px-5 py-4 text-sm font-bold transition-colors flex items-center gap-3",
                          taskData.goal_id === goal.id ? "bg-[var(--bg-overlay)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <span className="text-xl">{goal.emoji}</span>
                        <span className="truncate">{goal.title}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-[12px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Descrição</label>
            <textarea 
              value={taskData.description} 
              onChange={e => setTaskData({ ...taskData, description: e.target.value })} 
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-medium text-base min-h-[80px] max-h-[150px] resize-none" 
              placeholder="Notas adicionais sobre esta tarefa..." 
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={addTask.isPending || updateTask.isPending} 
              className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black py-5 rounded-[28px] hover:opacity-90 transition-all active:scale-95 text-lg shadow-xl"
            >
              {addTask.isPending || updateTask.isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCcw size={20} className="animate-spin" />
                  Salvando...
                </div>
              ) : (taskToEdit ? 'Salvar Alterações' : 'Criar Rascunho')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
