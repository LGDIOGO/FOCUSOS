'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalendarIcon, Plus, Trash2, Zap, Clock, ChevronRight, Users, Cake, Star, Bell, RefreshCcw, TrendingUp, AlertCircle, History
} from 'lucide-react'
import { AgendaModal } from '@/components/dashboard/AgendaModal'
import { StatusChoiceBubble } from '@/components/dashboard/StatusChoiceBubble'
import { useEvents, useDeleteEvent, useUpdateEvent } from '@/lib/hooks/useEvents'
import { Check, Minus, X, Circle } from 'lucide-react'
import { db, auth } from '@/lib/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { CalendarEvent, EventType } from '@/types'
import { cn } from '@/lib/utils/cn'
import { 
  format, isToday, isTomorrow, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, getDay, differenceInWeeks, differenceInDays, parse, startOfYear, endOfYear 
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { isAfter, subMinutes } from 'date-fns'

const EVENT_TYPES: { type: EventType; label: string; icon: any; color: string }[] = [
  { type: 'meeting', label: 'Reunião', icon: Users, color: 'text-red-400 bg-red-400/10' },
  { type: 'birthday', label: 'Aniversário', icon: Cake, color: 'text-pink-400 bg-pink-400/10' },
  { type: 'event', label: 'Evento', icon: Star, color: 'text-amber-400 bg-amber-400/10' },
  { type: 'priority' as any, label: 'Tarefa Crítica', icon: Bell, color: 'text-orange-400 bg-orange-400/10' },
  { type: 'other', label: 'Outros', icon: CalendarIcon, color: 'text-white/60 bg-white/5' },
]

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const STATUS_CONFIG_AGENDA: Record<string, { icon: string; border: string }> = {
  todo:    { icon: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]', border: 'border-[var(--border-subtle)]' },
  done:    { icon: 'bg-green-500 text-white',                          border: 'border-green-500/30' },
  partial: { icon: 'bg-amber-400 text-black',                          border: 'border-amber-400/30' },
  failed:  { icon: 'bg-red-500 text-white',                            border: 'border-red-500/30' },
  none:    { icon: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]', border: 'border-[var(--border-subtle)]' },
}

const AGENDA_STATUS_OPTIONS = [
  { id: 'done',    label: 'Concluído', icon: Check,  color: 'text-green-400', bg: 'hover:bg-green-500/10' },
  { id: 'partial', label: 'Parcial',   icon: Minus,  color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
  { id: 'failed',  label: 'Falhou',    icon: X,      color: 'text-red-500',   bg: 'hover:bg-red-500/10' },
  { id: 'todo',    label: 'Limpar',    icon: Circle, color: 'text-white/20',  bg: 'hover:bg-white/5' },
]

function EventItem({
  event,
  isSelectionMode,
  isSelected,
  toggleSelection,
  openEditModal,
  setIsSelectionMode,
  onDelete,
  onOpenBubble,
  currentTime = new Date()
}: {
  event: CalendarEvent
  isSelectionMode: boolean
  isSelected: boolean
  toggleSelection: (id: string) => void
  openEditModal: (event: CalendarEvent) => void
  setIsSelectionMode: (val: boolean) => void
  onDelete: (id: string) => void
  onOpenBubble?: (pos: { x: number; y: number }) => void
  currentTime?: Date
}) {
  const localLongPress = useLongPress(
    () => {
      setIsSelectionMode(true)
      toggleSelection(event.id)
    },
    () => {},
    { delay: 500 }
  )

  const timeStatus = useMemo(() => {
    if (!event.time || event.isOverdue || event.status === 'done') return { approaching: false, passed: !!event.isOverdue }
    
    // Check if event is for today
    const eventDate = parseISO(event.date)
    if (!isToday(eventDate)) return { approaching: false, passed: false }

    const now = currentTime || new Date()
    try {
      const eventTime = parse(event.time, 'HH:mm', now)
      const isPassed = isAfter(now, eventTime)
      const isApproaching = !isPassed && isAfter(now, subMinutes(eventTime, 15))
      return { approaching: isApproaching, passed: isPassed }
    } catch (e) {
      return { approaching: false, passed: false }
    }
  }, [event.time, event.isOverdue, event.status, event.date, currentTime])

  const currentStatus = event.status || 'none'
  const cfg = STATUS_CONFIG_AGENDA[currentStatus] || STATUS_CONFIG_AGENDA.none

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) return
    onOpenBubble?.({ x: e.clientX, y: e.clientY })
  }

  return (
    <motion.div
      layoutId={event.id}
      {...localLongPress}
      onClick={(e) => {
        if (isSelectionMode) {
          toggleSelection(event.id)
        } else {
          handleStatusClick(e)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsSelectionMode(true)
        toggleSelection(event.id)
      }}
      className={cn(
        "group flex items-center gap-6 p-6 bg-[var(--bg-overlay)] border rounded-[32px] hover:bg-[var(--bg-overlay)]/80 transition-all cursor-pointer relative transition-colors duration-300",
        isSelected ? "border-red-500 bg-red-500/5" : cfg.border
      )}
    >
      {/* Status Circle */}
      {!isSelectionMode && (
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleStatusClick}
          className={cn(
            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 z-20",
            currentStatus === 'none' || currentStatus === 'todo'
              ? 'border-[var(--border-subtle)] bg-[var(--bg-overlay)]'
              : cfg.icon
          )}
        >
          {currentStatus === 'done'    && <Check size={18} strokeWidth={3} className="text-white" />}
          {currentStatus === 'partial' && <Minus size={18} strokeWidth={3} className="text-white" />}
          {currentStatus === 'failed'  && <X     size={18} strokeWidth={3} className="text-white" />}
        </motion.div>
      )}
      {isSelectionMode && (
        <div className={cn(
          "w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-20",
          isSelected ? "border-red-500 bg-red-500" : "border-white/10 bg-white/5"
        )}>
          {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
        </div>
      )}

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: event.color ? `${event.color}20` : 'rgba(255,255,255,0.05)', color: event.color || '#FFFFFF' }}
      >
        {event.emoji || (
          event.type === 'meeting' ? <Users size={18} /> :
          event.type === 'birthday' ? <Cake size={18} /> :
          event.type === 'event' ? <Star size={18} /> : <CalendarIcon size={18} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)] truncate transition-colors">{event.title}</h3>
          {event.recurrence && (
             <div className="flex items-center gap-1 text-[9px] font-black text-white/20 uppercase tracking-widest">
               <RefreshCcw size={10} />
               {
                 event.recurrence.frequency === 'daily' ? 'Diário' :
                 event.recurrence.frequency === 'weekly' ? (event.recurrence.interval === 2 ? 'Quinzenal' : 'Semanal') :
                 event.recurrence.frequency === 'monthly' ? 'Mensal' :
                 event.recurrence.frequency === 'yearly' ? 'Anual' :
                 'Personalizado'
               }
             </div>
          )}
        </div>
          <div className={cn(
            "flex items-center gap-4 text-base font-medium transition-all duration-700",
            timeStatus.passed ? "text-[#FF453A]" : 
            timeStatus.approaching ? "text-[#FF453A] animate-pulse" : "text-[var(--text-muted)]"
          )}>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className={cn(timeStatus.passed || timeStatus.approaching ? "text-[#FF453A]" : "")} />
              {event.time}
            </div>
            {event.isOverdue && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-lg text-[#FF453A] text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-500">
                <AlertCircle size={10} /> ATRASADO
              </span>
            )}
            {event.description && (
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-1 h-1 rounded-full bg-white/10" />
                {event.description}
              </div>
            )}
          </div>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation()
          if (isSelectionMode) return
          onDelete(event.id)
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={cn(
          "p-3 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100",
          isSelectionMode ? "hidden" : "text-white/5"
        )}
      >
        <Trash2 size={20} />
      </button>
    </motion.div>
  )
}

