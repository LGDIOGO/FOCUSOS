'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Loader2, RefreshCw, MessageCircle, X } from 'lucide-react'
import { useHabits, useAddHabit } from '@/lib/hooks/useHabits'
import { useTasks } from '@/lib/hooks/useTasks'
import { useGoals } from '@/lib/hooks/useGoals'
import { InsightActionCard } from '@/components/dashboard/InsightActionCard'
import AIChatOnboarding from '@/components/dashboard/AIChatOnboarding'

export default function InsightsPage() {
  const { data: habits = [] } = useHabits()
  const { data: tasks = [] } = useTasks()
  const { data: goals = [] } = useGoals()
  
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [initialChatMsg, setInitialChatMsg] = useState('')

  const fetchDeepInsights = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userData: { habits, tasks, goals } 
        })
      })
      const data = await resp.json()
      setInsights(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch deep insights:', err)
    } finally {
      setLoading(false)
    }
  }, [habits, tasks, goals])

  useEffect(() => {
    if (habits.length > 0 || tasks.length > 0 || goals.length > 0) {
      fetchDeepInsights()
    }
  }, [fetchDeepInsights, habits.length, tasks.length, goals.length])

  const handleDiscuss = (insight: any) => {
    setInitialChatMsg(`Gostaria de falar sobre o insight: "${insight.title}". ${insight.body}`)
    setIsChatOpen(true)
  }

  const { mutate: addHabit } = useAddHabit()

  const handleAction = async (action: any) => {
    console.log('Executando ação:', action)
    
    if (action.type === 'create_habit') {
      try {
        await addHabit({
          ...action.payload,
          color: action.payload.color || '#e02020',
          emoji: action.payload.emoji || '🎯',
          type: 'positive',
          is_archived: false,
          sort_order: habits.length
        })
        // Feedback visual
        setInitialChatMsg(`Show! Eu acabei de configurar o hábito "${action.payload.name}" para você. Quer ajustar mais algum detalhe?`)
        setIsChatOpen(true)
      } catch (err) {
        console.error('Erro ao adicionar hábito sugerido:', err)
      }
      return
    }

    // Default fallback: Chat
    setInitialChatMsg(`Como posso configurar essa sugestão: "${action.label}"?`)
    setIsChatOpen(true)
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl">
              <Brain className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tightest">IA Insights</h1>
              <p className="text-white/40 font-medium">Análise profunda da sua performance e sugestões do Concierge.</p>
            </div>
          </div>
          
          <button 
            onClick={() => fetchDeepInsights()}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Atualizar Análise
          </button>
        </div>

        {/* Loading State */}
        {loading && insights.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Brain className="w-12 h-12 text-white/20 animate-pulse" />
              <Sparkles className="absolute -top-2 -right-2 text-white/40 animate-bounce" size={20} />
            </div>
            <p className="text-white/40 font-medium animate-pulse text-center max-w-xs">
              O FocusOS Concierge está analisando seus padrões de produtividade...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && insights.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="text-white/20" size={32} />
            </div>
            <h3 className="text-xl font-bold">Sem dados suficientes</h3>
            <p className="text-white/40 max-w-md mx-auto">
              Continue completando seus hábitos e tarefas para que a IA possa identificar padrões e oferecer sugestões valiosas.
            </p>
          </div>
        )}

        {/* Insights Grid */}
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {insights.map((insight, idx) => (
              <InsightActionCard 
                key={idx}
                {...insight}
                onAction={handleAction}
                onDiscuss={() => handleDiscuss(insight)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Chat Component Integration */}
        {isChatOpen && (
          <AIChatOnboarding 
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            initialMessage={initialChatMsg}
            userData={{ habits, goals, tasks }}
          />
        )}
      </motion.div>
    </div>
  )
}
