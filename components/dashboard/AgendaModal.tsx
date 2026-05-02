import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, RefreshCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmojiPicker } from './EmojiPicker'
import { CustomDateTimePicker } from './CustomDateTimePicker'
import { useCategories, useAddCategory } from '@/lib/hooks/useCategories'
import { useAddEvent, useUpdateEvent } from '@/lib/hooks/useEvents'
import { CalendarEvent, EventType, RecurrenceFreq, RecurrenceRule } from '@/types'
import { cn } from '@/lib/utils/cn'

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/** Returns a time string 1 hour ahead of now, snapped to the next full hour. */
function defaultEventTime(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return format(d, 'HH:mm')
}

export function AgendaModal({ isOpen, onClose, eventToEdit }: { isOpen: boolean, onClose: () => void, eventToEdit?: CalendarEvent | null }) {
  const { data: categories } = useCategories()
  const addEvent = useAddEvent()
  const updateEvent = useUpdateEvent()
  const addCategory = useAddCategory()

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📅', color: '#e02020' })
  const [isParsing, setIsParsing] = useState(false)

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: defaultEventTime(),
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

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setNewEvent({
          title: eventToEdit.title,
          description: eventToEdit.description || '',
          date: eventToEdit.date,
          time: eventToEdit.time || '08:00',
          type: eventToEdit.type,
          recurrence: {
            frequency: eventToEdit.recurrence?.frequency || 'none',
            days_of_week: eventToEdit.recurrence?.days_of_week || [],
            interval: eventToEdit.recurrence?.interval || 1
          },
          color: eventToEdit.color || '#FF453A',
          emoji: eventToEdit.emoji || '',
          category_id: eventToEdit.category_id || ''
        })
      } else {
        setNewEvent({
          title: '',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: defaultEventTime(),
          type: 'meeting',
          recurrence: { frequency: 'none', days_of_week: [], interval: 1 },
          color: '#FF453A',
          emoji: '',
          category_id: ''
        })
      }
    }
  }, [isOpen, eventToEdit])

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
          categories: categories?.map(c => ({ id: c.id, name: c.name })),
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
      emoji: newEvent.emoji || null,
      category_id: newEvent.category_id || null
    }

    if (recurrenceRule) {
      eventData.recurrence = recurrenceRule
    }

    if (eventToEdit) {
       updateEvent.mutate({
         id: eventToEdit.id,
         ...eventData
       }, {
         onSuccess: () => {
           onClose()
         }
       })
    } else {
      addEvent.mutate(eventData, {
        onSuccess: () => {
          onClose()
        }
      })
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-end md:items-center md:justify-center md:p-6 text-left">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="relative w-full md:max-w-lg bg-[var(--bg-primary)] border text-left border-[var(--border-subtle)] rounded-t-[32px] md:rounded-[48px] p-5 md:p-7 overflow-y-auto max-h-[92dvh] md:max-h-[90vh] shadow-2xl z-[10001] transition-colors duration-300"
      >
        {/* Drag handle — mobile only */}
        <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mb-4 md:hidden" />

        <div className="flex justify-between items-center mb-6 md:mb-10">
          <h2 className="text-2xl md:text-4xl font-black tracking-tightest text-[var(--text-primary)] transition-colors">{eventToEdit ? 'Editar Compromisso' : 'Novo Compromisso'}</h2>
          <button onClick={onClose} className="p-2.5 md:p-3 hover:bg-[var(--bg-overlay)] rounded-2xl transition-all">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleAddEvent} className="space-y-3">
          <div className="space-y-2 relative">
            <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Nome</label>
            <div className="relative group/input">
              <input 
                required
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 transition-all font-bold text-xl pr-14"
                placeholder="Exemplo: Almoço com João amanhã às 12:30"
              />
              <button
                type="button"
                onClick={handleMagicParse}
                disabled={isParsing || !newEvent.title}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                  isParsing ? "bg-[var(--bg-overlay)] animate-pulse" : "bg-transparent hover:bg-[var(--bg-overlay)]",
                  newEvent.title ? "text-red-500 opacity-100" : "text-[var(--text-muted)] opacity-0 pointer-events-none"
                )}
              >
                {isParsing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} className={cn(newEvent.title && "animate-pulse")} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-[var(--text-muted)]">Categoria</label>
              <button 
                type="button" 
                onClick={() => setShowAddCategoryModal(true)}
                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
              >
                + Nova
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewEvent({ ...newEvent, category_id: '' })}
                className={cn(
                  "px-4 py-3 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all",
                  !newEvent.category_id ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-sm" : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                )}
              >
                Nenhuma
              </button>
              {categories?.map(cat => (
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
                    newEvent.category_id === cat.id ? "border-[var(--text-primary)] bg-[var(--bg-overlay)] text-[var(--text-primary)]" : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border-[var(--border-subtle)]"
                  )}
                  style={newEvent.category_id === cat.id ? { borderColor: cat.color } : {}}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Personalização</label>
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
                      newEvent.color === color ? "border-[var(--text-primary)] scale-110 shadow-lg" : "border-transparent opacity-40"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Repetir</label>
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
                       ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg" 
                       : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]/20"
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
                className="space-y-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] p-6 rounded-[32px] mt-4"
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
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg" 
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] border border-[var(--border-subtle)]"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[12px] font-black uppercase text-[var(--text-muted)] tracking-widest">Intervalo</span>
                  <div className="flex gap-2">
                     {[1, 2].map(int => (
                       <button
                         key={int}
                         type="button"
                         onClick={() => setNewEvent({ ...newEvent, recurrence: { ...newEvent.recurrence, interval: int } })}
                         className={cn(
                           "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                           newEvent.recurrence.interval === int ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] transition-colors"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomDateTimePicker label="Data" type="date" value={newEvent.date} onChange={val => setNewEvent({ ...newEvent, date: val })} direction="up" />
            <CustomDateTimePicker label="Hora" type="time" value={newEvent.time} onChange={val => setNewEvent({ ...newEvent, time: val })} align="right" direction="up" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">Anotações</label>
            <textarea 
              value={newEvent.description}
              onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]/30 min-h-[70px] resize-none"
              placeholder="Adicionar detalhes..."
            />
          </div>

          <div className="pb-6 pt-2">
            <button 
              type="submit"
              disabled={addEvent.isPending || updateEvent.isPending}
              className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black py-5 rounded-[24px] hover:opacity-90 transition-all active:scale-95 text-lg shadow-2xl"
            >
              {addEvent.isPending || updateEvent.isPending ? 'Salvando...' : (eventToEdit ? 'Salvar Alterações' : 'Criar Compromisso')}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {showAddCategoryModal && (
            <div className="absolute inset-0 z-[1000] rounded-[48px] bg-[var(--bg-primary)]/60 backdrop-blur-md flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl relative">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-[var(--text-primary)]">Nova Categoria</h3>
                   <button type="button" onClick={() => setShowAddCategoryModal(false)}><X size={20} className="text-[var(--text-muted)]"/></button>
                 </div>
                 <div className="space-y-4 text-[var(--text-primary)]">
                   <input value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} className="w-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-red-500/50" placeholder="Nome da categoria" />
                   <div className="flex gap-4 items-center">
                     <EmojiPicker value={newCategory.icon} onChange={icon => setNewCategory({ ...newCategory, icon })} />
                     <div className="flex gap-2 flex-wrap flex-1">
                       {['#FF453A', '#32D74B', '#FF9F0A', '#BF5AF2', '#8E8E93', '#FFFFFF'].map(color => (
                         <button key={color} type="button" onClick={() => setNewCategory({ ...newCategory, color })} className={cn("w-6 h-6 rounded-full border-2 transition-all", newCategory.color === color ? "border-[var(--text-primary)] scale-110" : "border-transparent opacity-40")} style={{ backgroundColor: color }} />
                       ))}
                     </div>
                   </div>
                   <button type="button" onClick={() => { if(!newCategory.name) return; addCategory.mutate({...newCategory, type: 'agenda'}, { onSuccess: () => setShowAddCategoryModal(false) })}} disabled={addCategory.isPending || !newCategory.name} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-red-700 transition-colors">Salvar Categoria</button>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
