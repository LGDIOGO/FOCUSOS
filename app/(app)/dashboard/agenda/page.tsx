'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalendarIcon, Plus, Trash2, Zap, Clock, ChevronRight, Users, Cake, Star, Bell, RefreshCcw, TrendingUp
} from 'lucide-react'
import { AgendaModal } from '@/components/dashboard/AgendaModal'
import { useEvents, useDeleteEvent } from '@/lib/hooks/useEvents'
import { CalendarEvent, EventType } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format, isToday, isTomorrow, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, differenceInWeeks, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLongPress } from '@/lib/hooks/useLongPress'

const EVENT_TYPES: { type: EventType; label: string; icon: any; color: string }[] = [
  { type: 'meeting', label: 'Reunião', icon: Users, color: 'text-red-400 bg-red-400/10' },
  { type: 'birthday', label: 'Aniversário', icon: Cake, color: 'text-pink-400 bg-pink-400/10' },
  { type: 'event', label: 'Evento', icon: Star, color: 'text-amber-400 bg-amber-400/10' },
  { type: 'priority' as any, label: 'Tarefa Crítica', icon: Bell, color: 'text-orange-400 bg-orange-400/10' },
  { type: 'other', label: 'Outros', icon: CalendarIcon, color: 'text-white/60 bg-white/5' },
]

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function EventItem({ 
  event, 
  isSelectionMode, 
  isSelected, 
  toggleSelection, 
  openEditModal, 
  setIsSelectionMode,
  onDelete
}: { 
  event: CalendarEvent
  isSelectionMode: boolean
  isSelected: boolean
  toggleSelection: (id: string) => void
  openEditModal: (event: CalendarEvent) => void
  setIsSelectionMode: (val: boolean) => void
  onDelete: (id: string) => void
}) {
  const localLongPress = useLongPress(
    () => {
      setIsSelectionMode(true)
      toggleSelection(event.id)
    },
    () => {},
    { delay: 500 }
  )

  return (
    <motion.div
      layoutId={event.id}
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
        "group flex items-center gap-6 p-6 bg-white/[0.03] border rounded-[32px] hover:bg-white/[0.05] transition-all cursor-pointer relative",
        isSelected ? "border-red-500 bg-red-500/5" : "border-white/10"
      )}
    >
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110"
        style={{ backgroundColor: event.color ? `${event.color}20` : 'rgba(255,255,255,0.05)', color: event.color || '#FFFFFF' }}
      >
        {event.emoji || (
          event.type === 'meeting' ? <Users size={24} /> :
          event.type === 'birthday' ? <Cake size={24} /> :
          event.type === 'event' ? <Star size={24} /> : <CalendarIcon size={24} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-bold text-white truncate">{event.title}</h3>
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
        <div className="flex items-center gap-4 text-white/50 text-base font-medium">
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            {event.time}
          </div>
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

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const searchParams = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

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

          if (freq === 'monthly') {
             return format(day, 'dd') === format(evDate, 'dd')
          }
          if (freq === 'yearly') {
             return format(day, 'MM-dd') === format(evDate, 'MM-dd')
          }
        }
        return false
      })
      
      if (dayEvents.length > 0) {
        grouped[dateStr] = dayEvents
      }
    })
    
    return grouped
  }, [events, currentMonth])

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-10 lg:space-y-14 pb-24 md:pb-10">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center border border-white/10 shadow-2xl">
            <CalendarIcon className="text-white w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-5xl font-black tracking-tightest">Minha Agenda</h1>
               <div className="flex items-center gap-1 bg-white/5 rounded-full px-3 py-1 border border-white/10">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:text-white transition-colors text-white/60">
                    <ChevronRight className="rotate-180" size={14} />
                  </button>
                  <span className="text-[12px] font-black uppercase tracking-widest min-w-[100px] text-center">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:text-white transition-colors text-white/60">
                    <ChevronRight size={14} />
                  </button>
               </div>
            </div>
            <p className="text-white/60 font-medium text-lg italic flex items-center gap-2">
              Gerencie compromissos para qualquer data futura.
              <span className="inline-block w-1 h-1 rounded-full bg-white/20 mx-1" />
              <span className="text-white/30 text-xs font-black uppercase tracking-tighter hidden md:inline-block border border-white/5 px-2 py-0.5 rounded-md">Botão direito para selecionar</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 shadow-xl shrink-0"
        >
          <Plus size={20} />
          Novo Compromisso
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-2 space-y-10 md:space-y-14">
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
                     "text-base font-black uppercase tracking-widest",
                     isToday(parseISO(date)) ? "text-white" : "text-white/20"
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
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-8 lg:sticky lg:top-14 h-fit">
           <div className="p-6 md:p-8 bg-white/[0.02] border border-white/10 rounded-[32px] md:rounded-[40px] space-y-6">
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



      {/* Selection Tray */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[40px] px-10 py-5 flex items-center gap-10 shadow-2xl ring-1 ring-white/5"
          >
            <div className="flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-3xl font-black text-white leading-none">{selectedIds.length}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Itens</span>
            </div>

            <div className="h-12 w-px bg-white/10" />

            <div className="flex items-center gap-6">
              {[
                { label: 'Tudo', icon: Zap, onClick: () => handleSelectGroup('all') },
                { label: 'Hoje', icon: Clock, onClick: () => handleSelectGroup('today') },
                { label: 'Amanhã', icon: CalendarIcon, onClick: () => handleSelectGroup('tomorrow') },
                { label: 'Ano Atual', icon: Star, onClick: () => handleSelectGroup('current_year') },
                { label: 'Ano Que Vem', icon: TrendingUp, onClick: () => handleSelectGroup('next_year') },
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={btn.onClick}
                  className="relative flex flex-col items-center group/sel pt-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/sel:bg-white group-hover/sel:text-black transition-all duration-300">
                    <btn.icon size={20} />
                  </div>
                  <span className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-white/40 opacity-0 group-hover/sel:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-12 w-px bg-white/10" />

            <div className="flex items-center gap-6">
              <button 
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                className="relative flex flex-col items-center group/del disabled:opacity-20"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/del:bg-red-500 group-hover/del:text-white transition-all duration-300 text-red-500">
                  <Trash2 size={20} />
                </div>
                <span className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-red-500/40 opacity-0 group-hover/del:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                  Excluir
                </span>
              </button>
              
              <button 
                onClick={() => {
                  setIsSelectionMode(false)
                  setSelectedIds([])
                }}
                className="h-12 px-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] transition-all duration-300 whitespace-nowrap"
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
