'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, BrainCircuit, RefreshCw } from 'lucide-react'
import { Habit, Task } from '@/types'

interface AIInsightBannerProps {
  habits: Habit[]
  tasks: Task[]
}

export default function AIInsightBanner({ habits, tasks }: AIInsightBannerProps) {
  const [insight, setInsight] = useState<{ type: string; title: string; body: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchInsight = useCallback(async (force = false) => {
    if (habits.length === 0 && tasks.length === 0) return
    
    // Tentar carregar do cache se não for um "force refresh"
    if (!force) {
      const cached = sessionStorage.getItem('focusos_last_insight')
      if (cached) {
        try {
          setInsight(JSON.parse(cached))
          return
        } catch (e) {
          sessionStorage.removeItem('focusos_last_insight')
        }
      }
    }

    setLoading(true)
    try {
      const resp = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'auto',
          userData: { habits, tasks } 
        })
      })
      const data = await resp.json()
      setInsight(data)
      sessionStorage.setItem('focusos_last_insight', JSON.stringify(data))
    } catch (err) {
      console.error('Failed to fetch insight:', err)
    } finally {
      setLoading(false)
    }
  }, [habits, tasks])

  useEffect(() => {
    fetchInsight()
  }, []) // Apenas no primeiro mount

  if (!insight && !loading) return null

  const bgColors: Record<string, string> = {
    warning: 'bg-red-500/10 border-red-500/20',
    pattern: 'bg-red-500/10 border-red-500/20',
    tip: 'bg-amber-500/10 border-amber-500/20',
    achievement: 'bg-green-500/10 border-green-500/20',
  }

  const icons: Record<string, any> = {
    warning: BrainCircuit,
    pattern: Sparkles,
    tip: Sparkles,
    achievement: Sparkles,
  }

  const Icon = icons[insight?.type || 'tip'] || Sparkles

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[24px] border p-5 ${bgColors[insight?.type || 'tip']} backdrop-blur-sm group`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">FocusOS Insight</span>
          </div>
          <button 
            onClick={() => fetchInsight(true)}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/60 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2 py-2"
            >
              <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1.5"
            >
              <h3 className="text-[17px] font-bold tracking-tight text-white">{insight?.title}</h3>
              <p className="text-[14px] leading-relaxed text-white/60 font-medium">
                {insight?.body}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-white/40 group-hover:text-white transition-colors cursor-pointer">
          Ver análise detalhada <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Glossy Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-colors" />
    </motion.div>
  )
}
