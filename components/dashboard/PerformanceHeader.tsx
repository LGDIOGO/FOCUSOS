'use client'

import { motion } from 'framer-motion'
import { usePerformanceMetrics } from '@/lib/hooks/usePerformance'
import { getParetoMessage } from '@/lib/utils/pareto'
import { TrendingUp, Target, Award } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'

import { useProfile } from '@/lib/hooks/useProfile'

export function PerformanceHeader({ manualDailyScore }: { manualDailyScore?: number }) {
  const { data: metrics, isLoading } = usePerformanceMetrics()
  const { data: profile } = useProfile()
  
  const daily = manualDailyScore !== undefined ? manualDailyScore : (metrics?.daily || 0)
  const weekly = metrics?.weekly || 0
  const threshold = profile?.daily_goal || 80
  
  const paretoMessage = useMemo(() => {
    // Atualiza a cada 2 horas (2 * 60 * 60 * 1000 ms)
    const hoursInterval = 2
    const seed = Math.floor(Date.now() / (hoursInterval * 60 * 60 * 1000))
    return getParetoMessage(seed)
  }, [])

  // Only show the full skeleton if we have neither manual score nor cached metrics
  if (isLoading && manualDailyScore === undefined) return (
    <div className="flex flex-col items-end gap-3.5 pr-2 animate-pulse opacity-50">
      <div className="flex items-center gap-10">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-10 h-3 bg-[var(--bg-overlay)] rounded" />
            <div className="w-3.5 h-3.5 bg-[var(--bg-overlay)] rounded-full" />
          </div>
          <div className="w-16 h-9 bg-[var(--bg-overlay)] rounded mt-1" />
          <div className="w-20 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5" />
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-14 h-3 bg-[var(--bg-overlay)] rounded" />
            <div className="w-3.5 h-3.5 bg-[var(--bg-overlay)] rounded-full" />
          </div>
          <div className="w-16 h-9 bg-[var(--bg-overlay)] rounded mt-1" />
          <div className="w-20 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5" />
        </div>
      </div>

      <div className="w-80 h-8 bg-[var(--bg-overlay)] rounded-full mt-2 inline-block" />
    </div>
  )

  const isWeeklyLoading = isLoading && !metrics;

  return (
    <div className="flex flex-col items-end gap-3.5 pr-2">
      <div className="flex items-center gap-10">
        {/* Daily Progress */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">HOJE</span>
            <Target size={14} className="text-[var(--text-muted)]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-3xl font-black tracking-tighter text-[var(--text-primary)]",
              daily < 50 && "opacity-50"
            )}>{daily}%</span>
          </div>
          <div className="w-20 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5 overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${daily}%` }}
               className="h-full bg-[var(--text-primary)] transition-all duration-1000 shadow-[0_0_8px_rgba(var(--text-primary-rgb),0.3)]"
             />
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">SEMANA</span>
            <TrendingUp size={14} className={cn(weekly >= threshold ? "text-green-500" : "text-[var(--text-muted)]")} />
          </div>
          <div className="flex items-baseline gap-1">
            {isWeeklyLoading ? (
              <span className="text-3xl font-black tracking-tighter text-[var(--text-muted)] opacity-50 animate-pulse">--%</span>
            ) : (
              <span className={cn(
                "text-3xl font-black tracking-tighter text-[var(--text-primary)]",
                weekly < 50 && "opacity-50"
              )}>{weekly}%</span>
            )}
          </div>
          <div className="w-20 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5 overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${weekly}%` }}
               className={cn(
                 "h-full transition-all duration-1000",
                 weekly >= threshold ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "bg-[var(--text-primary)]/60"
               )}
             />
          </div>
        </div>
      </div>

      {/* Pareto Message */}
      <motion.p 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[13px] font-black text-[var(--text-primary)] italic max-w-none text-right leading-none tracking-tightest bg-[var(--bg-overlay)] px-4 py-2 rounded-full border border-[var(--border-subtle)] shadow-xl inline-block mt-2"
      >
        {paretoMessage}
      </motion.p>
    </div>
  )
}
