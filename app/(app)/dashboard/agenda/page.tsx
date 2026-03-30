'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalendarIcon, Plus, Trash2, Zap, ShieldAlert, Sparkles, X, RefreshCcw, Clock, ChevronLeft, ChevronRight, Check, Users, Cake, Star, Bell
} from 'lucide-react'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { CustomDateTimePicker } from '@/components/dashboard/CustomDateTimePicker'
import { useEvents, useAddEvent, useDeleteEvent, useUpdateEvent } from '@/lib/hooks/useEvents'
import { useCategories, useAddCategory } from '@/lib/hooks/useCategories'
import { CalendarEvent, EventType, RecurrenceFreq, RecurrenceRule } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format, isToday, isTomorrow, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, differenceInWeeks, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const EVENT_TYPES: { type: EventType; label: string; icon: any; color: string }[] = [
  { type: 'meeting', label: 'Reunião', icon: Users, color: 'text-red-400 bg-red-400/10' },
  { type: 'birthday', label: 'Aniversário', icon: Cake, color: 'text-pink-400 bg-pink-400/10' },
  { type: 'event', label: 'Evento', icon: Star, color: 'text-amber-400 bg-amber-400/10' },
  { type: 'priority' as any, label: 'Tarefa Crítica', icon: Bell, color: 'text-orange-400 bg-orange-400/10' },
  { type: 'other', label: 'Outros', icon: CalendarIcon, color: 'text-white/60 bg-white/5' },
]

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function AgendaPage() {
  const { data: events, isLoading } = useEvents()
  const { data: categories } = useCategories()
  const addEvent = useAddEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const addCategory = useAddCategory()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const searchParams = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true)
    }
  }, [searchParams])
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    type: 'meeting' as EventType,
    recurrence: {
      frequency: 'none' as RecurrenceFreq | 'none',
      days_of_week: [] as number[],
      interval: 1
    },
    color: '#FF453A',
    emoji: '',
    category_id: ''
  })

  // Novo estado para criação de categoria
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📅', color: '#e02020' })
  const [isParsing, setIsParsing] = useState(false)

  const handleMagicParse = async () => {
    if (!newEvent.title || isParsing) return
    setIsParsing(true)
    try {
      const response = await fetch('/api/ai/parse-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newEvent.title,
          type: 'agenda',
          categories: categories?.filter(c => c.type === 'agenda').map(c => ({ id: c.id, name: c.name })),
          currentDetails: {
            today: format(new Date(), 'yyyy-MM-dd'),
            dayName: format(new Date(), 'EEEE', { locale: ptBR })
          }
        })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setNewEvent(prev => ({
        ...prev,
        title: data.title || prev.title,
        time: data.time || prev.time,
        date: data.date || prev.date,
        emoji: data.emoji || prev.emoji,
        category_id: data.category_id || prev.category_id,
        recurrence: data.recurrence ? {
          ...prev.recurrence,
          frequency: data.recurrence.frequency || prev.recurrence.frequency,
          days_of_week: data.recurrence.days_of_week || prev.recurrence.days_of_week,
          interval: data.recurrence.interval || prev.recurrence.interval
        } : prev.recurrence
      }))
    } catch (err) {
      console.error('Magic Parse Fail:', err)
    } finally {
      setIsParsing(false)
    }
  }

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    
    let recurrenceRule: RecurrenceRule | undefined = undefined;
    
    if (newEvent.recurrence.frequency !== 'none') {
      recurrenceRule = { 
        frequency: newEvent.recurrence.frequency as RecurrenceFreq,
        days_of_week: newEvent.recurrence.frequency === 'specific_days' ? newEvent.recurrence.days_of_week : undefined,
        interval: newEvent.recurrence.interval
      };
    }

    const eventData: any = {
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time,
      type: newEvent.type,
      color: newEvent.color,
      emoji: newEvent.emoji || '📅',
      category_id: newEvent.category_id || null
    }

    if (recurrenceRule) {
      eventData.recurrence = recurrenceRule
    }

    if (editingEventId) {
       updateEvent.mutate({
         id: editingEventId,
         ...eventData
       }, {
         onSuccess: () => {
           setShowAddModal(false)
           setEditingEventId(null)
           resetForm()
         }
       })
    } else {
      addEvent.mutate(eventData, {
        onSuccess: () => {
          setShowAddModal(false)
          resetForm()
        }
      })
    }
  }

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      type: 'meeting',
      recurrence: { frequency: 'none', days_of_week: [], interval: 1 },
      color: '#FF453A',
      emoji: '',
      category_id: ''
    })
  }

  const openEditModal = (event: CalendarEvent) => {
    setNewEvent({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time || '08:00',
      type: event.type,
      recurrence: {
        frequency: event.recurrence?.frequency || 'none',
        days_of_week: event.recurrence?.days_of_week || [],
        interval: event.recurrence?.interval || 1
      },
      color: event.color || '#FF453A',
      emoji: event.emoji || '',
      category_id: event.category_id || ''
    })
    setEditingEventId(event.id)
    setShowAddModal(true)
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (!events) return
    const allIds = events.map(e => e.id)
    setSelectedIds(allIds)
  }

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedIds.length} compromissos?`)) {
      selectedIds.forEach(id => deleteEvent.mutate(id))
      setSelectedIds([])
      setIsSelectionMode(false)
    }
  }

  const toggleDay = (day: number) => {
    const current = newEvent.recurrence.days_of_week || []
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort()

    setNewEvent({
      ...newEvent,
      recurrence: { ...newEvent.recurrence, frequency: 'specific_days', days_of_week: next }
    })
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
                    <motion.div
                      key={event.id}
                      layoutId={event.id}
                      onClick={() => isSelectionMode ? toggleSelection(event.id) : openEditModal(event)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setIsSelectionMode(true)
                        toggleSelection(event.id)
                      }}
                      className={cn(
                        "group flex items-center gap-6 p-6 bg-white/[0.03] border rounded-[32px] hover:bg-white/[0.05] transition-all cursor-pointer relative",
                        selectedIds.includes(event.id) ? "border-red-500 bg-red-500/5" : "border-white/10"
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
                          deleteEvent.mutate(event.id)
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

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[900] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[40px] md:rounded-[48px] p-5 md:p-7 overflow-y-auto max-h-[90vh] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black tracking-tightest">{editingEventId ? 'Editar Compromisso' : 'Novo Compromisso'}</h2>
                <button onClick={() => { setShowAddModal(false); setEditingEventId(null); resetForm(); }} className="p-3 hover:bg-white/5 rounded-2xl">
                  <X className="text-white/60" />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-3">
                <div className="space-y-2 relative">
                  <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-white/50 px-1">Nome</label>
                  <div className="relative group/input">
                    <input 
                      required
                      value={newEvent.title}
                      onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-white/30 transition-all font-bold text-xl pr-14"
                      placeholder="Exemplo: Almoço com João amanhã às 12:30"
                    />
                    <button
                      type="button"
                      onClick={handleMagicParse}
                      disabled={isParsing || !newEvent.title}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                        isParsing ? "bg-white/10 animate-pulse" : "bg-white/0 hover:bg-white/5",
                        newEvent.title ? "text-red-400 opacity-100" : "text-white/10 opacity-0 pointer-events-none"
                      )}
                    >
                      {isParsing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} className={cn(newEvent.title && "animate-pulse")} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-white/50">Categoria</label>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300"
                    >
                      + Nova
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, category_id: '' })}
                      className={cn(
                        "px-4 py-3 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all",
                        !newEvent.category_id ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5"
                      )}
                    >
                      Nenhuma
                    </button>
                    {categories?.filter(c => c.type === 'agenda').map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setNewEvent({ 
                            ...newEvent, 
                            category_id: cat.id,
                            emoji: cat.icon || newEvent.emoji,
                            color: cat.color || newEvent.color
                          })
                        }}
                        className={cn(
                          "px-4 py-3 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          newEvent.category_id === cat.id ? "border-white bg-white/10 text-white" : "bg-white/5 text-white/40 border-white/5"
                        )}
                        style={newEvent.category_id === cat.id ? { borderColor: cat.color } : {}}
                      >
                        <span>{cat.icon}</span>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-white/50 px-1">Personalização</label>
                  <div className="flex items-center gap-4">
                    <EmojiPicker 
                      value={newEvent.emoji || ''} 
                      onChange={emoji => setNewEvent({ ...newEvent, emoji })} 
                    />
                    <div className="flex-1 grid grid-cols-5 gap-3">
                      {['#FF453A', '#FF9F0A', '#FFD60A', '#32D74B', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#8E8E93', '#FFFFFF'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewEvent({ ...newEvent, color })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            newEvent.color === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-40"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>


                <div className="space-y-1.5">
                  <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-white/50 px-1">Repetir</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'Uma vez' },
                      { id: 'daily', label: 'Diário' },
                      { id: 'weekly', label: 'Semanal' },
                      { id: 'monthly', label: 'Mensal' },
                      { id: 'yearly', label: 'Anual' },
                      { id: 'specific_days', label: 'Personalizado' }
                    ].map(freq => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setNewEvent({ 
                          ...newEvent, 
                          recurrence: { 
                            frequency: (freq.id === 'quinzenal' ? 'weekly' : freq.id as any),
                            interval: freq.id === 'quinzenal' ? 2 : 1,
                            days_of_week: freq.id === 'specific_days' ? (newEvent.recurrence.days_of_week.length > 0 ? newEvent.recurrence.days_of_week : [1,2,3,4,5]) : []
                          } 
                        })}
                        className={cn(
                          "py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          (newEvent.recurrence.frequency === freq.id || (freq.id === 'quinzenal' && newEvent.recurrence.interval === 2 && newEvent.recurrence.frequency === 'weekly')) 
                            ? "bg-white text-black border-white shadow-lg" 
                            : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                        )}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>

                  {newEvent.recurrence.frequency === 'specific_days' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 bg-white/[0.03] border border-white/10 p-6 rounded-[32px] mt-4"
                    >
                      <div className="flex justify-between gap-1">
                        {DAYS.map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={cn(
                              "w-10 h-10 rounded-xl font-black text-base transition-all flex items-center justify-center",
                              newEvent.recurrence.days_of_week?.includes(i) 
                                ? "bg-white text-black shadow-lg" 
                                : "text-white/20 hover:bg-white/5 border border-white/5"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[12px] font-black uppercase text-white/50 tracking-widest">Intervalo</span>
                        <div className="flex gap-2">
                           {[1, 2].map(int => (
                             <button
                               key={int}
                               type="button"
                               onClick={() => setNewEvent({ ...newEvent, recurrence: { ...newEvent.recurrence, interval: int } })}
                               className={cn(
                                 "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                 newEvent.recurrence.interval === int ? "bg-white text-black" : "text-white/50 hover:bg-white/5"
                               )}
                             >
                               {int === 1 ? 'Toda Semana' : 'Quinzenal'}
                             </button>
                           ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CustomDateTimePicker label="Data" type="date" value={newEvent.date} onChange={val => setNewEvent({ ...newEvent, date: val })} direction="up" />
                  <CustomDateTimePicker label="Hora" type="time" value={newEvent.time} onChange={val => setNewEvent({ ...newEvent, time: val })} align="right" direction="up" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-white/50 px-1">Anotações</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3 text-white focus:outline-none focus:border-white/30 min-h-[70px] resize-none"
                    placeholder="Adicionar detalhes..."
                  />
                </div>

                <div className="pb-6 pt-2">
                  <button 
                    type="submit"
                    disabled={addEvent.isPending || updateEvent.isPending}
                    className="w-full bg-white text-black font-black py-5 rounded-[24px] hover:bg-neutral-200 transition-all active:scale-95 text-lg shadow-2xl"
                  >
                    {addEvent.isPending || updateEvent.isPending ? 'Salvando...' : (editingEventId ? 'Salvar Alterações' : 'Criar Compromisso')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddCategoryModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddCategoryModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black tracking-tight">Nova Categoria (Agenda)</h2>
                <button onClick={() => setShowAddCategoryModal(false)} className="p-2 hover:bg-white/5 rounded-xl">
                  <X size={20} className="text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Nome da Categoria</label>
                  <input 
                    value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-all font-bold"
                    placeholder="Ex: Trabalho, Estudo..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Ícone & Cor</label>
                  <div className="flex gap-4 items-center">
                    <EmojiPicker 
                      value={newCategory.icon} 
                      onChange={icon => setNewCategory({ ...newCategory, icon })} 
                    />
                    <div className="flex gap-2 flex-wrap flex-1">
                      {['#FF453A', '#32D74B', '#FF9F0A', '#BF5AF2', '#8E8E93', '#FFFFFF'].map(color => (
                        <button
                          key={color}
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            newCategory.color === color ? "border-white scale-110" : "border-transparent opacity-40 hover:opacity-100"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!newCategory.name) return
                    addCategory.mutate({
                      ...newCategory,
                      type: 'agenda'
                    }, {
                      onSuccess: () => {
                        setShowAddCategoryModal(false)
                        setNewCategory({ name: '', icon: '📅', color: '#e02020' })
                      }
                    })
                  }}
                  disabled={addCategory.isPending || !newCategory.name}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-500 transition-all active:scale-95 disabled:opacity-50"
                >
                  {addCategory.isPending ? 'Salvando...' : 'Criar Categoria'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selection Tray */}
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
                { label: 'Tudo', icon: Zap, onClick: handleSelectAll },
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
    </div>
  )
}
