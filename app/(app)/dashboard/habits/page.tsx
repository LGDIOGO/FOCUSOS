'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, Zap, ShieldAlert, Sparkles, TrendingUp
} from 'lucide-react'
import { HabitModal } from '@/components/dashboard/HabitModal'
import { useHabits, useDeleteHabit } from '@/lib/hooks/useHabits'
import { Habit } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getEffectiveOfensiva } from '@/lib/utils/scoring'
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
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const activeOfensiva = getEffectiveOfensiva(habit.streak || 0, habit.last_completed_date, habit.status, todayStr)

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
        "group relative bg-[var(--bg-overlay)] border rounded-[40px] p-8 hover:bg-[var(--bg-overlay)]/80 transition-all flex flex-col justify-between overflow-hidden cursor-pointer h-full transition-colors duration-300",
        isSelected ? "border-red-500/50 bg-red-500/[0.08] ring-1 ring-red-500/20 shadow-[0_0_20px_rgba(224,32,32,0.1)]" : "border-[var(--border-subtle)]"
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
            <h3 className="text-xl font-bold text-[var(--text-primary)] transition-colors">{habit.name}</h3>
            <p className="text-[var(--text-muted)] text-base font-medium line-clamp-1 italic">{habit.description || 'Sem descrição'}</p>
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
           <span className="text-sm font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Ofensiva</span>
           <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="text-2xl font-black italic text-[var(--text-primary)]">{activeOfensiva}</span>
           </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HabitsPage() {
  const { data: habits, isLoading } = useHabits()
  const deleteHabit = useDeleteHabit()

  const searchParams = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true)
    }
  }, [searchParams])

  const openEditModal = (habit: Habit) => {
    setHabitToEdit(habit)
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
          <div className="w-16 h-16 bg-[var(--bg-overlay)] rounded-[24px] flex items-center justify-center border border-[var(--border-subtle)] shadow-2xl">
            <Zap className="text-[var(--text-primary)] w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tightest text-[var(--text-primary)]">Meus Hábitos</h1>
            <p className="text-[var(--text-secondary)] font-medium text-base md:text-lg italic flex items-center gap-2">
              Construa disciplina com rotinas consistentes.
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)]/20 mx-1" />
              <span className="text-[var(--text-muted)] text-xs font-black uppercase tracking-tighter hidden md:inline-block border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">Botão direito para selecionar</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-3 md:px-6 md:py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl shrink-0 text-sm md:text-base"
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

      <HabitModal 
        isOpen={showAddModal} 
        onClose={() => {
          setShowAddModal(false)
          setHabitToEdit(null)
        }} 
        habitToEdit={habitToEdit} 
      />

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-[var(--bg-primary)]/90 backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[40px] px-10 py-5 flex items-center gap-10 shadow-2xl ring-1 ring-[var(--text-primary)]/5"
          >
            <div className="flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-3xl font-black text-[var(--text-primary)] leading-none">{selectedIds.length}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1">Itens</span>
            </div>

            <div className="h-12 w-px bg-[var(--border-subtle)]" />

            <div className="flex items-center gap-6">
              {[
                { label: 'Tudo', icon: Zap, onClick: () => handleSelectGroup('all') },
                { label: 'Hábitos', icon: TrendingUp, onClick: () => handleSelectGroup('positive') },
                { label: 'A Evitar', icon: ShieldAlert, onClick: () => handleSelectGroup('negative') },
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={btn.onClick}
                  className="relative flex flex-col items-center group/sel pt-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center border border-[var(--border-subtle)] group-hover/sel:bg-[var(--text-primary)] group-hover/sel:text-[var(--bg-primary)] transition-all duration-300">
                    <btn.icon size={20} />
                  </div>
                  <span className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-0 group-hover/sel:opacity-100 transition-all pointer-events-none whitespace-nowrap">
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
                className="bg-[var(--bg-overlay)] hover:bg-[var(--text-primary)] text-[var(--text-primary)] hover:text-[var(--bg-primary)] px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] transition-all border border-[var(--border-subtle)]"
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
