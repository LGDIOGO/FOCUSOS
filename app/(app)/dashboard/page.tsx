'use client'
// Force build v2.3 (Global Bubble Manager fix)

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, addDays, isToday, getDay, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { auth } from '@/lib/firebase/config'
import HabitCard from '@/components/dashboard/HabitCard'
import TaskItem from '@/components/dashboard/TaskItem'
import ScoreWidget from '@/components/dashboard/ScoreWidget'
import AIInsightBanner from '@/components/dashboard/AIInsightBanner'
import { useHabitsToday, useLogHabit } from '@/lib/hooks/useHabits'
import { useTasksToday, useUpdateTask, useAddTask, useDeleteTask } from '@/lib/hooks/useTasks'
import { RealTimeClock } from '@/components/dashboard/RealTimeClock'
import { useEvents, useUpdateEvent } from '@/lib/hooks/useEvents'
import { HabitStatus, Habit, Task, CalendarEvent, TaskStatus } from '@/types'
import { generateLocalInsights } from '@/lib/services/aiService'
import SeedData from '@/components/dashboard/SeedData'
import { 
  Zap, TrendingUp, Target, Clock, Calendar, Trash2, Plus, 
  ChevronRight, ArrowLeft, ArrowRight, RefreshCcw,
  Check, Minus, X, Circle, Search, Bell, Award, MoreHorizontal
} from 'lucide-react'
import { PerformanceHeader } from '@/components/dashboard/PerformanceHeader'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import AgendaItem from '@/components/dashboard/AgendaItem'
import { RescheduleModal } from '@/components/dashboard/RescheduleModal'
import { StatusChoiceBubble } from '@/components/dashboard/StatusChoiceBubble'

// ─── Utilidades ─────────────────────────────────────────────
const CYCLE: HabitStatus[] = ['none', 'done', 'partial', 'failed']

