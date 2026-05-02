'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, Zap, ShieldAlert, Sparkles, TrendingUp, RefreshCcw, History, ChevronRight, CheckCircle2
} from 'lucide-react'
import { HabitModal } from '@/components/dashboard/HabitModal'
import { useHabits, useDeleteHabit, useHabitsHistory, useLogHabit } from '@/lib/hooks/useHabits'
import { StatusChoiceBubble } from '@/components/dashboard/StatusChoiceBubble'
import { Check, Minus, X, Circle } from 'lucide-react'
import { useCategories } from '@/lib/hooks/useCategories'
import { Habit } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format, isToday, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getEffectiveOfensiva } from '@/lib/utils/scoring'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { SharedHistoryBar, PeriodFilter, DateRange } from '@/components/dashboard/SharedHistoryBar'
import { getDateRangeFromPeriod } from '@/lib/utils/dateFilters'


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
        "group relative bg-[var(--bg-overlay)] border rounded-[24px] md:rounded-[32px] p-4 md:p-6 hover:bg-[var(--bg-overlay)]/80 transition-all flex flex-col justify-between overflow-hidden cursor-pointer h-full transition-colors duration-300",
        isSelected ? "border-red-500/50 bg-red-500/[0.05] ring-1 ring-red-500/20" : "border-[var(--border-subtle)] hover:border-white/10"
      )}
    >


      <div className="relative z-10 flex justify-between items-start">
        <div className="flex items-center gap-2 md:gap-4">
          <div
            className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl shadow-inner transition-transform group-hover:scale-110 shrink-0"
            style={{ backgroundColor: habit.color ? `${habit.color}20` : 'rgba(255,255,255,0.05)', color: habit.color || '#FFFFFF' }}
          >
            {habit.emoji || (habit.type === 'positive' ? <Sparkles size={16} /> : <ShieldAlert size={16} />)}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-sm md:text-xl font-bold text-[var(--text-primary)] transition-colors leading-tight truncate">{habit.name}</h3>
            <p className="text-[var(--text-muted)] text-xs md:text-base font-medium line-clamp-1 italic hidden sm:block">{habit.description || 'Sem descrição'}</p>
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

      <div className="relative z-10 pt-4 md:pt-8 flex items-end justify-between">
        <div className="space-y-1 md:space-y-2">
          <div className="flex gap-0.5 md:gap-1">
            {DAYS.map((label, i) => {
              const isActive = !habit.recurrence ||
                habit.recurrence.frequency === 'daily' ||
                (habit.recurrence.frequency === 'specific_days' && habit.recurrence.days_of_week?.includes(i))
              return (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[8px] md:text-[9px] font-black border transition-all",
                    isActive ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/5"
                  )}
                >
                  {label}
                </div>
              )
            })}
          </div>
          <p className="text-[9px] md:text-[12px] uppercase tracking-widest font-black text-white/20">
            {habit.recurrence?.frequency === 'specific_days' ? 'Custom' :
             habit.recurrence?.frequency === 'weekly' ? 'Semanal' :
             habit.recurrence?.frequency === 'monthly' ? 'Mensal' :
             habit.recurrence?.frequency === 'yearly' ? 'Anual' : 'Diário'}
          </p>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] md:text-sm font-black uppercase text-[var(--text-muted)] tracking-widest mb-0.5">Ofensiva</span>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-base md:text-xl">🔥</span>
            <span className="text-xl md:text-2xl font-black italic text-[var(--text-primary)]">{activeOfensiva}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HabitsPage() {
  const searchParams = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [summaryFilter, setSummaryFilter] = useState<'all' | 'daily' | 'other'>('all')

  // Filtros Globais do Histórico
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('last_month')
  const [customRange, setCustomRange] = useState<DateRange>({ start: '', end: '' })
  
  const resolvedDateRange = useMemo(() => {
    return getDateRangeFromPeriod(periodFilter, customRange)
  }, [periodFilter, customRange])

  const [activeBubble, setActiveBubble] = useState<{
    habitId: string
    logDate: string
    position: { x: number; y: number }
  } | null>(null)

  const { data: habits, isLoading } = useHabits()
  const deleteHabit = useDeleteHabit()
  const logHabit = useLogHabit()
  const { data: historyLogs } = useHabitsHistory(resolvedDateRange.start, resolvedDateRange.end)
  const { data: categories } = useCategories()

  const groupedHabits = useMemo(() => {
    if (!habits) return []
    const MAP = new Map<string, Habit[]>()

    // Sort all habits by streak (desc) then frequency
    const sorted = [...habits].sort((a, b) => {
      const streakA = a.streak || 0
      const streakB = b.streak || 0
      if (streakB !== streakA) return streakB - streakA
      
      const freqA = a.recurrence?.frequency || 'daily'
      const freqB = b.recurrence?.frequency || 'daily'
      if (freqA === 'daily' && freqB !== 'daily') return -1
      if (freqB === 'daily' && freqA !== 'daily') return 1
      return 0
    })

    sorted.forEach(h => {
      const cid = h.category_id || 'UNCATEGORIZED'
      if (!MAP.has(cid)) MAP.set(cid, [])
      MAP.get(cid)?.push(h)
    })

    return Array.from(MAP.entries()).map(([categoryId, items]) => ({
      categoryId,
      category: categories?.find(c => c.id === categoryId),
      items
    })).sort((a, b) => {
      if (a.categoryId === 'UNCATEGORIZED') return 1
      if (b.categoryId === 'UNCATEGORIZED') return -1
      return (a.category?.name || '').localeCompare(b.category?.name || '')
    })
  }, [habits, categories])

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

  const groupedHistory = useMemo(() => {
    if (!historyLogs || !habits) return []
    const MAP = new Map<string, any[]>()
    
    // Logs are already filtered by date via hook useHabitsHistory
    const sortedLogs = [...historyLogs]
      .sort((a, b) => b.log_date.localeCompare(a.log_date))
    
    sortedLogs.forEach(log => {
      const h = habits.find(h => h.id === log.habit_id)
      if (!h) return
      if (!MAP.has(log.log_date)) MAP.set(log.log_date, [])
      MAP.get(log.log_date)?.push({ ...log, habit: h })
    })
    
    return Array.from(MAP.entries()).map(([date, items]) => ({ date, items }))
  }, [historyLogs, habits])

  return (
    <div className="p-4 md:p-10 lg:p-14 max-w-7xl mx-auto space-y-6 md:space-y-10 lg:space-y-14 pb-24 lg:pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-[var(--bg-overlay)] rounded-[16px] md:rounded-[24px] flex items-center justify-center border border-[var(--border-subtle)] shadow-2xl shrink-0">
            <RefreshCcw className="text-[var(--text-primary)] w-5 h-5 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-5xl font-black tracking-tightest text-[var(--text-primary)]">Meus Hábitos</h1>
            <p className="text-[var(--text-secondary)] font-medium text-sm md:text-lg italic hidden sm:block">
              Construa disciplina com rotinas consistentes.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2.5 md:px-6 md:py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl shrink-0 text-sm md:text-base"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Novo Hábito</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </motion.div>

      {/* Habits Grid by Category */}
      <div className="space-y-16">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 rounded-[40px] bg-white/[0.02] border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : groupedHabits.map((group, groupIdx) => (
            <motion.div key={group.categoryId} layout className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" 
                   style={{ backgroundColor: group.category?.color || '#FFFFFF', color: group.category?.color || '#FFFFFF' }} 
                />
                <h2 className="text-sm font-black tracking-widest text-white/50 uppercase">{group.category?.name || 'Sem Categoria'}</h2>
                <span className="text-white/20 text-xs font-black uppercase tracking-widest">{group.items.length} {group.items.length === 1 ? 'Hábito' : 'Hábitos'}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                {group.items.map((habit: Habit, idx: number) => (
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
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HISTÓRICO EXPANSÍVEL (HABITS) */}
      {/* HISTÓRICO EXPANSÍVEL (HÁBITOS) */}
      <SharedHistoryBar
        icon={History}
        title="Histórico de Hábitos Concluídos"
        subtitle={periodFilter === 'custom' ? 'Período Personalizado' : 'Métricas dos seus hábitos'}
        badgeText={`${historyLogs?.length || 0} Registros`}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
        filterValue={periodFilter}
        onFilterChange={setPeriodFilter}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      >
        <div className="pt-2 pb-4 space-y-8 md:pl-4">
                 {groupedHistory.length === 0 ? (
                    <div className="text-[var(--text-muted)] text-sm font-medium pt-4">Nenhum hábito concluído neste período.</div>
                 ) : (
                   groupedHistory.map(group => (
                     <div key={group.date} className="relative space-y-4">
                        <div className="absolute -left-12 top-1.5 w-3 h-3 rounded-full bg-[var(--border-subtle)] border-2 border-[var(--bg-primary)] z-10" />
                        <div className="absolute -left-10.5 top-3 w-px h-full bg-[var(--border-subtle)] -translate-x-[5px]" />
                        
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                          {format(parseISO(group.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </h4>
                        
                        <div className="space-y-2">
                           {group.items.map((item, i) => {
                             const statusColor = item.status === 'partial'
                               ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                               : 'bg-green-500/10 text-green-500 border-green-500/20'
                             return (
                               <button
                                 key={i}
                                 onClick={(e) => setActiveBubble({ habitId: item.habit_id, logDate: item.log_date, position: { x: e.clientX, y: e.clientY } })}
                                 className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl w-fit pr-8 hover:border-white/20 hover:bg-white/5 transition-all group text-left"
                               >
                                 <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${statusColor}`}>
                                   {item.status === 'partial'
                                     ? <Minus size={12} strokeWidth={3} />
                                     : <Check size={12} strokeWidth={3} />}
                                 </div>
                                 <div>
                                   <span className="text-sm font-bold text-[var(--text-primary)]">{item.habit.name}</span>
                                   {item.note && <span className="text-[10px] text-[var(--text-muted)] ml-2 italic">&quot;{item.note}&quot;</span>}
                                 </div>
                               </button>
                             )
                           })}
                        </div>
                     </div>
                   ))
                  )}
              </div>
      </SharedHistoryBar>

      <HabitModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setHabitToEdit(null)
        }}
        habitToEdit={habitToEdit}
      />

      {activeBubble && (
        <StatusChoiceBubble
          isOpen={true}
          onClose={() => setActiveBubble(null)}
          options={[
            { id: 'done',    label: 'Concluído', icon: Check,  color: 'text-green-400', bg: 'hover:bg-green-500/10' },
            { id: 'partial', label: 'Parcial',   icon: Minus,  color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
            { id: 'failed',  label: 'Falhou',    icon: X,      color: 'text-red-500',   bg: 'hover:bg-red-500/10' },
            { id: 'none',    label: 'Limpar',    icon: Circle, color: 'text-white/20',  bg: 'hover:bg-white/5' },
          ]}
          position={activeBubble.position}
          onSelect={(status) => {
            logHabit.mutate({ habitId: activeBubble.habitId, status, logDate: activeBubble.logDate })
            setActiveBubble(null)
          }}
        />
      )}

      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            key="sel-bar-habits"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[10000] pointer-events-none flex items-end justify-center lg:pl-64 pb-[calc(env(safe-area-inset-bottom)+88px)] lg:pb-10 px-3 lg:px-8"
          >
            <div className="pointer-events-auto w-full md:w-auto max-w-2xl bg-[var(--bg-primary)]/95 backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[28px] md:rounded-[36px] px-4 md:px-8 py-3.5 md:py-4 flex items-center gap-3 md:gap-5 shadow-2xl ring-1 ring-[var(--text-primary)]/5">
              {/* Count */}
              <div className="flex flex-col items-center justify-center min-w-[48px] md:min-w-[60px]">
                <span className="text-xl md:text-2xl font-black text-[var(--text-primary)] leading-none">{selectedIds.length}</span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-0.5">Itens</span>
              </div>

              <div className="h-8 w-px bg-[var(--border-subtle)] flex-shrink-0" />

              {/* Group selectors */}
              <div className="flex items-center gap-2 md:gap-3 flex-1 justify-center">
                {[
                  { label: 'Tudo', icon: Zap, onClick: () => handleSelectGroup('all') },
                  { label: 'Hábitos', icon: TrendingUp, onClick: () => handleSelectGroup('positive') },
                  { label: 'A Evitar', icon: ShieldAlert, onClick: () => handleSelectGroup('negative') },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className="flex flex-col items-center gap-1 group/sel"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center border border-[var(--border-subtle)] group-hover/sel:bg-[var(--text-primary)] group-hover/sel:text-[var(--bg-primary)] text-[var(--text-muted)] group-hover/sel:border-transparent transition-all duration-200">
                      <btn.icon size={16} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover/sel:text-[var(--text-primary)] transition-colors hidden md:block whitespace-nowrap">
                      {btn.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="h-8 w-px bg-[var(--border-subtle)] flex-shrink-0" />

              {/* Actions */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0}
                  className="flex flex-col items-center gap-1 group/del disabled:opacity-20"
                >
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover/del:bg-red-500 group-hover/del:text-white text-red-500 transition-all duration-200">
                    <Trash2 size={16} />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-400/60 hidden md:block whitespace-nowrap">Excluir</span>
                </button>

                <button
                  onClick={() => { setIsSelectionMode(false); setSelectedIds([]) }}
                  className="h-10 px-4 md:px-6 bg-[var(--bg-overlay)] hover:bg-[var(--text-primary)] text-[var(--text-primary)] hover:text-[var(--bg-primary)] rounded-2xl font-black uppercase tracking-[0.12em] text-[9px] md:text-[10px] transition-all duration-200 whitespace-nowrap border border-[var(--border-subtle)] hover:border-transparent"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
