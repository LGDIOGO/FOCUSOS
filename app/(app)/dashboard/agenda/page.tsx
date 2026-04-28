'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon, Plus, Trash2, Zap, Clock, ChevronRight, Users, Cake, Star, Bell, RefreshCcw, TrendingUp, AlertCircle, History
} from 'lucide-react'
import { AgendaModal } from '@/components/dashboard/AgendaModal'
import { useEvents, useDeleteEvent } from '@/lib/hooks/useEvents'
import { db, auth } from '@/lib/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { CalendarEvent, EventType } from '@/types'
import { cn } from '@/lib/utils/cn'
import {
  format, isToday, isTomorrow, parseISO, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, differenceInWeeks, differenceInDays, parse, startOfYear, endOfYear,
  subDays
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

// Pure helper — shared by groupedEvents and overdue injection
function occursOnDate(e: CalendarEvent, targetStr: string, targetDate: Date): boolean {
  if (!e.date || typeof e.date !== 'string') return false
  if (e.date === targetStr) return true
  if (!e.recurrence) return false
  if (targetStr < e.date) return false
  try {
    const evDate = parseISO(e.date)
    const targetDay = getDay(targetDate)
    const interval = e.recurrence.interval || 1
    const freq = e.recurrence.frequency
    if (freq === 'daily') return Math.abs(differenceInDays(targetDate, evDate)) % interval === 0
    if (freq === 'weekly') return getDay(evDate) === targetDay && Math.abs(differenceInDays(targetDate, evDate)) % (7 * interval) === 0
    if (freq === 'specific_days') return Math.abs(differenceInWeeks(targetDate, evDate)) % interval === 0 && !!e.recurrence.days_of_week?.includes(targetDay)
    if (freq === 'monthly') return format(targetDate, 'dd') === format(evDate, 'dd')
    if (freq === 'yearly') return format(targetDate, 'MM-dd') === format(evDate, 'MM-dd')
  } catch { /* invalid date */ }
  return false
}

function EventItem({ 
  event, 
  isSelectionMode, 
  isSelected, 
  toggleSelection, 
  openEditModal, 
  setIsSelectionMode,
  onDelete,
  currentTime = new Date()
}: { 
  event: CalendarEvent
  isSelectionMode: boolean
  isSelected: boolean
  toggleSelection: (id: string) => void
  openEditModal: (event: CalendarEvent) => void
  setIsSelectionMode: (val: boolean) => void
  onDelete: (id: string) => void
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
    if (!event.date || typeof event.date !== 'string') return { approaching: false, passed: false }

    // Check if event is for today
    let eventDate: Date
    try { eventDate = parseISO(event.date) } catch { return { approaching: false, passed: false } }
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

  return (
    <motion.div
      layout="position"
      {...localLongPress}
      onClick={() => {
        if (isSelectionMode) {
          toggleSelection(event.id)
        } else {
          openEditModal(event)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsSelectionMode(true)
        toggleSelection(event.id)
      }}
      className={cn(
        "group flex items-center gap-3 md:gap-6 p-4 md:p-6 bg-[var(--bg-overlay)] border rounded-[24px] md:rounded-[32px] hover:bg-[var(--bg-overlay)]/80 transition-all cursor-pointer relative transition-colors duration-300",
        isSelected ? "border-red-500 bg-red-500/5" : "border-[var(--border-subtle)]"
      )}
    >
      <div
        className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-inner transition-transform group-hover:scale-105 shrink-0"
        style={{ backgroundColor: event.color ? `${event.color}20` : 'rgba(255,255,255,0.05)', color: event.color || '#FFFFFF' }}
      >
        {event.emoji || (
          event.type === 'meeting' ? <Users size={20} /> :
          event.type === 'birthday' ? <Cake size={20} /> :
          event.type === 'event' ? <Star size={20} /> : <CalendarIcon size={20} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 md:mb-1">
          <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)] truncate transition-colors">{event.title}</h3>
          {event.recurrence && (
            <div className="flex items-center gap-1 text-[9px] font-black text-white/20 uppercase tracking-widest shrink-0">
              <RefreshCcw size={9} />
              <span className="hidden sm:inline">
                {event.recurrence.frequency === 'daily' ? 'Diário' :
                 event.recurrence.frequency === 'weekly' ? (event.recurrence.interval === 2 ? 'Quinzenal' : 'Semanal') :
                 event.recurrence.frequency === 'monthly' ? 'Mensal' :
                 event.recurrence.frequency === 'yearly' ? 'Anual' : 'Recorrente'}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-2 md:gap-4 text-sm md:text-base font-medium transition-all duration-700 flex-wrap",
          timeStatus.passed ? "text-[#FF453A]" :
          timeStatus.approaching ? "text-[#FF453A] animate-pulse" : "text-[var(--text-muted)]"
        )}>
          {event.time && (
            <div className="flex items-center gap-1">
              <Clock size={12} className={cn(timeStatus.passed || timeStatus.approaching ? "text-[#FF453A]" : "")} />
              <span className="text-[12px] font-semibold">{event.time}</span>
            </div>
          )}
          {event.isOverdue && (() => {
            const daysLate = event.date ? differenceInDays(new Date(), parseISO(event.date)) : 0
            return (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-md text-[#FF453A] text-[9px] font-black uppercase tracking-widest">
                <AlertCircle size={9} />
                {daysLate > 0 ? `${daysLate}d` : 'ATRASADO'}
              </span>
            )
          })()}
          {event.description && (
            <span className="text-[11px] md:text-sm text-[var(--text-muted)] truncate hidden sm:block">
              {event.description}
            </span>
          )}
        </div>
      </div>

      {/* Delete button — always visible on touch, hover-only on desktop */}
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
          "p-2.5 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0",
          isSelectionMode ? "hidden" : "opacity-40 md:opacity-0 md:group-hover:opacity-100"
        )}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}

// Suspense wrapper obrigatório no Next.js 14 para useSearchParams
export default function AgendaPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-workspace)]" />}>
      <AgendaPage />
    </Suspense>
  )
}

