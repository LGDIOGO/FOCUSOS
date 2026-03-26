'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Calendar, BarChart3, ChevronRight, Sparkles, AlertCircle } from 'lucide-react'
import { EmojiPicker } from '@/components/dashboard/EmojiPicker'
import { CustomDateTimePicker } from '@/components/dashboard/CustomDateTimePicker'
import { useAddGoal, useUpdateGoal } from '@/lib/hooks/useGoals'
import { useCategories } from '@/lib/hooks/useCategories'
import { Goal, TaskPriority } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  editingGoal?: Goal | null
}

const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Baixa', color: '#8E8E93' },
  { id: 'medium', label: 'Média', color: '#FFD60A' },
  { id: 'high', label: 'Alta', color: '#FF9F0A' },
  { id: 'critical', label: 'Crítica', color: '#FF453A' },
]

export function GoalModal({ isOpen, onClose, editingGoal }: GoalModalProps) {
  const { data: categories } = useCategories()
  const addGoal = useAddGoal()
  const updateGoal = useUpdateGoal()

  const [formData, setFormData] = useState<Partial<Goal>>({
    title: '',
    description: '',
    emoji: '🎯',
    color: '#0A84FF',
    priority: 'medium',
    status: 'active',
    current_value: 0,
    target_value: 100,
    initial_value: 0,
    progress_pct: 0,
    unit: 'vezes',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd'),
    term: 'annual',
  })

  useEffect(() => {
    if (editingGoal) {
      setFormData(editingGoal)
    } else {
      setFormData({
        title: '',
        description: '',
        emoji: '🎯',
        color: '#0A84FF',
        priority: 'medium',
        status: 'active',
        current_value: 0,
        target_value: 100,
        initial_value: 0,
        progress_pct: 0,
        unit: 'vezes',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd'),
        term: 'annual',
      })
    }
  }, [editingGoal, isOpen])

  useEffect(() => {
    const total = (formData.target_value || 0) - (formData.initial_value || 0)
    const current = (formData.current_value || 0) - (formData.initial_value || 0)
    
    if (total > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)))
      if (pct !== formData.progress_pct) {
        setFormData(prev => ({ ...prev, progress_pct: pct }))
      }
    }
  }, [formData.current_value, formData.target_value, formData.initial_value])

  const handleSliderChange = (pct: number) => {
    const totalContent = (formData.target_value || 0) - (formData.initial_value || 0)
    const newValue = (formData.initial_value || 0) + Math.round((pct / 100) * totalContent)
    
    setFormData(prev => ({ 
      ...prev, 
      progress_pct: Math.min(100, Math.max(0, pct)),
      current_value: newValue
    }))
  }

  const handlePercentageInputChange = (val: string) => {
    const pct = parseInt(val) || 0
    const clampedPct = Math.min(100, Math.max(0, pct))
    const totalContent = (formData.target_value || 0) - (formData.initial_value || 0)
    const newValue = (formData.initial_value || 0) + Math.round((clampedPct / 100) * totalContent)

    setFormData(prev => ({ 
      ...prev, 
      progress_pct: clampedPct,
      current_value: newValue
    }))
  }

  const calculateMilestones = () => {
    const target = formData.target_value || 0
    if (target === 0) return null

    const minRaw = target * 0.8
    const min = minRaw > 10 ? Math.floor(minRaw / 5) * 5 : Math.floor(minRaw)
    
    const eliteRaw = target * 1.2
    const elite = eliteRaw > 10 ? Math.ceil(eliteRaw / 5) * 5 : Math.ceil(eliteRaw)

    setFormData(prev => ({
      ...prev,
      min_goal_value: min,
      elite_goal_value: elite
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = formData as Goal
    
    if (editingGoal) {
      updateGoal.mutate(data, { onSuccess: onClose })
    } else {
      addGoal.mutate(data as any, { onSuccess: onClose })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-xl bg-[#0A0A0A] border border-white/10 rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
              <Target className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tightest leading-none">
                {editingGoal ? 'Editar Meta' : 'Nova Meta'}
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1">Planejamento Estratégico</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X className="text-white/40" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 pt-0 space-y-4 custom-scrollbar">
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Título do Objetivo</label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white text-lg font-bold focus:outline-none focus:border-white/30 transition-all placeholder:text-white/10"
              placeholder="Ex: Treinar Musculação"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Descrição / Motivação</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-white/10 min-h-[60px] resize-none"
              placeholder="Por que isso é importante?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Ícone & Personalização</label>
              <div className="flex gap-3 items-center">
                <EmojiPicker value={formData.emoji || ''} onChange={emoji => setFormData({ ...formData, emoji })} />
                <div className="flex-1 grid grid-cols-5 gap-1">
                   {['#0A84FF', '#32D74B', '#FFD60A', '#FF9F0A', '#FF453A'].map(color => (
                     <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all",
                          formData.color === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-30"
                        )}
                        style={{ backgroundColor: color }}
                     />
                   ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Categoria</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category_id: '' })}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all",
                    !formData.category_id ? "bg-white text-black border-white" : "bg-white/5 text-white/30 border-white/5"
                  )}
                >
                  Nenhuma
                </button>
                {categories?.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category_id: cat.id })}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      formData.category_id === cat.id ? "bg-white/10 text-white border-white" : "bg-white/5 text-white/30 border-white/5"
                    )}
                    style={formData.category_id === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Inicial</label>
              <input 
                type="number"
                value={formData.initial_value}
                onChange={e => setFormData({ ...formData, initial_value: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2.5 text-white/60 font-bold text-center focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Valor Atual</label>
              <input 
                type="number"
                value={formData.current_value}
                onChange={e => setFormData({ ...formData, current_value: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2.5 text-white font-black text-center focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Alvo Total</label>
              <input 
                type="number"
                value={formData.target_value}
                onChange={e => setFormData({ ...formData, target_value: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2.5 text-white font-bold text-center focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Unidade</label>
              <input 
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2.5 text-white font-bold text-center focus:outline-none focus:border-white/30 transition-all"
                placeholder="Ex: vezes"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Progresso Visual</label>
              <div className="flex items-baseline gap-1 group/pct border-b border-white/10 focus-within:border-white/30 transition-all pb-0.5">
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress_pct}
                  onChange={e => handlePercentageInputChange(e.target.value)}
                  className="bg-transparent border-none text-right text-2xl font-black text-white italic w-14 focus:outline-none group-hover/pct:text-blue-400 transition-colors leading-none"
                />
                <span className="text-xl font-black text-white/40 italic">%</span>
              </div>
            </div>
            
            <div 
              className="relative h-6 bg-white/5 rounded-full border border-white/10 cursor-pointer flex items-center group mb-2"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const pct = Math.round((x / rect.width) * 100)
                handleSliderChange(pct)
              }}
            >
              {/* Fill layer */}
              <motion.div 
                className="absolute top-0 left-0 h-full bg-white/20"
                initial={false}
                animate={{ width: `${formData.progress_pct}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              />
              
              {/* Interactive Handle (Thumb) */}
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)] z-20 pointer-events-none"
                initial={false}
                animate={{ left: `${formData.progress_pct}%`, x: `-${formData.progress_pct}%` }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />

              <input 
                type="range" 
                min="0" 
                max="100" 
                value={formData.progress_pct || 0}
                onChange={e => handleSliderChange(parseInt(e.target.value))}
                onClick={e => e.stopPropagation()} 
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Análise por IA</span>
              </div>
              <button 
                type="button"
                onClick={calculateMilestones}
                className="text-[11px] font-black uppercase tracking-tighter text-blue-400 hover:text-blue-300 transition-colors"
              >
                Gerar Sugestões
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 border border-white/5 p-3.5 rounded-xl space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Meta Mínima</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-xl font-black text-white/70">{formData.min_goal_value || '--'}</span>
                  <span className="text-[10px] text-white/20 mb-1 font-black italic">{formData.unit}</span>
                </div>
              </div>
              <div className="bg-black/20 border border-white/5 p-3.5 rounded-xl space-y-1 ring-1 ring-blue-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400/40">Meta Elite</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-black text-white">{formData.elite_goal_value || '--'}</span>
                  <span className="text-[10px] text-white/30 mb-1.5 font-black italic">{formData.unit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomDateTimePicker 
              label="Data de Início" 
              type="date" 
              value={formData.start_date || ''} 
              onChange={val => setFormData({ ...formData, start_date: val })}
              direction="up"
            />
            <CustomDateTimePicker 
              label="Data Final (Prazo)" 
              type="date" 
              value={formData.end_date || ''} 
              onChange={val => setFormData({ ...formData, end_date: val })}
              align="right"
              direction="up"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/30 px-1">Prioridade Especial</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p.id })}
                  className={cn(
                    "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                    formData.priority === p.id 
                      ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                      : "bg-white/5 text-white/30 border-white/5 hover:bg-white/10"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 pb-4">
            <button 
              type="submit"
              disabled={addGoal.isPending || updateGoal.isPending}
              className="w-full bg-white text-black font-black py-4 rounded-[20px] hover:bg-neutral-200 transition-all active:scale-95 text-lg flex items-center justify-center gap-2 group shadow-2xl shadow-white/5"
            >
              {addGoal.isPending || updateGoal.isPending ? 'Salvando...' : (
                <>
                  {editingGoal ? 'Salvar Alterações' : 'Criar Meta Estratérgica'}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
