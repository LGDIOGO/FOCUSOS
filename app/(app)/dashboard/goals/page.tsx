'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, Trash2, Calendar, TrendingUp, Check, ChevronRight, Sparkles, Zap } from 'lucide-react'
import { useGoals, useDeleteGoal } from '@/lib/hooks/useGoals'
import { useCategories } from '@/lib/hooks/useCategories'
import { Goal } from '@/types'
import { cn } from '@/lib/utils/cn'
import { GoalModal } from '@/components/dashboard/GoalModal'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLongPress } from '@/lib/hooks/useLongPress'

const PRIORITY_MAP: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
}

function GoalGridItem({ 
  goal, 
  idx, 
  category,
  daysLeft,
  isSelectionMode, 
  isSelected, 
  onToggleSelection, 
  onOpenEdit, 
  onDelete,
  setIsSelectionMode,
  formatDateSafely
}: {
  goal: Goal
  idx: number
  category?: any
  daysLeft: number
  isSelectionMode: boolean
  isSelected: boolean
  onToggleSelection: (id: string) => void
  onOpenEdit: (goal: Goal) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  setIsSelectionMode: (val: boolean) => void
  formatDateSafely: (date?: string) => string
}) {
  const longPress = useLongPress(
    () => {
      setIsSelectionMode(true)
      onToggleSelection(goal.id)
    },
    () => {},
    { delay: 500 }
  )

  const pct = goal.progress_pct || 0
  const isCompleted = pct >= 100
  const isHalfway = pct >= 50 && !isCompleted

  // Dynamic accent color based on progress
  const accentColor = isCompleted ? '#32D74B' : isHalfway ? '#FF9F0A' : (goal.color || '#FFFFFF')
  const progressBg = isCompleted 
    ? 'rgba(50,215,75,0.08)' 
    : isHalfway 
    ? 'rgba(255,159,10,0.06)' 
    : 'transparent'
  const progressBorder = isCompleted 
    ? 'rgba(50,215,75,0.35)' 
    : isHalfway 
    ? 'rgba(255,159,10,0.25)' 
    : undefined

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.05 }}
      {...longPress}
      onClick={() => {
        if (isSelectionMode) {
          onToggleSelection(goal.id)
        } else {
          onOpenEdit(goal)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        setIsSelectionMode(true)
        onToggleSelection(goal.id)
      }}
      className={cn(
        "group relative rounded-[48px] p-10 transition-all flex flex-col justify-between overflow-hidden cursor-pointer border",
        isSelected
          ? "border-red-500/50 bg-red-500/[0.08] ring-1 ring-red-500/20 shadow-[0_0_20px_rgba(255,69,58,0.1)]"
          : isCompleted
          ? "ring-2 ring-green-500/40 shadow-[0_0_30px_rgba(50,215,75,0.15)]"
          : "border-[var(--border-subtle)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)]"
      )}
      style={{
        backgroundColor: isSelected ? undefined : progressBg,
        borderColor: isSelected ? undefined : (progressBorder || 'var(--border-subtle)'),
      }}
    >

      {/* Background Glow */}
      <div 
        className="absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-10 rounded-full pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Completed Badge */}
      {isCompleted && (
        <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/15 border border-green-500/30 text-green-500">
          <Check size={10} strokeWidth={3} />
          Concluído
        </div>
      )}

      <div className="relative z-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div 
              className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-2xl transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              {goal.emoji || '🎯'}
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-[var(--text-primary)]">{goal.title}</h3>
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-black uppercase tracking-widest">
                 <span className={cn(!category?.name && "opacity-50")}>{category?.name || 'Nenhuma'}</span>
                 <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                 <span style={{ color: String(goal.priority).toLowerCase() === 'critical' ? '#FF453A' : String(goal.priority).toLowerCase() === 'high' ? '#FF9F0A' : 'var(--text-muted)' }}>
                   {PRIORITY_MAP[String(goal.priority).toLowerCase() || 'medium'] || goal.priority}
                 </span>
              </div>
            </div>
          </div>
          {!isSelectionMode && (
            <button 
              onClick={(e) => onDelete(goal.id, e)}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="p-3 text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Progresso Atual</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-[var(--text-primary)] italic">{goal.current_value}</span>
                <span className="text-lg font-bold text-[var(--text-secondary)]">/ {goal.target_value} {goal.unit}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Status</p>
              <span 
                className="text-3xl font-black italic"
                style={{ color: accentColor }}
              >{goal.progress_pct}%</span>
            </div>
          </div>

          <div className="relative h-3 bg-[var(--bg-overlay)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress_pct}%` }}
              className="absolute h-full rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          
          {/* Milestones context */}
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1 pt-1">
             <span>Início: {goal.initial_value}</span>
             <div className="flex gap-4">
                {goal.min_goal_value && <span className="text-[var(--text-secondary)]">Mínimo: {goal.min_goal_value}</span>}
                {goal.elite_goal_value && <span className="text-red-400/80">Elite: {goal.elite_goal_value}</span>}
             </div>
             <span>Alvo: {goal.target_value}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-10 flex items-center justify-between border-t border-[var(--border-subtle)] mt-8 opacity-70 group-hover:opacity-100 transition-opacity">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Calendar size={14} className="text-[var(--text-muted)]" />
               <span className="text-xs font-bold text-[var(--text-secondary)]">
                 Até {formatDateSafely(goal.end_date)}
               </span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
            <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
              {daysLeft} dias restantes
            </span>
         </div>
         <div className="flex items-center gap-2 text-[var(--text-muted)] font-black text-[10px] uppercase tracking-widest group-hover:text-[var(--text-primary)] transition-colors">
            Detalhes <ChevronRight size={14} />
         </div>
      </div>
    </motion.div>
  )
}

export default function GoalsPage() {
  const { data: goals, isLoading, error: goalsError } = useGoals()
  const deleteGoal = useDeleteGoal()
  const { data: categories } = useCategories()

  if (goalsError) console.error('Goals Error:', goalsError)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setShowAddModal(true)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Tem certeza que deseja excluir esta meta estratégica?')) {
      deleteGoal.mutate(id)
    }
  }

  const handleSelectGroup = (type: 'all') => {
    let ids: string[] = []
    if (type === 'all') {
      ids = (goals || []).map(h => h.id)
    }
    setSelectedIds(ids)
    if (ids.length > 0) setIsSelectionMode(true)
  }

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedIds.length} metas estratégicas?`)) {
      selectedIds.forEach(id => deleteGoal.mutate(id))
      setSelectedIds([])
      setIsSelectionMode(false)
    }
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

  const getRemainingDays = (endDate?: string) => {
    if (!endDate) return 0
    try {
      const days = differenceInDays(parseISO(endDate), new Date())
      return days > 0 ? days : 0
    } catch (e) {
      return 0
    }
  }

  const formatDateSafely = (dateStr?: string) => {
    if (!dateStr) return 'Não definida'
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch (e) {
      return 'Data inválida'
    }
  }

  const groupedGoals = useMemo(() => {
    if (!goals) return []
    const MAP = new Map<string, Goal[]>()
    
    // Sort goals by end_date ascending
    const sortedGoals = [...goals].sort((a, b) => {
      const dateA = a.end_date || '9999-12-31'
      const dateB = b.end_date || '9999-12-31'
      return dateA.localeCompare(dateB)
    })

    sortedGoals.forEach(g => {
      const cid = g.category_id || 'UNCATEGORIZED'
      if (!MAP.has(cid)) MAP.set(cid, [])
      MAP.get(cid)?.push(g)
    })
    
    return Array.from(MAP.entries()).map(([categoryId, items]) => {
      return {
        categoryId,
        category: categories?.find(c => c.id === categoryId),
        items
      }
    }).sort((a, b) => {
      if (a.categoryId === 'UNCATEGORIZED') return 1
      if (b.categoryId === 'UNCATEGORIZED') return -1
      return (a.category?.name || '').localeCompare(b.category?.name || '')
    })
  }, [goals, categories])

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
            <Target className="text-[var(--text-primary)] w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tightest text-[var(--text-primary)]">Metas Estratégicas</h1>
            <p className="text-[var(--text-secondary)] font-medium text-base md:text-lg italic flex items-center gap-2">
              Planeje grandes objetivos e acompanhe o progresso.
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--border-subtle)] mx-1" />
              <span className="text-[var(--text-muted)] text-xs font-black uppercase tracking-tighter border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">Foco no Longo Prazo</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => { setEditingGoal(null); setShowAddModal(true); }}
          className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-xl shrink-0"
        >
          <Plus size={20} />
          Nova Meta
        </button>
      </motion.div>

      {/* Goals Grid by Categories */}
      <div className="space-y-16">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
               {[1, 2].map(i => (
             <div key={i} className="h-64 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] animate-pulse" />
               ))}
            </div>
          ) : groupedGoals.map((group, groupIdx) => {
             const categoryName = group.category ? group.category.name : 'Sem Categoria'
             const categoryColor = group.category ? group.category.color : '#FFFFFF'

             return (
               <motion.div 
                 key={group.categoryId}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-6"
               >
                 <div className="flex items-center gap-3 px-2">
                   <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: categoryColor, color: categoryColor }} />
                   <h2 className="text-xl font-bold tracking-tight text-white/80">{categoryName}</h2>
                   <span className="text-white/20 text-xs font-black uppercase tracking-widest">{group.items.length} {group.items.length === 1 ? 'Meta' : 'Metas'}</span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                   {group.items.map((goal: Goal, idx: number) => {
                     const daysLeft = getRemainingDays(goal.end_date)
                     return (
                       <GoalGridItem
                         key={goal.id}
                         goal={goal}
                         idx={idx}
                         category={group.category}
                         daysLeft={daysLeft}
                         isSelectionMode={isSelectionMode}
                         isSelected={selectedIds.includes(goal.id)}
                         onToggleSelection={toggleSelection}
                         onOpenEdit={handleOpenEdit}
                         onDelete={handleDelete}
                         setIsSelectionMode={setIsSelectionMode}
                         formatDateSafely={formatDateSafely}
                       />
                     )
                   })}
                 </div>
               </motion.div>
             )
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {!isLoading && goals?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-overlay)] border border-dashed border-[var(--border-subtle)] rounded-[48px] space-y-6">
           <div className="w-20 h-20 bg-[var(--bg-overlay)] rounded-[32px] flex items-center justify-center border border-[var(--border-subtle)]">
              <Target className="text-[var(--text-muted)] w-10 h-10" />
           </div>
           <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-[var(--text-primary)]">Nenhuma meta estratégica definida</h3>
              <p className="text-[var(--text-muted)] font-medium">Crie seu primeiro grande objetivo para começar a trilhar o progresso.</p>
           </div>
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-[var(--bg-overlay)] hover:opacity-80 text-[var(--text-primary)] border border-[var(--border-subtle)] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
           >
             Começar Agora
           </button>
        </div>
      )}

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

      {/* Goal Modal */}
      <GoalModal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditingGoal(null); }}
        editingGoal={editingGoal}
      />
    </div>
  )
}