function AgendaPage() {
  const { data: events, isLoading } = useEvents()
  const deleteEvent = useDeleteEvent()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const searchParams = useSearchParams()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState<string>('')
  const [historyEndDate, setHistoryEndDate] = useState<string>('')
  const [historyPeriod, setHistoryPeriod] = useState<'all' | 'custom'>('all')

  const user = auth.currentUser

  // Update logic for real-time visual alerts
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // ── Logs via React Query — invalidated automatically by useLogEvent.onSuccess ──
  // Uses batched 'in' queries (10 dates each, run in PARALLEL) so no composite
  // Firestore index is needed and the fetch is as fast as a single round-trip.
  // Covers: today + past 30 days (overdue window) = 31 dates = 4 parallel queries.
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const logDates = [todayStr, ...Array.from({ length: 30 }, (_, i) =>
    format(subDays(new Date(), i + 1), 'yyyy-MM-dd')
  )]

  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['event-logs-agenda', user?.uid, todayStr],
    queryFn: async () => {
      if (!user) return new Map<string, string>()

      // Chunk into 10-date batches, run ALL batches in parallel
      const chunks: string[][] = []
      for (let i = 0; i < logDates.length; i += 10) {
        chunks.push(logDates.slice(i, i + 10))
      }

      const snapshots = await Promise.all(
        chunks.map(chunk =>
          getDocs(query(
            collection(db, 'event_logs'),
            where('user_id', '==', user.uid),
            where('log_date', 'in', chunk)
          ))
        )
      )

      const m = new Map<string, string>()
      snapshots.forEach(snap => {
        snap.docs.forEach(d => {
          const data = d.data()
          m.set(`${data.event_id}_${data.log_date}`, data.status)
        })
      })
      return m
    },
    enabled: !!user,
    staleTime: 5_000,
  })
  const logs = logsData || new Map<string, string>()

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
      ids = events.filter(e => e.date?.startsWith(currentYear)).map(e => e.id)
    } else if (type === 'next_year') {
      ids = events.filter(e => e.date?.startsWith(nextYear)).map(e => e.id)
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

    // Filter events with invalid dates to avoid parseISO crashes
    const validEvents = events.filter(e =>
      typeof e.date === 'string' && e.date.length >= 8
    )

    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    // todayStr is available from outer scope

    const grouped: Record<string, (CalendarEvent & { isOverdue?: boolean })[]> = {}

    days.forEach((day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      // Past days belong to pastEventsGrouped (history section)
      if (dateStr < todayStr) return

      const rawEvents = validEvents
        .filter(e => occursOnDate(e, dateStr, day))
        .map(e => ({
          ...e,
          status: (logs.get(`${e.id}_${dateStr}`) || 'none') as CalendarEvent['status'],
          isOverdue: false
        }))

      // For today: show ALL events (pending + completed). Completed ones sort to the
      // bottom. They only move to "Compromissos Passados" the following day.
      // While logs are still loading, hide today entirely to prevent stale flash.
      const visibleEvents = (dateStr === todayStr && loadingLogs) ? [] : rawEvents

      if (visibleEvents.length > 0) {
        const sorted = [...visibleEvents].sort((a, b) => {
          const aResolved = a.status === 'done' || a.status === 'partial' || a.status === 'failed'
          const bResolved = b.status === 'done' || b.status === 'partial' || b.status === 'failed'
          if (aResolved && !bResolved) return 1
          if (!aResolved && bResolved) return -1
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
        grouped[dateStr] = sorted
      }
    })

    // ── Overdue injection: past 30 days, one entry per event (most-recent date) ──
    // Only inject after logs have loaded to avoid false positives
    if (!loadingLogs) {
      const today = new Date()
      // IDs of events already shown in today's active group (to avoid duplicates)
      const todayActiveIds = new Set((grouped[todayStr] || []).map(e => e.id))
      // Collect: eventId → most-recent unhandled past date
      const overdueMap = new Map<string, { dateStr: string; event: CalendarEvent }>()

      for (let i = 1; i <= 30; i++) {
        const pastDate = subDays(today, i)
        const pastDateStr = format(pastDate, 'yyyy-MM-dd')

        validEvents.forEach(e => {
          if (overdueMap.has(e.id)) return // already found a more-recent overdue date
          if (todayActiveIds.has(e.id)) return // already in today's active list

          // Skip if event was created after this past date
          if (e.created_at) {
            try {
              if (pastDateStr < format(new Date(e.created_at as string), 'yyyy-MM-dd')) return
            } catch { return }
          }

          if (!occursOnDate(e, pastDateStr, pastDate)) return

          const status = logs.get(`${e.id}_${pastDateStr}`) || 'none'
          const isCompleted = status === 'done' || status === 'partial' || status === 'failed'
          if (!isCompleted) {
            overdueMap.set(e.id, { dateStr: pastDateStr, event: e })
          }
        })
      }

      const overdueItems: (CalendarEvent & { isOverdue: boolean })[] = []
      overdueMap.forEach(({ dateStr: pastDateStr, event: e }) => {
        const status = logs.get(`${e.id}_${pastDateStr}`) || 'none'
        overdueItems.push({
          ...e,
          date: pastDateStr,
          status: status as CalendarEvent['status'],
          isOverdue: true
        })
      })

      if (overdueItems.length > 0) {
        // Sort overdue items: most recent first, then by time
        overdueItems.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date)
          return (a.time || '00:00').localeCompare(b.time || '00:00')
        })
        grouped[todayStr] = [...overdueItems, ...(grouped[todayStr] || [])]
      }
    }

    // Remove empty groups
    Object.keys(grouped).forEach(key => { if (grouped[key].length === 0) delete grouped[key] })

    return grouped
  }, [events, currentMonth, logs, currentTime, loadingLogs])

  const pastEventsGrouped = useMemo(() => {
    if (!events || !logs.size) return {}
    // todayStr is available from outer scope (query key computation above)

    // Build a fast lookup map: eventId → event object
    const eventMap = new Map(events.map(e => [e.id, e]))

    const grouped: Record<string, CalendarEvent[]> = {}

    // Iterate logs instead of events — this correctly handles recurring events
    // because each occurrence has its own log entry under the occurrence date.
    logs.forEach((status, logKey) => {
      // logKey format: "${eventId}_yyyy-MM-dd"  (log_date is always last 10 chars)
      if (logKey.length < 12) return
      const logDate = logKey.slice(-10)
      const eventId = logKey.slice(0, -11) // strip "_yyyy-MM-dd"

      // Only show resolved events in history
      if (status === 'none' || status === 'todo') return

      // Skip today and future — today's events stay in today's main section
      if (logDate >= todayStr) return

      // Apply period filter
      if (historyPeriod === 'custom') {
        if (historyStartDate && logDate < historyStartDate) return
        if (historyEndDate && logDate > historyEndDate) return
      }

      const event = eventMap.get(eventId)
      if (!event) return

      if (!grouped[logDate]) grouped[logDate] = []
      // Deduplicate (each log entry is unique by design, but be safe)
      if (!grouped[logDate].some(ev => ev.id === eventId)) {
        grouped[logDate].push({ ...event, status: status as CalendarEvent['status'], date: logDate })
      }
    })

    // Sort dates descending (most recent first)
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
    )
  }, [events, logs, historyPeriod, historyStartDate, historyEndDate])

  return (
    <div className="p-4 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-6 md:space-y-10 lg:space-y-14 pb-24 lg:pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-[var(--bg-overlay)] rounded-[16px] md:rounded-[24px] flex items-center justify-center border border-[var(--border-subtle)] shadow-2xl shrink-0">
            <CalendarIcon className="text-[var(--text-primary)] w-5 h-5 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-3xl md:text-5xl font-black tracking-tightest text-[var(--text-primary)]">Minha Agenda</h1>
              {/* Month nav — inline on desktop */}
              <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-full px-2 py-1 border border-[var(--border-subtle)]">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-0.5 hover:text-[var(--text-primary)] transition-colors text-[var(--text-muted)]">
                  <ChevronRight className="rotate-180" size={13} />
                </button>
                <span className="text-[11px] font-black uppercase tracking-widest min-w-[90px] text-center text-[var(--text-primary)] capitalize">
                  {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-0.5 hover:text-[var(--text-primary)] transition-colors text-[var(--text-muted)]">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-sm md:text-lg italic hidden sm:block">
              Gerencie compromissos para qualquer data futura.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2.5 md:px-6 md:py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl shrink-0 text-sm md:text-base"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Novo Compromisso</span>
          <span className="sm:hidden">Novo</span>
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

              <AnimatePresence initial={false}>
                {isHistoryOpen && (
                  <motion.div
                    key="history-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                    className="space-y-8"
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
                              key={`hist_${event.id}_${event.date}`}
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
                      key={`${event.id}_${event.date}`}
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
