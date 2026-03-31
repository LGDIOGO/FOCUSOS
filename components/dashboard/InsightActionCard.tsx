'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, MessageCircle, AlertTriangle, TrendingUp, Target, Plus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface InsightActionCardProps {
  type: 'performance' | 'warning' | 'tip' | 'achievement' | 'rescue'
  title: string
  body: string
  action?: {
    label: string
    type: string
    payload: any
  }
  onAction?: (action: any) => void
  onDiscuss?: () => void
}

export function InsightActionCard({ type, title, body, action, onAction, onDiscuss }: InsightActionCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'performance': return <TrendingUp className="text-white" size={20} />
      case 'warning': return <AlertTriangle className="text-red-500" size={20} />
      case 'achievement': return <Target className="text-white" size={20} />
      case 'rescue': return <RefreshCw className="text-red-600" size={20} />
      default: return <Sparkles className="text-white" size={20} />
    }
  }

  const getTheme = () => {
    switch (type) {
      case 'performance': return 'bg-white/5 border-white/10'
      case 'warning': return 'bg-red-500/10 border-red-500/20'
      case 'achievement': return 'bg-white/10 border-white/20'
      case 'rescue': return 'bg-red-600/10 border-red-600/20'
      default: return 'bg-white/5 border-white/10'
    }
  }

  const getLabel = () => {
    switch (String(type).toLowerCase()) {
      case 'performance': return 'DESEMPENHO'
      case 'warning': return 'ALERTA'
      case 'achievement': return 'CONQUISTA'
      case 'rescue': return 'RESGATE'
      case 'tip': return 'DICA'
      default: return String(type).toUpperCase()
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative p-6 rounded-[2rem] border transition-all hover:scale-[1.01] active:scale-[0.99]",
        getTheme()
      )}
    >
      <div className="flex items-start gap-5">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-white/20 transition-all">
          {getIcon()}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg tracking-tight">{title}</h3>
            <div className="min-w-[120px] h-8 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.05] group-hover:bg-white/[0.08] group-hover:border-white/10 transition-all duration-300">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30 group-hover:opacity-60 transition-opacity">
                {getLabel()}
              </span>
            </div>
          </div>
          <p className="text-white/60 leading-relaxed text-sm md:text-base pr-4">
            {body}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            {action && (
              <button 
                onClick={() => onAction?.(action)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-black rounded-full hover:bg-neutral-200 transition-all active:scale-95 shadow-lg"
              >
                <Plus size={14} />
                {action.label}
              </button>
            )}
            
            <button 
              onClick={onDiscuss}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold rounded-full text-white/80 active:scale-95"
            >
              <MessageCircle size={14} />
              Debater com Concierge
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
