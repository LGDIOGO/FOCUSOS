'use client'
// Force build v2.3 (Global Bubble Manager fix)

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, addDays, isToday, getDay, isSameDay, isTomorrow, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { auth } from '@/lib/firebase/config'
import HabitCard from '@/components/dashboard/HabitCard'
import TaskItem from '@/components/dashboard/TaskItem'
import ScoreWidget from '@/components/dashboard/ScoreWidget'
import AIInsightBanner from '@/components/dashboard/AIInsightBanner'
import { useHabitsToday, useLogHabit, useDeleteHabit } from '@/lib/hooks/useHabits'
import { useTasksToday, useUpdateTask, useAddTask, useDeleteTask } from '@/lib/hooks/useTasks'
import { useGoals } from '@/lib/hooks/useGoals'
import { RealTimeClock } from '@/components/dashboard/RealTimeClock'
import { useEventsToday, useLogEvent, useUpdateEvent, useDeleteEvent } from '@/lib/hooks/useEvents'
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
import { TutorialModal } from '@/components/dashboard/TutorialModal'
import { calculateProgress } from '@/lib/utils/performance'
import { usePerformanceMetrics } from '@/lib/hooks/usePerformance'

// ─── Utilidades ─────────────────────────────────────────────
const CYCLE: HabitStatus[] = ['none', 'done', 'partial', 'failed']

function calcScore(habits: Habit[], tasks: Task[], events: CalendarEvent[]) {
  const done    = habits.filter((h: Habit) => h.status === 'done').length
  const partial = habits.filter((h: Habit) => h.status === 'partial').length
  const total   = habits.length
  
  const tasksDone = tasks.filter(t => t.done).length
  const tasksTotal = tasks.length

  const combined = calculateProgress(habits, tasks, events)
  
  return { 
    habitPct: total > 0 ? Math.round((done + partial * 0.5) / total * 100) : 0, 
    taskPct: tasksTotal > 0 ? Math.round(tasksDone / tasksTotal * 100) : 0,
    eventPct: events.length > 0 ? Math.round((events.filter(e => e.status === 'done').length + events.filter(e => e.status === 'partial').length * 0.5) / events.length * 100) : 0,
    combined, 
    done, 
    partial, 
    total, 
    tasksDone, 
    tasksTotal
  }
}
  
function getDateLabel(date: Date) {
  if (isToday(date)) return 'HOJE'
  if (isTomorrow(date)) return 'AMANHÃ'
  if (isYesterday(date)) return 'ONTEM'
  return format(date, 'dd/MM/yyyy')
}