function calcScore(habits: Habit[], tasks: Task[]) {
  const done    = habits.filter((h: Habit) => h.status === 'done').length
  const partial = habits.filter((h: Habit) => h.status === 'partial').length
  const total   = habits.length
  
  const habitPct  = total > 0 ? Math.round((done + partial * 0.5) / total * 100) : 0
  
  const tasksDone = tasks.filter(t => t.done).length
  const taskPct   = tasks.length > 0 ? Math.round(tasksDone / tasks.length * 100) : 0
  
  return { 
    habitPct, 
    taskPct, 
    combined: Math.round((habitPct + taskPct) / 2), 
    done, 
    partial, 
    total, 
    tasksDone, 
    tasksTotal: tasks.length 
  }
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'today' | 'summary'>('today')
  
  const { data: habitsData, isLoading: loadingHabits } = useHabitsToday(selectedDate)
  const { data: tasksData, isLoading: loadingTasks } = useTasksToday(selectedDate)
  const { data: eventsData, isLoading: loadingEvents } = useEvents()
  const { mutate: logHabit } = useLogHabit()
  const { mutate: updateTask } = useUpdateTask()
  const { mutate: addTask } = useAddTask()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: deleteTask } = useDeleteTask()
  
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [activeBubble, setActiveBubble] = useState<{
    id: string;
    position: { x: number; y: number };
    options: any[];
    onSelect: (status: any) => void;
  } | null>(null);

  const HABIT_OPTIONS = [
    { id: 'done', label: 'CONCLUÍDO', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'PARCIAL', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'FALHOU', icon: X, color: 'text-[#e02020]', bg: 'hover:bg-[#e02020]/10' },
    { id: 'none', label: 'LIMPAR', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' }
  ];

  const AGENDA_OPTIONS = [
    { id: 'done', label: 'CONCLUÍDO', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'PARCIAL', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'FALHOU', icon: X, color: 'text-red-500', bg: 'hover:bg-red-500/10' },
    { id: 'todo', label: 'LIMPAR', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' },
    { id: 'reschedule', label: 'REMARCAR', icon: RefreshCcw, color: 'text-red-400', bg: 'hover:bg-red-500/10' }
  ];

  const TASK_OPTIONS = [
    { id: 'done', label: 'CONCLUÍDO', icon: Check, color: 'text-green-400', bg: 'hover:bg-green-500/10' },
    { id: 'partial', label: 'PARCIAL', icon: Minus, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
    { id: 'failed', label: 'FALHOU', icon: X, color: 'text-red-500', bg: 'hover:bg-red-500/10' },
    { id: 'todo', label: 'LIMPAR', icon: Circle, color: 'text-white/20', bg: 'hover:bg-white/5' }
  ];

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectGroup = (type: 'all' | 'positive' | 'negative' | 'events' | 'tasks') => {
    let ids: string[] = []
    if (type === 'all') {
      ids = [
        ...(habits.map(h => h.id)),
        ...(tasks.map(t => t.id)),
        ...(todayEvents.map(e => e.id))
      ]
    } else if (type === 'positive') {
      ids = habits.filter(h => h.type === 'positive').map(h => h.id)
    } else if (type === 'negative') {
      ids = habits.filter(h => h.type === 'negative').map(h => h.id)
    } else if (type === 'events') {
      ids = todayEvents.map(e => e.id)
    } else if (type === 'tasks') {
      ids = tasks.map(t => t.id)
    }
    setSelectedIds(ids)
    if (ids.length > 0) setIsSelectionMode(true)
  }

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedIds.length} tarefas?`)) {
      selectedIds.forEach(id => deleteTask(id))
      setSelectedIds([])
      setIsSelectionMode(false)
    }
  }

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [eventToReschedule, setEventToReschedule] = useState<CalendarEvent | null>(null)

  const [toast, setToast] = useState<string | null>(null)
  
  const todayStr = format(selectedDate, 'yyyy-MM-dd')
  const todayDay = getDay(selectedDate)
  const isViewingToday = isToday(selectedDate)

  const habits = useMemo(() => habitsData || [], [habitsData])
  const tasks = useMemo(() => tasksData || [], [tasksData])
  const todayEvents = useMemo(() => 
    (eventsData || []).filter((e: CalendarEvent) => {
      // 1. Data específica correspondente
      if (e.date === todayStr) return true
      
      // 2. Recorrência
      if (e.recurrence) {
        if (e.recurrence.frequency === 'daily') return true
        if (e.recurrence.frequency === 'specific_days') {
          return e.recurrence.days_of_week?.includes(todayDay)
        }
      }
      return false
    }),
    [eventsData, todayStr, todayDay]
  )

  // Gera strip de 7 dias com base no offset
  const weekStart = useMemo(() => {
    const baseDate = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), weekOffset * 7)
    return baseDate
  }, [weekOffset])
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const score = useMemo(() => calcScore(habits, tasks), [habits, tasks])

  // Toast com auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  function setEventStatus(id: string, status: any) {
    updateEvent({ id, status })
    
    if (status === 'partial') {
      const ev = todayEvents.find(e => e.id === id)
      if (ev) {
        setEventToReschedule(ev)
        setIsRescheduleOpen(true)
      }
    }

    const labels: any = { done: '✓ Concluído!', partial: '½ Parcial - Reagendar?', failed: '✗ Falhou.' }
    if (labels[status]) setToast(labels[status])
  }

  function handleRescheduleConfirm(newDate: string) {
    if (eventToReschedule) {
      updateEvent({ id: eventToReschedule.id, date: newDate, status: 'todo' })
      setToast('📅 Compromisso reagendado!')
    }
    setIsRescheduleOpen(false)
    setEventToReschedule(null)
  }

  // Set habit status directly: none, done, partial, failed
  function setHabitStatus(id: string, nextStatus: HabitStatus) {
    logHabit({ 
      habitId: id, 
      status: nextStatus,
      logDate: todayStr 
    })
    
    const labels: Record<HabitStatus, string> = { 
      done: '✓ Marcado como feito!', 
      partial: '½ Parcialmente feito.', 
      failed: '✗ Registrado como falha.', 
      none: 'Desmarcado.' 
    }
    setToast(labels[nextStatus])
  }
  
  function handleQuickAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    
    addTask({
      title: newTaskTitle.trim(),
      emoji: '⏺️',
      priority: 'medium',
      due_date: todayStr
    })
    setNewTaskTitle('')
    setToast('Tarefa adicionada!')
  }

  // Toggle task done/undone
  function toggleTask(id: string, isDone: boolean) {
    const nextStatus = isDone ? 'todo' : 'done'
    updateTask({ id, status: nextStatus, completed_at: nextStatus === 'done' ? new Date().toISOString() : undefined })
    setToast(isDone ? 'Marcado como pendente.' : '✓ Tarefa concluída!')
  }
  // Update task status: done, todo, partial, failed
  function updateTaskStatus(id: string, nextStatus: TaskStatus) {
    updateTask({ 
      id, 
      status: nextStatus, 
      completed_at: nextStatus === 'done' ? new Date().toISOString() : undefined,
      done: nextStatus === 'done'
    })
    
    const labels: Partial<Record<TaskStatus, string>> = { 
      done: '✓ Tarefa concluída!', 
      partial: '½ Tarefa marcada como parcial.', 
      failed: '✗ Tarefa marcada como falha.', 
      todo: 'Tarefa pendente.' 
    }
    if (labels[nextStatus]) setToast(labels[nextStatus])
  }

  const positive = habits.filter((h: Habit) => h.type === 'positive')
  const negative = habits.filter((h: Habit) => h.type === 'negative')

  if (loadingHabits || loadingTasks || loadingEvents) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display',sans-serif]">

      {/* ─── Top Bar ─── */}
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-6 pt-4 md:px-10 md:pt-6 lg:px-14 max-w-[1600px] mx-auto w-full"
      >
        <div className="flex items-center gap-6">
           <div>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-white/50 mb-1">FocusOS Dashboard</p>
              <h1 className="text-4xl font-black tracking-tighter">Olá, {auth.currentUser?.displayName?.split(' ')[0] || 'Usuário'}</h1>
           </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
          <PerformanceHeader />
          <RealTimeClock />
          <div className="flex items-center gap-2.5">
            <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group relative">
              <Bell size={20} className="text-white/60 group-hover:text-white transition-colors" />
              <div className="absolute top-3 right-3 w-2 h-2 bg-red-600 rounded-full border-2 border-black" />
            </button>
          </div>
        </div>
      </motion.div>

      <main className="px-6 md:px-10 lg:px-14 space-y-6 pt-0 pb-12 max-w-[1600px] mx-auto">

        {/* ─── Tab Switcher ─── */}
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl w-fit mx-auto md:mx-0">
          <button 
            onClick={() => setView('today')}
            className={cn(
              "px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              view === 'today' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Foco Hoje
          </button>
          <button 
            onClick={() => setView('summary')}
            className={cn(
              "px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              view === 'summary' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Resumo & Metas
          </button>
        </div>

        {/* ─── Week Strip ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50">
                {weekOffset === 0 ? 'Semana atual' : weekOffset < 0 ? `${Math.abs(weekOffset)} semanas atrás` : `${weekOffset} semanas à frente`}
              </p>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                >
                  <ArrowLeft size={12} />
                </button>
                <button 
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-0.5 hover:bg-white/10 rounded-lg transition-colors text-[10px] font-bold text-white/40 hover:text-white uppercase"
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                >
                  <ChevronRight size={12} className="rotate-0" />
                </button>
              </div>
            </div>
            {!isViewingToday && (
              <button 
                onClick={() => {
                  setSelectedDate(new Date())
                  setWeekOffset(0)
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-[11px] font-black uppercase tracking-widest transition-all"
              >
                <ArrowLeft size={10} /> Voltar para Hoje
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
            {weekDays.map((d, i) => {
              const isActive = isSameDay(d, selectedDate)
              const isTodayActual = isToday(d)
              
              return (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setSelectedDate(d)}
                  className={`flex-none flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border cursor-pointer min-w-[46px] transition-all
                    ${isActive ? 'bg-white border-transparent shadow-[0_4px_12px_rgba(255,255,255,0.1)]' : 'bg-white/[0.04] border-white/[0.08]'}
                    ${d < new Date() && !isTodayActual ? 'border-green-500/20' : ''}
                  `}
                >
                  <span className={`text-[12px] font-semibold uppercase tracking-wide ${isActive ? 'text-black' : 'text-white/50'}`}>
                    {format(d, 'EEE', { locale: ptBR }).slice(0, 3)}
                  </span>
                  <span className={`text-base font-bold ${isActive ? 'text-black' : 'text-white/60'}`}>
                    {format(d, 'd')}
                  </span>
                  <div className={`w-1 h-1 rounded-full transition-opacity 
                    ${isTodayActual ? 'bg-red-600 opacity-100' : 
                      (d < new Date() ? 'bg-white/20 opacity-100' : 'opacity-0')}
                    ${isActive && isTodayActual ? 'bg-red-700' : ''}
                  `} />
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ─── Score Cards ─── */}
        <ScoreWidget score={score} />

        <AnimatePresence mode="wait">
          {view === 'today' ? (
            <motion.div 
              key="today"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-10 max-w-[1600px] mx-auto w-full"
            >
              {/* ─── Today's Agenda ─── */}
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50">Compromissos de hoje</p>
                      <div className="flex items-center gap-3">
                        <Link href="/dashboard/agenda?add=true" className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition-all">
                          <Plus size={14} />
                        </Link>
                        <Link href="/dashboard/agenda" className="text-sm text-white/60 hover:text-white flex items-center gap-0.5 transition-colors">
                          Ver todos <ChevronRight size={12} />
                        </Link>
                      </div>
                   </div>
                   <div className="flex flex-col gap-2">
                      {todayEvents.map(event => (
                        <AgendaItem 
                          key={event.id} 
                          event={event} 
                          onStatusChange={status => setEventStatus(event.id, status)}
                          onReschedule={() => {
                            setEventToReschedule(event)
                            setIsRescheduleOpen(true)
                          }}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedIds.includes(event.id)}
                          onSelect={() => toggleSelection(event.id)}
                          onContextMenu={() => {
                            setIsSelectionMode(true)
                            toggleSelection(event.id)
                          }}
                          onOpenBubble={(position) => setActiveBubble({
                            id: event.id,
                            position,
                            options: AGENDA_OPTIONS,
                            onSelect: (status) => {
                              if (status === 'reschedule') {
                                setEventToReschedule(event)
                                setIsRescheduleOpen(true)
                              } else {
                                setEventStatus(event.id, status)
                              }
                              setActiveBubble(null)
                            }
                          })}
                        />
                      ))}
                       {todayEvents.length === 0 && (
                         <p className="text-sm text-white/30 italic px-4 py-2">Nenhum compromisso para hoje.</p>
                       )}
                    </div>
                 </section>

              {/* ─── Positive Habits ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50">Hábitos positivos</p>
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard/habits?add=true" className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition-all">
                      <Plus size={14} />
                    </Link>
                    <Link href="/dashboard/habits" className="text-sm text-white/60 hover:text-white flex items-center gap-0.5 transition-colors">
                      Ver todos <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                    {positive.map((h: Habit) => (
                      <HabitCard 
                        key={h.id} 
                        habit={h} 
                        onStatusChange={status => setHabitStatus(h.id, status)}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedIds.includes(h.id)}
                        onSelect={() => toggleSelection(h.id)}
                        onContextMenu={() => {
                          setIsSelectionMode(true)
                          toggleSelection(h.id)
                        }}
                        onOpenBubble={(position) => setActiveBubble({
                          id: h.id,
                          position,
                          options: HABIT_OPTIONS,
                          onSelect: (status) => {
                            setHabitStatus(h.id, status)
                            setActiveBubble(null)
                          }
                        })}
                      />
                    ))}
                </div>
              </section>

              {/* ─── Negative Habits ─── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#b80000]" />
                  <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#b80000]">Hábitos a evitar</p>
                </div>
                <div className="flex flex-col gap-2">
                  {negative.map((h: Habit) => (
                    <HabitCard 
                      key={h.id} 
                      habit={h} 
                      onStatusChange={status => setHabitStatus(h.id, status)} 
                      isNegative 
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.includes(h.id)}
                      onSelect={() => toggleSelection(h.id)}
                      onContextMenu={() => {
                        setIsSelectionMode(true)
                        toggleSelection(h.id)
                      }}
                      onOpenBubble={(position) => setActiveBubble({
                        id: h.id,
                        position,
                        options: HABIT_OPTIONS,
                        onSelect: (status) => {
                          setHabitStatus(h.id, status)
                          setActiveBubble(null)
                        }
                      })}
                    />
                  ))}
                </div>
              </section>

              {/* ─── Tasks ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50">Rascunho de hoje</p>
                  <span className="text-[13px] text-white/50">{score.tasksDone}/{score.tasksTotal} concluídas</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <form onSubmit={handleQuickAddTask} className="mb-2 relative group">
                    <input 
                      type="text"
                      placeholder="Adicionar tarefa rápida..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all placeholder:text-white/20 pr-12 group-hover:border-white/10"
                    />
                    <button 
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white text-white hover:text-black transition-all active:scale-90"
                    >
                      <Plus size={16} />
                    </button>
                  </form>
                   {tasks.map((t: Task) => (
                    <TaskItem 
                      key={t.id} 
                      task={t} 
                      onToggle={() => toggleTask(t.id, t.done)}
                      onStatusChange={(status) => {
                        // Se o status for 'done', toggleTask(true). Se for todo, toggleTask(false).
                        // Se for partial/failed, atualizamos o status no firebase.
                        if (status === 'done') toggleTask(t.id, false)
                        else if (status === 'todo') toggleTask(t.id, true)
                        else updateTaskStatus(t.id, status)
                      }}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.includes(t.id)}
                      onSelect={() => toggleSelection(t.id)}
                      onContextMenu={() => {
                        setIsSelectionMode(true)
                        toggleSelection(t.id)
                      }}
                      onOpenBubble={(position) => setActiveBubble({
                        id: t.id,
                        position,
                        options: TASK_OPTIONS,
                        onSelect: (status) => {
                          if (status === 'done') toggleTask(t.id, false)
                          else if (status === 'todo') toggleTask(t.id, true)
                          else updateTaskStatus(t.id, status)
                          setActiveBubble(null)
                        }
                      })}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="summary"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-10 max-w-[1600px] mx-auto w-full"
            >
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-8">
                 <h2 className="text-2xl font-black tracking-tight mb-6">Performance & Metas</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {[
                      { label: 'Hábitos do Dia', val: score.habitPct, color: 'text-red-600' },
                      { label: 'Tarefas do Dia', val: score.taskPct, color: 'text-green-500' },
                      { label: 'Consistência Semanal', val: 88, color: 'text-amber-500' },
                      { label: 'Score Global', val: score.combined, color: 'text-white' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white/5 border border-white/5 p-6 rounded-3xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">{stat.label}</p>
                        <p className={cn("text-3xl font-black", stat.color)}>{stat.val}%</p>
                      </div>
                    ))}
                 </div>
                 
                 <div className="flex flex-col gap-4">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Gerenciamento Rápido (Resumo)</p>
                    {/* Aqui listamos abreviado para seleção em massa */}
                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => handleSelectGroup('all')} className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white hover:text-black text-[11px] font-black uppercase tracking-widest transition-all">Tudo</button>
                        <button onClick={() => handleSelectGroup('positive')} className="px-6 py-3 bg-red-600/10 border border-red-600/10 rounded-2xl hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest transition-all">Hábitos 👍</button>
                       <button onClick={() => handleSelectGroup('negative')} className="px-6 py-3 bg-red-500/10 border border-red-500/10 rounded-2xl hover:bg-red-500 text-white text-[11px] font-black uppercase tracking-widest transition-all">Evitar 🛑</button>
                       <button onClick={() => handleSelectGroup('tasks')} className="px-6 py-3 bg-green-500/10 border border-green-500/10 rounded-2xl hover:bg-green-500 text-white text-[11px] font-black uppercase tracking-widest transition-all">Tarefas ⏺️</button>
                    </div>

                    <div className="mt-6 space-y-3">
                        {habits.map(h => (
                          <HabitCard 
                            key={h.id}
                            habit={h}
                            onStatusChange={(status) => setHabitStatus(h.id, status)}
                            isNegative={h.type === 'negative'}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedIds.includes(h.id)}
                            onSelect={() => toggleSelection(h.id)}
                            onContextMenu={() => {
                              setIsSelectionMode(true)
                              toggleSelection(h.id)
                            }}
                            onOpenBubble={(position) => setActiveBubble({
                              id: h.id,
                              position,
                              options: HABIT_OPTIONS,
                              onSelect: (status) => {
                                setHabitStatus(h.id, status)
                                setActiveBubble(null)
                              }
                            })}
                          />
                        ))}
                     </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── AI Insight ─── */}

        <SeedData />

        <AIInsightBanner habits={habits} tasks={tasks} />
      </main>

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] px-8 py-5 flex items-center gap-8 shadow-2xl"
          >
            <div className="text-sm font-black uppercase tracking-widest text-white/60 text-center flex flex-col items-center">
              <span className="text-2xl text-white">{selectedIds.length}</span>
              <span className="text-[9px]">Selecionados</span>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="flex items-center gap-4">
              {[
                { label: 'Tudo', icon: Zap, onClick: () => handleSelectGroup('all') },
                { label: 'Positivos', icon: TrendingUp, onClick: () => handleSelectGroup('positive') },
                { label: 'A Evitar', icon: Target, onClick: () => handleSelectGroup('negative') },
                { label: 'Agenda', icon: Calendar, onClick: () => handleSelectGroup('events') },
                { label: 'Rascunho', icon: Clock, onClick: () => handleSelectGroup('tasks') },
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={btn.onClick}
                  className="flex flex-col items-center gap-1.5 text-white/40 hover:text-white transition-all group/sel"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/sel:bg-white group-hover/sel:text-black transition-all">
                    <btn.icon size={18} />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/sel:opacity-60 transition-opacity">
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="flex items-center gap-4">
              <button 
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="flex flex-col items-center gap-1.5 text-red-500/40 hover:text-red-500 transition-all disabled:opacity-5 group/del"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/del:bg-red-500 group-hover/del:text-white transition-all">
                  <Trash2 size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover/del:opacity-60 transition-opacity">Excluir</span>
              </button>
              
              <button 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds([])
                }}
                className="bg-white/10 hover:bg-white text-white hover:text-black px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur border border-white/10 text-white text-base font-medium rounded-full px-5 py-2.5 whitespace-nowrap z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeBubble && (
          <StatusChoiceBubble
            isOpen={true}
            onClose={() => setActiveBubble(null)}
            onSelect={activeBubble.onSelect}
            options={activeBubble.options}
            position={activeBubble.position}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
