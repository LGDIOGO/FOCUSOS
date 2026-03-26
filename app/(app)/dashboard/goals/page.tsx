'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, Trash2, Calendar, TrendingUp, Check, ChevronRight, Sparkles } from 'lucide-react'
import { useGoals, useDeleteGoal } from '@/lib/hooks/useGoals'
import { useCategories } from '@/lib/hooks/useCategories'
import { Goal } from '@/types'
import { cn } from '@/lib/utils/cn'
import { GoalModal } from '@/components/dashboard/GoalModal'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
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
      return format(parseISO(dateStr), "dd 'de' MMMM", { locale: ptBR })
    } catch (e) {
      return 'Data inválida'
    }
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
            <Target className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tightest">Metas Estratégicas</h1>
            <p className="text-white/60 font-medium text-base md:text-lg italic flex items-center gap-2">
              Planeje grandes objetivos e acompanhe o progresso.
              <span className="inline-block w-1 h-1 rounded-full bg-white/20 mx-1" />
              <span className="text-white/30 text-xs font-black uppercase tracking-tighter border border-white/5 px-2 py-0.5 rounded-md">Foco no Longo Prazo</span>
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => { setEditingGoal(null); setShowAddModal(true); }}
          className="bg-white text-black px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 shadow-xl shrink-0"
        >
          <Plus size={20} />
          Nova Meta
        </button>
      </motion.div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            [1, 2].map(i => (
              <div key={i} className="h-64 rounded-[40px] bg-white/[0.02] border border-white/10 animate-pulse" />
            ))
          ) : goals?.map((goal: Goal, idx: number) => {
            const daysLeft = getRemainingDays(goal.end_date)
            const category = categories?.find(c => c.id === goal.category_id)

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleOpenEdit(goal)}
                className={cn(
                  "group relative bg-white/[0.02] border rounded-[48px] p-10 hover:bg-white/[0.04] transition-all flex flex-col justify-between overflow-hidden cursor-pointer",
                  goal.priority === 'high' || goal.priority === 'critical' ? "ring-1 ring-white/5" : "border-white/10"
                )}
              >
                {/* Background Glow */}
                <div 
                  className="absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-10 rounded-full"
                  style={{ backgroundColor: goal.color || '#FFFFFF' }}
                />

                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-6">
                      <div 
                        className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-2xl transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${goal.color}15`, color: goal.color }}
                      >
                        {goal.emoji || '🎯'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h3 className="text-2xl font-black text-white">{goal.title}</h3>
                           {goal.priority === 'critical' && <Sparkles size={16} className="text-red-400 animate-pulse" />}
                        </div>
                        <div className="flex items-center gap-2 text-white/30 text-xs font-black uppercase tracking-widest">
                           <span>{category?.name || 'Geral'}</span>
                           <span className="w-1 h-1 rounded-full bg-white/10" />
                           <span style={{ color: goal.priority === 'critical' ? '#FF453A' : goal.priority === 'high' ? '#FF9F0A' : '#FFFFFF' }}>
                             {goal.priority}
                           </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(goal.id, e)}
                      className="p-3 text-white/5 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-widest text-white/20">Progresso Atual</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white italic">{goal.current_value}</span>
                          <span className="text-lg font-bold text-white/40">/ {goal.target_value} {goal.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Status</p>
                        <span className="text-3xl font-black text-white italic">{goal.progress_pct}%</span>
                      </div>
                    </div>

                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${goal.progress_pct}%` }}
                        className="absolute h-full bg-white"
                        style={{ backgroundColor: goal.color }}
                      />
                    </div>
                    
                    {/* Milestones context */}
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20 px-1 pt-1">
                       <span>Início: {goal.initial_value}</span>
                       <div className="flex gap-4">
                          {goal.min_goal_value && <span className="text-white/40">Mínimo: {goal.min_goal_value}</span>}
                          {goal.elite_goal_value && <span className="text-blue-400/60">Elite: {goal.elite_goal_value}</span>}
                       </div>
                       <span>Alvo: {goal.target_value}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-10 flex items-center justify-between border-t border-white/5 mt-8 opacity-60 group-hover:opacity-100 transition-opacity">
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                         <Calendar size={14} className="text-white/40" />
                         <span className="text-xs font-bold text-white/60">
                           Até {formatDateSafely(goal.end_date)}
                         </span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-xs font-black text-white/40 uppercase tracking-widest">
                        {daysLeft} dias restantes
                      </span>
                   </div>
                   <div className="flex items-center gap-2 text-white/40 font-black text-[10px] uppercase tracking-widest group-hover:text-white transition-colors">
                      Detalhes <ChevronRight size={14} />
                   </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {!isLoading && goals?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[48px] space-y-6">
           <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center">
              <Target className="text-white/20 w-10 h-10" />
           </div>
           <div className="text-center space-y-2">
              <h3 className="text-2xl font-black">Nenhuma meta estratégica definida</h3>
              <p className="text-white/40 font-medium">Crie seu primeiro grande objetivo para começar a trilhar o progresso.</p>
           </div>
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
           >
             Começar Agora
           </button>
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditingGoal(null); }}
        editingGoal={editingGoal}
      />
    </div>
  )
}