function getSectionLabel(baseTitle: string, date: Date) {
  const label = getDateLabel(date)
  const upperBase = baseTitle.toUpperCase()
  if (['HOJE', 'AMANHÃ', 'ONTEM'].includes(label)) {
    return `${upperBase} DE ${label}`
  }
  return `${upperBase} DO DIA ${label}`
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  // Evitar hydration mismatch forçando a data a ser recalculada no cliente
  useEffect(() => {
    setSelectedDate(new Date())
  }, [])
  
  const { data: habitsData, isLoading: loadingHabits } = useHabitsToday(selectedDate)
  const { data: tasksData, isLoading: loadingTasks } = useTasksToday(selectedDate)
  const { data: eventsToday, isLoading: loadingEvents } = useEventsToday(selectedDate)
  const { mutate: logHabit } = useLogHabit()
  const { mutate: logEvent } = useLogEvent()
  const { mutate: updateTask } = useUpdateTask()
  const { mutate: addTask } = useAddTask()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutateAsync: deleteTask } = useDeleteTask()
  const { mutateAsync: deleteHabit } = useDeleteHabit()
  const { mutateAsync: deleteEvent } = useDeleteEvent()
  
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const { data: metrics } = usePerformanceMetrics(weekOffset)
  const dailyScores = metrics?.dailyScores || {}
  const [selectedItems, setSelectedItems] = useState<{ id: string; type: 'habit' | 'task' | 'event' }[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [activeBubble, setActiveBubble] = useState<{
    id: string;
    position: { x: number; y: number };
    options: any[];
    onSelect: (status: any) => void;
  } | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update logic for real-time visual alerts and day transition
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Auto-refresh today when it's midnight
      if (isToday(selectedDate) && now.getDate() !== selectedDate.getDate()) {
        setSelectedDate(now);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  // Dispara tutorial apenas na primeira vez
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('focusos_onboarding_completed')
    if (!hasSeenTutorial) {
      setIsTutorialOpen(true)
    }
  }, [])

  const handleCloseTutorial = () => {
    localStorage.setItem('focusos_onboarding_completed', 'true')
    setIsTutorialOpen(false)
  }

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

  const toggleSelection = (id: string, type: 'habit' | 'task' | 'event') => {
    setSelectedItems(prev => {
      const isSelected = prev.some(item => item.id === id)
      const next = isSelected 
        ? prev.filter(item => item.id !== id) 
        : [...prev, { id, type }]
      
      if (next.length === 0) setIsSelectionMode(false)
      return next
    })
  }

  const handleSelectGroup = (type: 'all' | 'positive' | 'negative' | 'events' | 'tasks') => {
    let items: { id: string; type: 'habit' | 'task' | 'event' }[] = []
    if (type === 'all') {
      items = [
        ...(habits.map(h => ({ id: h.id, type: 'habit' as const }))),
        ...(tasks.map(t => ({ id: t.id, type: 'task' as const }))),
        ...(todayEvents.map(e => ({ id: e.id, type: 'event' as const })))
      ]
    } else if (type === 'positive') {
      items = habits.filter(h => h.type === 'positive').map(h => ({ id: h.id, type: 'habit' as const }))
    } else if (type === 'negative') {
      items = habits.filter(h => h.type === 'negative').map(h => ({ id: h.id, type: 'habit' as const }))
    } else if (type === 'events') {
      items = todayEvents.map(e => ({ id: e.id, type: 'event' as const }))
    } else if (type === 'tasks') {
      items = tasks.map(t => ({ id: t.id, type: 'task' as const }))
    }
    setSelectedItems(items)
    if (items.length > 0) setIsSelectionMode(true)
  }

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  const confirmBulkDelete = async () => {
    setIsBulkDeleteModalOpen(false)
    setLoading(true)
    try {
      const promises = selectedItems.map(item => {
        if (item.type === 'task') return deleteTask(item.id)
        if (item.type === 'habit') return deleteHabit(item.id)
        if (item.type === 'event') return deleteEvent(item.id)
        return Promise.resolve()
      })
      
      await Promise.all(promises)
      
      setSelectedItems([])
      setIsSelectionMode(false)
      setToast('Itens excluídos com sucesso!')
    } catch (err) {
      console.error('Bulk delete error:', err)
      setToast('Erro ao excluir itens.')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedItems.length > 0) {
      setIsBulkDeleteModalOpen(true)
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
  const todayEvents = useMemo(() => eventsToday || [], [eventsToday])
  
  const { data: allGoals, isLoading: loadingGoals } = useGoals()
  const goals = useMemo(() => allGoals || [], [allGoals])

  // Gera strip de 7 dias com base no offset
  const weekStart = useMemo(() => {
    const baseDate = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), weekOffset * 7)
    return baseDate
  }, [weekOffset])
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const score = useMemo(() => calcScore(habits, tasks, todayEvents), [habits, tasks, todayEvents])

  // Toast com auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  function setEventStatus(id: string, status: any, date?: string) {
    logEvent({ eventId: id, status, logDate: date || todayStr })
    
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
    const habit = habits.find(h => h.id === id)
    logHabit({ 
      habitId: id, 
      status: nextStatus,
      logDate: todayStr,
      linkedGoalId: habit?.linked_goal_id,
      goalImpact: habit?.goal_impact
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
    <div className="min-h-screen bg-[var(--bg-workspace)] text-[var(--text-primary)] pb-24 font-sans transition-colors duration-300">

      {/* ─── Top Bar ─── */}
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-6 pt-4 md:px-10 md:pt-6 lg:px-14 max-w-[1600px] mx-auto w-full"
      >
        <div className="flex items-center gap-6">
           <div>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-1">FocusOS Dashboard</p>
              <h1 className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">Olá, {auth.currentUser?.displayName?.split(' ')[0] || 'Usuário'}</h1>
           </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
          <PerformanceHeader />
          <RealTimeClock />
          <div className="flex items-center gap-2.5">
            <button className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--bg-overlay)]/80 transition-all group relative">
              <Bell size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
              <div className="absolute top-3 right-3 w-2 h-2 bg-red-600 rounded-full border-2 border-[var(--bg-primary)]" />
            </button>
          </div>
        </div>
      </motion.div>

      <main className="px-6 md:px-10 lg:px-14 space-y-6 pt-0 pb-12 max-w-[1600px] mx-auto">



        {/* ─── Week Strip ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50" suppressHydrationWarning>
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
                    ${isActive 
                      ? 'bg-[var(--text-primary)] border-transparent shadow-lg scale-105' 
                      : 'bg-[var(--bg-overlay)] border-[var(--border-subtle)]'
                    }
                    ${d < new Date() && !isTodayActual 
                      ? (dailyScores[format(d, 'yyyy-MM-dd')] >= 80 
                          ? 'border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                          : 'border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]')
                      : ''}
                  `}
                >
                  <span className={`text-[12px] font-semibold uppercase tracking-wide ${isActive ? 'text-[var(--bg-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {format(d, 'EEE', { locale: ptBR }).slice(0, 3)}
                  </span>
                  <span className={`text-base font-bold ${isActive ? 'text-[var(--bg-primary)]' : 'text-[var(--text-secondary)]'}`}>
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
        <ScoreWidget score={score} selectedDate={selectedDate} />

          <div className="space-y-10 max-w-[1600px] mx-auto w-full">
            {/* ─── Today's Agenda ─── */}
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                 <div className="flex items-center justify-between mb-3" suppressHydrationWarning>
                    <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50">{getSectionLabel('Compromissos', selectedDate)}</p>
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
                        onStatusChange={status => setEventStatus(event.id, status, event.date)}
                        onReschedule={() => {
                          setEventToReschedule(event)
                          setIsRescheduleOpen(true)
                        }}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedItems.some(item => item.id === event.id)}
                        onSelect={() => toggleSelection(event.id, 'event')}
                        onEdit={() => window.location.href = `/dashboard/agenda?edit=${event.id}`}
                        onContextMenu={() => {
                          setIsSelectionMode(true)
                          toggleSelection(event.id, 'event')
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
                        currentTime={currentTime}
                      />
                    ))}
                     {todayEvents.length === 0 && (
                       <p className="text-sm text-white/30 italic px-4 py-2">Nenhum compromisso para {getDateLabel(selectedDate).toLowerCase()}.</p>
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
                      isSelected={selectedItems.some(item => item.id === h.id)}
                      onSelect={() => toggleSelection(h.id, 'habit')}
                      onEdit={() => window.location.href = `/dashboard/habits?edit=${h.id}`}
                      onContextMenu={() => {
                        setIsSelectionMode(true)
                        toggleSelection(h.id, 'habit')
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
                    isSelected={selectedItems.some(item => item.id === h.id)}
                    onSelect={() => toggleSelection(h.id, 'habit')}
                    onEdit={() => window.location.href = `/dashboard/habits?edit=${h.id}`}
                    onContextMenu={() => {
                      setIsSelectionMode(true)
                      toggleSelection(h.id, 'habit')
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
              <div className="flex items-center justify-between mb-3" suppressHydrationWarning>
                <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-white/50">{getSectionLabel('Rascunho', selectedDate)}</p>
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
                      if (status === 'done') toggleTask(t.id, false)
                      else if (status === 'todo') toggleTask(t.id, true)
                      else updateTaskStatus(t.id, status)
                    }}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedItems.some(item => item.id === t.id)}
                    onSelect={() => toggleSelection(t.id, 'task')}
                    onContextMenu={() => {
                      setIsSelectionMode(true)
                      toggleSelection(t.id, 'task')
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
          </div>

        {/* ─── AI Insight ─── */}

        <SeedData />

        <AIInsightBanner 
          habits={habits} 
          tasks={tasks} 
          events={todayEvents} 
          goals={goals} 
          score={score} 
        />
      </main>

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[95%] md:w-auto max-w-4xl bg-[var(--bg-primary)]/90 backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[32px] md:rounded-[40px] px-4 md:px-10 py-4 md:py-5 flex items-center justify-between md:justify-start gap-4 md:gap-10 shadow-2xl ring-1 ring-white/5"
          >
            <div className="flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px]">
              <span className="text-2xl md:text-3xl font-black text-white leading-none">{selectedItems.length}</span>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Itens</span>
            </div>

            <div className="h-10 md:h-12 w-px bg-white/10" />

            <div className="flex items-center gap-3 md:gap-6">
              {[
                { label: 'Tudo', icon: Zap, onClick: () => handleSelectGroup('all') },
                { label: 'Compromissos', icon: Calendar, onClick: () => handleSelectGroup('events') },
                { label: 'Hábitos', icon: TrendingUp, onClick: () => handleSelectGroup('positive') },
                { label: 'A Evitar', icon: Target, onClick: () => handleSelectGroup('negative') },
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={btn.onClick}
                  className="relative flex flex-col items-center group/sel pt-1"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/sel:bg-white group-hover/sel:text-black transition-all duration-300">
                    <btn.icon size={18} />
                  </div>
                  <span className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-white/40 opacity-0 group-hover/sel:opacity-100 transition-all pointer-events-none whitespace-nowrap hidden md:block">
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-10 md:h-12 w-px bg-white/10" />

            <div className="flex items-center gap-3 md:gap-6">
              <button 
                onClick={handleBulkDelete}
                disabled={selectedItems.length === 0 || loading}
                className="relative flex flex-col items-center group/del disabled:opacity-20"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/del:bg-red-500 group-hover/del:text-white transition-all duration-300 text-red-500">
                  {loading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 size={18} />}
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedItems([])
                }}
                className="h-10 md:h-12 px-5 md:px-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-xl md:rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] md:text-[11px] transition-all duration-300 whitespace-nowrap"
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
      <AnimatePresence>
        {isBulkDeleteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1002] w-full max-w-sm bg-[#111] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 mx-auto text-red-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black text-white text-center mb-2 tracking-tight">Excluir {selectedItems.length} itens?</h3>
              <p className="text-sm font-medium text-white/40 text-center mb-8">Essa ação não pode ser desfeita. Todos os dados associados a essas tarefas ou hábitos serão apagados permanentemente.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-white/70 hover:bg-white/10 hover:text-white text-sm font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBulkDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-2xl bg-red-600 border border-red-500 text-white hover:bg-red-500 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={handleCloseTutorial} 
      />
    </div>
  )
}
