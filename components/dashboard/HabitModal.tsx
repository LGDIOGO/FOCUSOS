import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ShieldAlert, RefreshCcw, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmojiPicker } from './EmojiPicker'
import { CustomDateTimePicker } from './CustomDateTimePicker'
import { useCategories, useAddCategory } from '@/lib/hooks/useCategories'
import { useGoals } from '@/lib/hooks/useGoals'
import { useAddHabit, useUpdateHabit } from '@/lib/hooks/useHabits'
import { Habit, RecurrenceFreq } from '@/types'
import { cn } from '@/lib/utils/cn'

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function HabitModal({ isOpen, onClose, habitToEdit }: { isOpen: boolean, onClose: () => void, habitToEdit?: Habit | null }) {
  const { data: categories } = useCategories()
  const { data: goals } = useGoals()
  const addHabit = useAddHabit()
  const updateHabit = useUpdateHabit()
  const addCategory = useAddCategory()

  const [isGoalSelectOpen, setIsGoalSelectOpen] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📁', color: '#e02020' })
  const [isParsing, setIsParsing] = useState(false)

  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    type: 'positive' as 'positive' | 'negative',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    time: '08:00',
    recurrence: {
      frequency: 'daily' as RecurrenceFreq,
      days_of_week: [0, 1, 2, 3, 4, 5, 6] as number[] | undefined,
      interval: 1 as number | undefined
    },
    color: '#FF453A',
    emoji: '',
    category_id: '',
    linked_goal_id: '',
    goal_impact: 1
  })

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setNewHabit({
          name: habitToEdit.name,
          description: habitToEdit.description || '',
          type: habitToEdit.type as 'positive' | 'negative',
          start_date: habitToEdit.start_date || format(new Date(), 'yyyy-MM-dd'),
          end_date: habitToEdit.end_date || '',
          time: habitToEdit.time || '08:00',
          recurrence: {
            frequency: habitToEdit.recurrence?.frequency || 'daily',
            days_of_week: habitToEdit.recurrence?.days_of_week || [0, 1, 2, 3, 4, 5, 6],
            interval: habitToEdit.recurrence?.interval || 1
          },
          color: habitToEdit.color || '#FF453A',
          emoji: habitToEdit.emoji || '',
          category_id: habitToEdit.category_id || '',
          linked_goal_id: habitToEdit.linked_goal_id || '',
          goal_impact: habitToEdit.goal_impact || 1
        })
      } else {
        setNewHabit({
          name: '',
          description: '',
          type: 'positive',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: '',
          time: '08:00',
          recurrence: { frequency: 'daily', days_of_week: [0, 1, 2, 3, 4, 5, 6], interval: 1 },
          color: '#FF453A',
          emoji: '',
          category_id: '',
          linked_goal_id: '',
          goal_impact: 1
        })
      }
    }
  }, [isOpen, habitToEdit])

  const handleMagicParse = async () => {
    if (!newHabit.name || isParsing) return
    setIsParsing(true)
    try {
      const response = await fetch('/api/ai/parse-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newHabit.name,
          type: 'habits',
          categories: categories?.filter(c => c.type === 'habits').map(c => ({ id: c.id, name: c.name })),
          currentDetails: {
            today: format(new Date(), 'yyyy-MM-dd'),
            dayName: format(new Date(), 'EEEE', { locale: ptBR })
          }
        })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setNewHabit(prev => ({
        ...prev,
        name: data.title || prev.name,
        time: data.time || prev.time,
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

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault()
    if (habitToEdit) {
      updateHabit.mutate({
        ...habitToEdit,
        ...newHabit
      }, {
        onSuccess: () => {
          onClose()
        }
      })
    } else {
       addHabit.mutate({
        ...newHabit,
        is_archived: false,
        sort_order: 999,
        status: 'none',
        streak: 0,
      } as any, {
        onSuccess: () => {
          onClose()
        }
      })
    }
  }

  const toggleDay = (day: number) => {
    const current = newHabit.recurrence.days_of_week || []
    const next = current.includes(day) 
      ? current.filter(d => d !== day)
      : [...current, day].sort()
    setNewHabit({
      ...newHabit,
      recurrence: { ...newHabit.recurrence, frequency: 'specific_days', days_of_week: next }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[990] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 text-left backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-[#0A0A0A] border text-left border-white/10 rounded-[40px] md:rounded-[48px] p-4 md:p-7 overflow-y-auto max-h-[90vh] shadow-2xl z-[991]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-4xl font-black tracking-tightest">{habitToEdit ? 'Editar Hábito' : 'Novo Hábito'}</h2>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl">
            <X className="text-white/60" />
          </button>
        </div>

        <form onSubmit={handleAddHabit} className="space-y-3">
          <div className="space-y-1.5 relative">
            <label className="text-[13px] md:text-[14px] font-black uppercase tracking-widest text-white/50 px-1">Nome</label>
            <div className="relative group/input">
              <input 
                required
                value={newHabit.name}
                onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3.5 text-white focus:outline-none focus:border-white/30 transition-all font-bold text-lg md:text-xl pr-14"
                placeholder="Exemplo: Meditar..."
              />
              <button
                type="button"
                onClick={handleMagicParse}
                disabled={isParsing || !newHabit.name}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all",
                  isParsing ? "bg-white/10 animate-pulse" : "bg-white/0 hover:bg-white/5",
                  newHabit.name ? "text-red-500 opacity-100" : "text-white/10 opacity-0 pointer-events-none"
                )}
              >
                {isParsing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} className={cn(newHabit.name && "animate-pulse")} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[12px] font-black uppercase tracking-widest text-white/50">Categoria</label>
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
                onClick={() => setNewHabit({ ...newHabit, category_id: '' })}
                className={cn(
                  "px-4 py-3 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all",
                  !newHabit.category_id ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5"
                )}
              >
                Nenhuma
              </button>
              {categories?.filter(c => c.type === 'habits').map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewHabit({ ...newHabit, category_id: cat.id, emoji: cat.icon || newHabit.emoji, color: cat.color || newHabit.color })}
                  className={cn(
                    "px-4 py-3 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    newHabit.category_id === cat.id ? "border-white bg-white/10 text-white" : "bg-white/5 text-white/40 border-white/5"
                  )}
                  style={newHabit.category_id === cat.id ? { borderColor: cat.color } : {}}
                >
                  <span>{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Personalização</label>
            <div className="flex items-center gap-4">
              <EmojiPicker value={newHabit.emoji || ''} onChange={emoji => setNewHabit({ ...newHabit, emoji })} />
              <div className="flex-1 grid grid-cols-5 gap-2">
                {['#FF453A', '#FF9F0A', '#FFD60A', '#32D74B', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#8E8E93', '#FFFFFF'].map(color => (
                  <button
                    key={color} type="button" onClick={() => setNewHabit({ ...newHabit, color })}
                    className={cn("w-8 h-8 rounded-full border-2 transition-all", newHabit.color === color ? "border-white scale-110" : "border-transparent opacity-40")}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Tipo de Hábito</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button" onClick={() => setNewHabit({ ...newHabit, type: 'positive' })}
                className={cn("py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", newHabit.type === 'positive' ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5")}
              >
                <Sparkles size={14} /> Positivo
              </button>
              <button
                type="button" onClick={() => setNewHabit({ ...newHabit, type: 'negative' })}
                className={cn("py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", newHabit.type === 'negative' ? "bg-red-500 text-white border-red-500" : "bg-white/5 text-white/40 border-white/5")}
              >
                <ShieldAlert size={14} /> A evitar
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Vincular a Meta (Opcional)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative z-50">
                <button type="button" onClick={() => setIsGoalSelectOpen(!isGoalSelectOpen)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-white/30 transition-all font-bold text-sm flex items-center justify-between group">
                  <span className="flex items-center gap-2">
                    {newHabit.linked_goal_id ? (
                      <><span className="text-lg">{goals?.find(g => g.id === newHabit.linked_goal_id)?.emoji}</span><span className="truncate max-w-[150px]">{goals?.find(g => g.id === newHabit.linked_goal_id)?.title}</span></>
                    ) : <span className="text-white/40">Nenhuma Meta</span>}
                  </span>
                  <ChevronDown size={16} className={cn("text-white/40 group-hover:text-white transition-all transform", isGoalSelectOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {isGoalSelectOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full mt-2 left-0 w-full z-[100] bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                      <button type="button" onClick={() => { setNewHabit({ ...newHabit, linked_goal_id: '' }); setIsGoalSelectOpen(false); }} className={cn("w-full text-left px-5 py-3 text-sm font-bold transition-colors flex items-center gap-3 border-b border-white/5", !newHabit.linked_goal_id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white")}><div className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10"><X size={12}/></div><span>Nenhuma Meta</span></button>
                      {goals?.filter(g => g.status === 'active').map(goal => (
                        <button key={goal.id} type="button" onClick={() => { setNewHabit({ ...newHabit, linked_goal_id: goal.id }); setIsGoalSelectOpen(false); }} className={cn("w-full text-left px-5 py-3 text-sm font-bold transition-colors flex items-center gap-3", newHabit.linked_goal_id === goal.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="text-lg">{goal.emoji}</span><span className="truncate">{goal.title}</span></button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <input type="number" step="0.1" min="0" placeholder="Impacto" value={newHabit.goal_impact} onChange={e => setNewHabit({ ...newHabit, goal_impact: parseFloat(e.target.value) || 0 })} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-white/30 transition-all font-bold text-sm" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase tracking-widest pointer-events-none">Impacto</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Repetir</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ id: 'daily', label: 'Diário' }, { id: 'weekly', label: 'Semanal' }, { id: 'monthly', label: 'Mensal' }, { id: 'yearly', label: 'Anual' }, { id: 'specific_days', label: 'Personalizado' }].map(freq => (
                <button
                  key={freq.id} type="button"
                  onClick={() => setNewHabit({ ...newHabit, recurrence: { frequency: (freq.id === 'quinzenal' ? 'weekly' : freq.id as RecurrenceFreq), interval: freq.id === 'quinzenal' ? 2 : 1, days_of_week: freq.id === 'specific_days' ? (newHabit.recurrence.days_of_week && newHabit.recurrence.days_of_week.length > 0 ? newHabit.recurrence.days_of_week : [1,2,3,4,5]) : [0,1,2,3,4,5,6] } })}
                  className={cn("py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all", (newHabit.recurrence.frequency === freq.id || (freq.id === 'quinzenal' && newHabit.recurrence.interval === 2 && newHabit.recurrence.frequency === 'weekly')) ? "bg-white text-black border-white shadow-lg" : "bg-white/5 text-white/60 border-white/5 hover:border-white/20")}
                >
                  {freq.label}
                </button>
              ))}
            </div>
            {newHabit.recurrence.frequency === 'specific_days' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white/[0.03] border border-white/10 p-6 rounded-[32px] mt-4">
                <div className="flex justify-between gap-1">
                  {DAYS.map((day, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)} className={cn("w-10 h-10 rounded-xl font-black text-base transition-all flex items-center justify-center", newHabit.recurrence.days_of_week?.includes(i) ? "bg-white text-black shadow-lg" : "text-white/20 hover:bg-white/5 border border-white/5")}>{day}</button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[12px] font-black uppercase text-white/50 tracking-widest">Intervalo</span>
                  <div className="flex gap-2">
                    {[1, 2].map(int => (
                      <button key={int} type="button" onClick={() => setNewHabit({ ...newHabit, recurrence: { ...newHabit.recurrence, interval: int } })} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", newHabit.recurrence.interval === int ? "bg-white text-black" : "text-white/50 hover:bg-white/5")}>{int === 1 ? 'Toda Semana' : 'Quinzenal'}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-2 pt-1">
            <CustomDateTimePicker label="Início" type="date" value={newHabit.start_date} onChange={val => setNewHabit({ ...newHabit, start_date: val })} direction="up" />
            <CustomDateTimePicker label="Fim" type="date" value={newHabit.end_date || ''} onChange={val => setNewHabit({ ...newHabit, end_date: val })} align="right" direction="up" />
            <CustomDateTimePicker label="Hora" type="time" value={newHabit.time} onChange={val => setNewHabit({ ...newHabit, time: val })} align="right" direction="up" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Descrição</label>
            <textarea value={newHabit.description} onChange={e => setNewHabit({ ...newHabit, description: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3 text-white focus:outline-none focus:border-white/30 transition-all font-medium text-base min-h-[50px] max-h-[100px] resize-none" placeholder="Adicione um detalhe..." />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={addHabit.isPending || updateHabit.isPending} className="w-full bg-white text-black font-black py-4 rounded-[24px] hover:bg-neutral-200 transition-all active:scale-95 text-lg">
              {addHabit.isPending || updateHabit.isPending ? 'Salvando...' : (habitToEdit ? 'Salvar Alterações' : 'Criar Hábito')}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {showAddCategoryModal && (
            <div className="absolute inset-0 z-50 rounded-[48px] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold">Nova Categoria</h3>
                   <button type="button" onClick={() => setShowAddCategoryModal(false)}><X size={20} className="text-white/60"/></button>
                 </div>
                 <div className="space-y-4">
                   <input value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50" placeholder="Nome da categoria" />
                   <div className="flex gap-4 items-center">
                     <EmojiPicker value={newCategory.icon} onChange={icon => setNewCategory({ ...newCategory, icon })} />
                     <div className="flex gap-2 flex-wrap">
                       {['#FF453A', '#32D74B', '#FF9F0A', '#BF5AF2', '#8E8E93'].map(color => (
                         <button key={color} type="button" onClick={() => setNewCategory({ ...newCategory, color })} className={cn("w-6 h-6 rounded-full border-2", newCategory.color === color ? "border-white" : "border-transparent opacity-40")} style={{ backgroundColor: color }} />
                       ))}
                     </div>
                   </div>
                   <button type="button" onClick={() => { if(!newCategory.name) return; addCategory.mutate({...newCategory, type: 'habits'}, { onSuccess: () => setShowAddCategoryModal(false) })}} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl mt-4">Salvar Categoria</button>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
