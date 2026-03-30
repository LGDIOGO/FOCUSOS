'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, Zap, ShieldAlert, Sparkles, X, RefreshCcw, Check, Square, TrendingUp, Target, Clock, Calendar, ChevronDown
} from 'lucide-react'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { CustomDateTimePicker } from '@/components/dashboard/CustomDateTimePicker'
import { useHabits, useAddHabit, useDeleteHabit, useUpdateHabit } from '@/lib/hooks/useHabits'
import { useCategories, useAddCategory } from '@/lib/hooks/useCategories'
import { useGoals } from '@/lib/hooks/useGoals'
import { Habit, RecurrenceFreq, RecurrenceRule } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLongPress } from '@/lib/hooks/useLongPress'

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function HabitGridItem({ 
  habit, 
  idx, 
  isSelectionMode, 
  isSelected, 
  onToggleSelection, 
  onOpenEdit, 
  onDelete,
  setIsSelectionMode
}: {
  habit: Habit
  idx: number
  isSelectionMode: boolean
  isSelected: boolean
  onToggleSelection: (id: string) => void
  onOpenEdit: (habit: Habit) => void
  onDelete: (id: string) => void
  setIsSelectionMode: (val: boolean) => void
}) {
  const longPress = useLongPress(
    () => {
      setIsSelectionMode(true)
      onToggleSelection(habit.id)
    },
    () => {
      if (isSelectionMode) {
        onToggleSelection(habit.id)
      } else {
        onOpenEdit(habit)
      }
    },
    { delay: 500 }
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: idx * 0.05 }}
      {...longPress}
      onClick={() => {
        if (isSelectionMode) {
          onToggleSelection(habit.id)
        } else {
          onOpenEdit(habit)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        setIsSelectionMode(true)
        onToggleSelection(habit.id)
      }}
      className={cn(
        "group relative bg-white/[0.02] border rounded-[40px] p-8 hover:bg-white/[0.04] transition-all flex flex-col justify-between overflow-hidden cursor-pointer h-full",
        isSelected ? "border-red-500/50 bg-red-500/[0.08] ring-1 ring-red-500/20 shadow-[0_0_20px_rgba(224,32,32,0.1)]" : "border-white/10"
      )}
    >


      <div className="relative z-10 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110"
            style={{ backgroundColor: habit.color ? `${habit.color}20` : 'rgba(255,255,255,0.05)', color: habit.color || '#FFFFFF' }}
          >
            {habit.emoji || (habit.type === 'positive' ? <Sparkles size={20} /> : <ShieldAlert size={20} />)}
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white transition-colors">{habit.name}</h3>
            <p className="text-white/50 text-base font-medium line-clamp-1 italic">{habit.description || 'Sem descrição'}</p>
          </div>
        </div>
        {!isSelectionMode && (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onDelete(habit.id)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="p-2 text-white/5 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="relative z-10 pt-8 flex items-end justify-between">
        <div className="space-y-2">
           <div className="flex gap-1">
              {DAYS.map((label, i) => {
                const isActive = !habit.recurrence || 
                  habit.recurrence.frequency === 'daily' || 
                  (habit.recurrence.frequency === 'specific_days' && habit.recurrence.days_of_week?.includes(i))
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black border transition-all",
                      isActive ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/5"
                    )}
                  >
                    {label}
                  </div>
                )
              })}
           </div>
           <p className="text-[12px] uppercase tracking-widest font-black text-white/20">
             {habit.recurrence?.frequency === 'specific_days' ? 'Personalizado' : 
              habit.recurrence?.frequency === 'weekly' ? 'Semanal' :
              habit.recurrence?.frequency === 'monthly' ? 'Mensal' :
              habit.recurrence?.frequency === 'yearly' ? 'Anual' : 'Diário'}
           </p>
        </div>
        
        <div className="flex flex-col items-end">
           <span className="text-sm font-black uppercase text-white/60 tracking-widest mb-1">Ofensiva</span>
           <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="text-2xl font-black italic">{habit.streak}</span>
           </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HabitsPage() {
  const { data: habits, isLoading } = useHabits()
  const { data: categories } = useCategories()
  const { data: goals } = useGoals()
  const addHabit = useAddHabit()
  const updateHabit = useUpdateHabit()
  const deleteHabit = useDeleteHabit()
  const addCategory = useAddCategory()

  const searchParams = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isGoalSelectOpen, setIsGoalSelectOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true)
    }
  }, [searchParams])
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    type: 'positive' as 'positive' | 'negative',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    time: '08:00', // Default time
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

  // Novo estado para criação de categoria
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📁', color: '#e02020' })
  const [isParsing, setIsParsing] = useState(false)

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
    
    if (editingHabitId) {
      updateHabit.mutate({
        id: editingHabitId,
        ...newHabit
      }, {
        onSuccess: () => {
          setShowAddModal(false)
          setEditingHabitId(null)
          resetForm()
        }
      })
    } else {
      addHabit.mutate({
        ...newHabit,
        is_archived: false,
        sort_order: (habits?.length || 0) + 1,
      }, {
        onSuccess: () => {
          setShowAddModal(false)
          resetForm()
        }
      })
    }
  }

  const resetForm = () => {
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

  const openEditModal = (habit: Habit) => {
    setNewHabit({
      name: habit.name,
      description: habit.description || '',
      type: habit.type as 'positive' | 'negative',
      start_date: habit.start_date || format(new Date(), 'yyyy-MM-dd'),
      end_date: habit.end_date || '',
      time: habit.time || '08:00',
      recurrence: {
        frequency: habit.recurrence?.frequency || 'daily',
        days_of_week: habit.recurrence?.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        interval: habit.recurrence?.interval || 1
      },
      color: habit.color || '#FF453A',
      emoji: habit.emoji || '',
      category_id: habit.category_id || '',
      linked_goal_id: habit.linked_goal_id || '',
      goal_impact: habit.goal_impact || 1
    })
    setEditingHabitId(habit.id)
    setShowAddModal(true)
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(id)
      const next = isSelected 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
      
      if (next.length === 0) setIsSelectionMode(false)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedIds.length} hábitos?`)) {
      selectedIds.forEach(id => deleteHabit.mutate(id))
      setSelectedIds([])
      setIsSelectionMode(false)
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

  const handleSelectGroup = (type: 'all' | 'positive' | 'negative') => {
    let ids: string[] = []
    if (type === 'all') {
      ids = (habits || []).map(h => h.id)
    } else if (type === 'positive') {
      ids = (habits || []).filter(h => h.type === 'positive').map(h => h.id)
    } else if (type === 'negative') {
      ids = (habits || []).filter(h => h.type === 'negative').map(h => h.id)
    }
    setSelectedIds(ids)
    if (ids.length > 0) setIsSelectionMode(true)
  }

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-10 lg:space-y-14 pb-24 md:pb-10 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display',sans-serif]">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/5 rounded-[24px] flex items-center justify-center border border-white/10 shadow-2xl">
            <Zap className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Meus Hábitos</h1>
            <p className="text-white/60 font-medium text-base md:text-lg italic flex items-center gap-2">
              Construa disciplina com rotinas consistentes.
              <span className="inline-block w-1 h-1 rounded-full bg-white/20 mx-1" />
              <span className="text-white/30 text-xs font-black uppercase tracking-tighter hidden md:inline-block border border-white/5 px-2 py-0.5 rounded-md">Botão direito para selecionar</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black px-5 py-3 md:px-6 md:py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 shadow-xl shrink-0 text-sm md:text-base"
        >
          <Plus size={20} />
          Novo Hábito
        </button>
      </motion.div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-[40px] bg-white/[0.02] border border-white/10 animate-pulse" />
            ))
          ) : (habits || []).map((habit: Habit, idx: number) => (
            <HabitGridItem
              key={habit.id}
              habit={habit}
              idx={idx}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.includes(habit.id)}
              onToggleSelection={toggleSelection}
              onOpenEdit={openEditModal}
              onDelete={(id) => deleteHabit.mutate(id)}
              setIsSelectionMode={setIsSelectionMode}
            />
          ))}
        </AnimatePresence>
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
              className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[40px] md:rounded-[48px] p-4 md:p-7 overflow-y-auto max-h-[90vh] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-4xl font-black tracking-tightest">{editingHabitId ? 'Editar Hábito' : 'Novo Hábito'}</h2>
                <button onClick={() => { setShowAddModal(false); setEditingHabitId(null); resetForm(); }} className="p-3 hover:bg-white/5 rounded-2xl">
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
                      placeholder="Exemplo: Meditação Matinal às 07h segundas e quartas"
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
                        onClick={() => {
                          setNewHabit({ 
                            ...newHabit, 
                            category_id: cat.id,
                            emoji: cat.icon || newHabit.emoji,
                            color: cat.color || newHabit.color
                          })
                        }}
                        className={cn(
                          "px-4 py-3 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          newHabit.category_id === cat.id ? "border-white bg-white/10 text-white" : "bg-white/5 text-white/40 border-white/5"
                        )}
                        style={newHabit.category_id === cat.id ? { borderColor: cat.color } : {}}
                      >
                        <span>{cat.icon}</span>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                      <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Personalização</label>
                  <div className="flex items-center gap-4">
                    <EmojiPicker 
                      value={newHabit.emoji || ''} 
                      onChange={emoji => setNewHabit({ ...newHabit, emoji })} 
                    />
                    <div className="flex-1 grid grid-cols-5 gap-2">
                      {['#FF453A', '#FF9F0A', '#FFD60A', '#32D74B', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#8E8E93', '#FFFFFF'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewHabit({ ...newHabit, color })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            newHabit.color === color ? "border-white scale-110" : "border-transparent opacity-40"
                          )}
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
                      type="button"
                      onClick={() => setNewHabit({ ...newHabit, type: 'positive' })}
                      className={cn(
                        "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                        newHabit.type === 'positive' ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5"
                      )}
                    >
                      <Sparkles size={14} /> Positivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewHabit({ ...newHabit, type: 'negative' })}
                      className={cn(
                        "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                        newHabit.type === 'negative' ? "bg-red-500 text-white border-red-500" : "bg-white/5 text-white/40 border-white/5"
                      )}
                    >
                      <ShieldAlert size={14} /> A evitar
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Vincular a Meta (Opcional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative z-50">
                      <button
                        type="button"
                        onClick={() => setIsGoalSelectOpen(!isGoalSelectOpen)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-white/30 transition-all font-bold text-sm flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2">
                          {newHabit.linked_goal_id ? (
                            <>
                              <span className="text-lg">{goals?.find(g => g.id === newHabit.linked_goal_id)?.emoji}</span>
                              <span className="truncate max-w-[150px]">{goals?.find(g => g.id === newHabit.linked_goal_id)?.title}</span>
                            </>
                          ) : (
                            <span className="text-white/40">Nenhuma Meta</span>
                          )}
                        </span>
                        <ChevronDown size={16} className={cn("text-white/40 group-hover:text-white transition-all transform", isGoalSelectOpen && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {isGoalSelectOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full mt-2 left-0 w-full z-[100] bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] max-h-48 overflow-y-auto custom-scrollbar"
                          >
                            <button
                              type="button"
                              onClick={() => { setNewHabit({ ...newHabit, linked_goal_id: '' }); setIsGoalSelectOpen(false); }}
                              className={cn(
                                "w-full text-left px-5 py-3 text-sm font-bold transition-colors flex items-center gap-3 border-b border-white/5",
                                !newHabit.linked_goal_id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10"><X size={12}/></div>
                              <span>Nenhuma Meta</span>
                            </button>
                            {goals?.filter(g => g.status === 'active').map(goal => (
                              <button
                                key={goal.id}
                                type="button"
                                onClick={() => { setNewHabit({ ...newHabit, linked_goal_id: goal.id }); setIsGoalSelectOpen(false); }}
                                className={cn(
                                  "w-full text-left px-5 py-3 text-sm font-bold transition-colors flex items-center gap-3",
                                  newHabit.linked_goal_id === goal.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                <span className="text-lg">{goal.emoji}</span>
                                <span className="truncate">{goal.title}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Impacto (ex: 1)"
                        value={newHabit.goal_impact}
                        onChange={e => setNewHabit({ ...newHabit, goal_impact: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-white/30 transition-all font-bold text-sm"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase tracking-widest pointer-events-none">Impacto</span>
                    </div>
                  </div>
                </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Repetir</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'daily', label: 'Diário' },
                      { id: 'weekly', label: 'Semanal' },
                      { id: 'monthly', label: 'Mensal' },
                      { id: 'yearly', label: 'Anual' },
                      { id: 'specific_days', label: 'Personalizado' }
                    ].map(freq => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setNewHabit({ 
                          ...newHabit, 
                          recurrence: { 
                            frequency: (freq.id === 'quinzenal' ? 'weekly' : freq.id as RecurrenceFreq), 
                            interval: freq.id === 'quinzenal' ? 2 : 1,
                            days_of_week: freq.id === 'specific_days' ? ((newHabit.recurrence.days_of_week?.length || 0) > 0 ? newHabit.recurrence.days_of_week : [1,2,3,4,5]) : [0,1,2,3,4,5,6]
                          } 
                        })}
                        className={cn(
                          "py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          (newHabit.recurrence.frequency === freq.id || (freq.id === 'quinzenal' && newHabit.recurrence.interval === 2 && newHabit.recurrence.frequency === 'weekly'))
                            ? "bg-white text-black border-white shadow-lg" 
                            : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                        )}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>

                  {newHabit.recurrence.frequency === 'specific_days' && (
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
                              newHabit.recurrence.days_of_week?.includes(i) 
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
                               onClick={() => setNewHabit({ ...newHabit, recurrence: { ...newHabit.recurrence, interval: int } })}
                               className={cn(
                                 "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                 newHabit.recurrence.interval === int ? "bg-white text-black" : "text-white/50 hover:bg-white/5"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-4 pt-1">
                  <CustomDateTimePicker 
                    label="Início" 
                    type="date" 
                    value={newHabit.start_date} 
                    onChange={val => setNewHabit({ ...newHabit, start_date: val })} 
                    direction="up"
                  />
                  <CustomDateTimePicker 
                    label="Fim (Opcional)" 
                    type="date" 
                    value={newHabit.end_date || ''} 
                    onChange={val => setNewHabit({ ...newHabit, end_date: val })} 
                    align="right"
                    direction="up"
                  />
                  <CustomDateTimePicker 
                    label="Hora" 
                    type="time" 
                    value={newHabit.time} 
                    onChange={val => setNewHabit({ ...newHabit, time: val })} 
                    align="right"
                    direction="up"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-black uppercase tracking-widest text-white/50 px-1">Descrição (Opcional)</label>
                  <textarea 
                    value={newHabit.description}
                    onChange={e => setNewHabit({ ...newHabit, description: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3 text-white focus:outline-none focus:border-white/30 transition-all font-medium text-base min-h-[70px] resize-none"
                    placeholder="Adicione um detalhe..."
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={addHabit.isPending || updateHabit.isPending}
                    className="w-full bg-white text-black font-black py-5 rounded-[24px] hover:bg-neutral-200 transition-all active:scale-95 text-lg"
                  >
                    {addHabit.isPending || updateHabit.isPending ? 'Salvando...' : (editingHabitId ? 'Salvar Alterações' : 'Criar Hábito')}
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
                <h2 className="text-2xl font-black tracking-tight">Nova Categoria</h2>
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
                    placeholder="Ex: Saúde, Trabalho..."
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
                      {['#FF453A', '#32D74B', '#0A84FF', '#FF9F0A', '#BF5AF2', '#64D2FF'].map(color => (
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
                        type: 'habits'
                      }, {
                      onSuccess: () => {
                        setShowAddCategoryModal(false)
                        setNewCategory({ name: '', icon: '📁', color: '#0A84FF' })
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
                { label: 'A Evitar', icon: ShieldAlert, onClick: () => handleSelectGroup('negative') },
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