export default function AgendaPage() {
  const { data: events, isLoading } = useEvents()
  const deleteEvent = useDeleteEvent()
  const updateEvent = useUpdateEvent()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<Map<string, string>>(new Map())
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState<string>('')
  const [historyEndDate, setHistoryEndDate] = useState<string>('')
  const [historyPeriod, setHistoryPeriod] = useState<'all' | 'custom'>('all')
  const [activeBubble, setActiveBubble] = useState<{
    id: string
    position: { x: number; y: number }
    options: any[]
    onSelect: (status: string) => void
  } | null>(null)

  // Update logic for real-time visual alerts
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch logs for the current month view
  useEffect(() => {
    const fetchLogs = async () => {
      const user = auth.currentUser
      if (!user || !events) return
      
      setLoadingLogs(true)
      try {
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
        
        const q = query(
          collection(db, 'event_logs'),
          where('user_id', '==', user.uid),
          where('log_date', '>=', start),
          where('log_date', '<=', end)
        )
        const snap = await getDocs(q)
        const newLogs = new Map()
        snap.docs.forEach(d => {
          const data = d.data()
          newLogs.set(`${data.event_id}_${data.log_date}`, data.status)
        })
        setLogs(newLogs)
      } catch (e) {
        console.error('Error fetching logs:', e)
      } finally {
        setLoadingLogs(false)
      }
    }
    fetchLogs()
  }, [events, currentMonth])

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true)
    }
  }, [searchParams])

  const openEditModal = (event: CalendarEvent) => {
    setEventToEdit(event)
    setShowAddModal(true)
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectGroup = (type: 'all' | 'today' | 'tomorrow' | 'current_year' | 'next_year') => {
    if (!events) return
    let ids: string[] = []
    const today = format(new Date(), 'yyyy-MM-dd')
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd')
    const currentYear = new Date().getFullYear().toString()
    const nextYear = (new Date().getFullYear() + 1).toString()

    if (type === 'all') {
      ids = events.map(e => e.id)
    } else if (type === 'today') {
      ids = events.filter(e => e.date === today).map(e => e.id)
    } else if (type === 'tomorrow') {
      ids = events.filter(e => e.date === tomorrowStr).map(e => e.id)
    } else if (type === 'current_year') {
      ids = events.filter(e => e.date.startsWith(currentYear)).map(e => e.id)
    } else if (type === 'next_year') {
      ids = events.filter(e => e.date.startsWith(nextYear)).map(e => e.id)
    }
    
    setSelectedIds(ids)
    if (ids.length > 0) setIsSelectionMode(true)
  }

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedIds.length} compromissos?`)) {
      selectedIds.forEach(id => deleteEvent.mutate(id))
      setSelectedIds([])
      setIsSelectionMode(false)
    }
  }

  const groupedEvents = useMemo(() => {
    if (!events) return {}

    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    
    const grouped: Record<string, CalendarEvent[]> = {}
    
    days.forEach((day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayOfWeek = getDay(day)
      const isPastDay = isAfter(new Date(), day) && !isToday(day)
      
      const dayEvents = events.filter(e => {
        if (e.date === dateStr) return true
        if (e.recurrence) {
          const evDate = parseISO(e.date)
          if (dateStr < e.date) return false
          
          const interval = e.recurrence.interval || 1
          const freq = e.recurrence.frequency

          if (freq === 'daily') {
             const diff = Math.abs(differenceInDays(day, evDate))
             return diff % interval === 0
          }
          if (freq === 'weekly') {
             const diff = Math.abs(differenceInWeeks(day, evDate))
             return diff % interval === 0 && dayOfWeek === getDay(evDate)
          }
          if (freq === 'specific_days') {
             const diff = Math.abs(differenceInWeeks(day, evDate))
             return diff % interval === 0 && e.recurrence.days_of_week?.includes(dayOfWeek)
          }
          if (freq === 'monthly') return format(day, 'dd') === format(evDate, 'dd')
          if (freq === 'yearly') return format(day, 'MM-dd') === format(evDate, 'MM-dd')
        }
        return false
      }).map(e => {
        const status = logs.get(`${e.id}_${dateStr}`) || 'none'
        return {
          ...e,
          status,
          isOverdue: isPastDay && status !== 'done'
        }
      })

      if (dayEvents.length > 0) {
        // Sort items: done/past at bottom
        const sortedDayEvents = (dayEvents as CalendarEvent[]).sort((a, b) => {
          const isDoneA = a.status === 'done'
          const isDoneB = b.status === 'done'
          if (isDoneA && !isDoneB) return 1
          if (!isDoneA && isDoneB) return -1

          if (isToday(day)) {
            const timeA = a.time ? parse(a.time, 'HH:mm', currentTime) : null
            const timeB = b.time ? parse(b.time, 'HH:mm', currentTime) : null
            if (timeA && timeB) {
              const passedA = isAfter(currentTime, timeA)
              const passedB = isAfter(currentTime, timeB)
              if (passedA && !passedB) return 1
              if (!passedA && passedB) return -1
              return timeA.getTime() - timeB.getTime()
            }
          }
          return (a.time || '00:00').localeCompare(b.time || '00:00')
        })
        grouped[dateStr] = sortedDayEvents
      }
    })
    
    return grouped
  }, [events, currentMonth, logs, currentTime])

  const pastEventsGrouped = useMemo(() => {
    if (!events) return {}
    const todayStr = format(currentTime, 'yyyy-MM-dd')
    const past = events.filter(e => {
      if (e.date >= todayStr) return false
      
      if (historyPeriod === 'custom') {
        if (historyStartDate && e.date < historyStartDate) return false
        if (historyEndDate && e.date > historyEndDate) return false
      }
      return true
    })
    
    const grouped: Record<string, CalendarEvent[]> = {}
    past.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = []
      grouped[e.date].push({
        ...e,
        status: (logs.get(`${e.id}_${e.date}`) || 'none') as CalendarEvent['status']
      })
    })

    // Sort dates in descending order (most recent first)
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
    )
  }, [events, logs, currentTime, historyStartDate, historyEndDate, historyPeriod])

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-10 lg:space-y-14 pb-24 md:pb-10">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[var(--bg-overlay)] rounded-[24px] flex items-center justify-center border border-[var(--border-subtle)] shadow-2xl">
            <CalendarIcon className="text-[var(--text-primary)] w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-5xl font-black tracking-tightest text-[var(--text-primary)]">Minha Agenda</h1>
               <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-full px-3 py-1 border border-[var(--border-subtle)]">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:text-[var(--text-primary)] transition-colors text-[var(--text-muted)]">
                    <ChevronRight className="rotate-180" size={14} />
                  </button>
                  <span className="text-[12px] font-black uppercase tracking-widest min-w-[100px] text-center text-[var(--text-primary)]">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:text-[var(--text-primary)] transition-colors text-[var(--text-muted)]">
                    <ChevronRight size={14} />
                  </button>
               </div>
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-lg italic flex items-center gap-2">
              Gerencie compromissos para qualquer data futura.
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)]/20 mx-1" />
              <span className="text-[var(--text-muted)] text-xs font-black uppercase tracking-tighter hidden md:inline-block border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">Botão direito para selecionar</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl shrink-0"
        >
          <Plus size={20} />
          Novo Compromisso
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-2 space-y-10 md:space-y-14">
          {/* Aba de Compromissos Passados (Histórico) */}
          {!isLoading && Object.keys(pastEventsGrouped).length > 0 && (
            <div className="space-y-4">
              <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="flex items-center gap-4 px-2 w-full group"
              >
                <div className="flex items-center gap-2 text-base font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">
                  <History size={16} />
                  Compromissos Passados
                  <span className="ml-2 px-2 py-0.5 bg-white/5 rounded-md text-[10px]">{Object.values(pastEventsGrouped).flat().length}</span>
                </div>
                <div className="flex-1 border-t border-white/[0.03]" />
                <ChevronRight 
                  size={16} 
                  className={cn(
                    "text-white/20 transition-transform duration-300",
                    isHistoryOpen ? "rotate-90" : ""
                  )} 
                />
              </button>

              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-8"
                  >
                    {/* Filter Bar */}
                    <div className="flex flex-col gap-4 p-6 bg-[var(--bg-overlay)] rounded-3xl border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 [scrollbar-width:none]">
                          {[
                            { id: 'all', label: 'Todo o Período' },
                            { id: 'month', label: 'Este Mês' },
                            { id: 'last_month', label: 'Mês Passado' },
                            { id: 'year', label: 'Este Ano' },
                            { id: 'custom', label: 'Personalizado' }
                          ].map(btn => (
                            <button 
                              key={btn.id}
                              onClick={() => {
                                if (btn.id === 'all') {
                                  setHistoryPeriod('all')
                                  setHistoryStartDate('')
                                  setHistoryEndDate('')
                                } else if (btn.id === 'last_month') {
                                  const last = subMonths(new Date(), 1)
                                  setHistoryStartDate(format(startOfMonth(last), 'yyyy-MM-dd'))
                                  setHistoryEndDate(format(endOfMonth(last), 'yyyy-MM-dd'))
                                  setHistoryPeriod('custom')
                                } else if (btn.id === 'month') {
                                  setHistoryStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
                                  setHistoryEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
                                  setHistoryPeriod('custom')
                                } else if (btn.id === 'year') {
                                   setHistoryStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'))
                                   setHistoryEndDate(format(endOfYear(new Date()), 'yyyy-MM-dd'))
                                   setHistoryPeriod('custom')
                                } else {
                                  setHistoryPeriod('custom')
                                }
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                (historyPeriod === btn.id || (btn.id === 'custom' && historyPeriod === 'custom')) ? "bg-white text-black" : "bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                              )}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        {historyPeriod === 'custom' && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10"
                          >
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Início</label>
                              <input 
                                type="date" 
                                value={historyStartDate}
                                onChange={(e) => setHistoryStartDate(e.target.value)}
                                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Fim</label>
                              <input 
                                type="date" 
                                value={historyEndDate}
                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-red-500 transition-colors"
                              />
                            </div>
                            <button 
                              onClick={() => {
                                setHistoryStartDate('')
                                setHistoryEndDate('')
                                setHistoryPeriod('all')
                              }}
                              className="mt-4 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              Limpar
                            </button>
                          </motion.div>
                        )}
                    </div>
                    {Object.entries(pastEventsGrouped).map(([date, eventList]: [string, CalendarEvent[]]) => (
                      <div key={date} className="space-y-4 opacity-50 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4 px-2">
                           <h2 className="text-[12px] font-black uppercase tracking-widest text-white/20">
                             {format(parseISO(date), "dd/MM/yyyy • EEEE", { locale: ptBR })}
                           </h2>
                           <div className="flex-1 border-t border-white/[0.01]" />
                        </div>
                        <div className="space-y-3">
                          {eventList.map(event => (
                            <EventItem
                              key={event.id}
                              event={event}
                              isSelectionMode={isSelectionMode}
                              isSelected={selectedIds.includes(event.id)}
                              toggleSelection={toggleSelection}
                              openEditModal={openEditModal}
                              setIsSelectionMode={setIsSelectionMode}
                              onDelete={(id) => deleteEvent.mutate(id)}
                              currentTime={currentTime}
                              onOpenBubble={(position) => setActiveBubble({
                                id: event.id,
                                position,
                                options: AGENDA_STATUS_OPTIONS,
                                onSelect: (status) => {
                                  updateEvent.mutate({ id: event.id, status: status as any })
                                  setActiveBubble(null)
                                }
                              })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-b border-white/[0.03]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2].map(i => (
                <div key={i} className="space-y-4">
                  <div className="h-6 w-32 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-24 bg-white/2 rounded-[32px] animate-pulse" />
                </div>
              ))
            ) : Object.entries(groupedEvents || {}).sort().map(([date, eventList]: [string, CalendarEvent[]]) => (
              <motion.div 
                key={date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-4 px-2">
                   <h2 className={cn(
                     "text-sm font-black uppercase tracking-widest",
                     isToday(parseISO(date)) ? "text-white" : "text-white/30"
                   )}>
                     {isToday(parseISO(date)) ? `Hoje • ${format(parseISO(date), 'dd/MM/yyyy')}` : 
                      isTomorrow(parseISO(date)) ? `Amanhã • ${format(parseISO(date), 'dd/MM/yyyy')}` : 
                      format(parseISO(date), "dd/MM/yyyy • EEEE", { locale: ptBR })}
                   </h2>
                   <div className="flex-1 border-t border-white/[0.03]" />
                </div>

                <div className="space-y-3">
                  {eventList.map((event: CalendarEvent) => (
                    <EventItem 
                      key={event.id}
                      event={event}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.includes(event.id)}
                      toggleSelection={toggleSelection}
                      openEditModal={openEditModal}
                      setIsSelectionMode={setIsSelectionMode}
                      onDelete={(id) => deleteEvent.mutate(id)}
                      currentTime={currentTime}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-8 lg:sticky lg:top-14 h-fit">
           <div className="p-6 md:p-8 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-[32px] space-y-6">
              <h3 className="font-black text-base uppercase tracking-widest text-white/60">Próximos Dias</h3>
              <div className="space-y-4">
                 {[0, 1, 2, 3].map(i => {
                   const d = new Date()
                   d.setDate(d.getDate() + i)
                   const dateKey = format(d, 'yyyy-MM-dd')
                   const count = groupedEvents?.[dateKey]?.length || 0
                   return (
                     <div key={i} className="flex justify-between items-center">
                        <span className="text-base font-bold text-white/60">{format(d, 'EEE, d', { locale: ptBR })}</span>
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-black",
                          count > 0 ? "bg-white text-black" : "bg-white/5 text-white/20"
                        )}>
                          {count}
                        </div>
                     </div>
                   )
                 })}
              </div>
           </div>
        </div>
      </div>



      <AgendaModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEventToEdit(null)
        }}
        eventToEdit={eventToEdit}
      />

      {activeBubble && (
        <StatusChoiceBubble
          isOpen={true}
          onClose={() => setActiveBubble(null)}
          onSelect={activeBubble.onSelect}
          options={activeBubble.options}
          position={activeBubble.position}
        />
      )}



      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[95%] md:w-auto max-w-5xl bg-[var(--bg-primary)]/90 backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[32px] md:rounded-[40px] px-4 md:px-10 py-4 md:py-5 flex items-center justify-between md:justify-start gap-3 md:gap-10 shadow-2xl ring-1 ring-[var(--text-primary)]/5"
          >
            <div className="flex flex-col items-center justify-center min-w-[60px] md:min-w-[80px]">
              <span className="text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-none">{selectedIds.length}</span>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">Itens</span>
            </div>

            <div className="h-10 md:h-12 w-px bg-[var(--border-subtle)]" />

            <div className="flex items-center gap-2 md:gap-6">
              {[
                { label: 'Tudo', icon: Zap, onClick: () => handleSelectGroup('all') },
                { label: 'Hoje', icon: Clock, onClick: () => handleSelectGroup('today') },
                { label: 'Amanhã', icon: CalendarIcon, onClick: () => handleSelectGroup('tomorrow') },
                { label: 'Ano Atual', icon: Star, onClick: () => handleSelectGroup('current_year') },
                { label: 'Próximo', icon: TrendingUp, onClick: () => handleSelectGroup('next_year') },
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={btn.onClick}
                  className="relative flex flex-col items-center group/sel pt-1"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center border border-[var(--border-subtle)] group-hover/sel:bg-[var(--text-primary)] group-hover/sel:text-[var(--bg-primary)] transition-all duration-300">
                    <btn.icon size={18} />
                  </div>
                  <span className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-0 group-hover/sel:opacity-100 transition-all pointer-events-none whitespace-nowrap hidden md:block">
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-10 md:h-12 w-px bg-white/10" />

            <div className="flex items-center gap-3 md:gap-6">
              <button 
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="relative flex flex-col items-center group/del disabled:opacity-20"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/del:bg-red-500 group-hover/del:text-white transition-all duration-300 text-red-500">
                  <Trash2 size={18} />
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds([])
                }}
                className="h-10 md:h-12 px-5 md:px-10 bg-[var(--bg-overlay)] hover:bg-[var(--text-primary)] text-[var(--text-primary)] hover:text-[var(--bg-primary)] rounded-xl md:rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] md:text-[11px] transition-all duration-300 whitespace-nowrap border border-[var(--border-subtle)]"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
