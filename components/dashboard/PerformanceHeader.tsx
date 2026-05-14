'use client'

import { motion } from 'framer-motion'
import { usePerformanceMetrics } from '@/lib/hooks/usePerformance'
import { getParetoMessage } from '@/lib/utils/pareto'
import { TrendingUp, Target } from 'lucide-react'
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
    const hoursInterval = 2
    const seed = Math.floor(Date.now() / (hoursInterval * 60 * 60 * 1000))
    return getParetoMessage(seed)
  }, [])

  if (isLoading && manualDailyScore === undefined) return (
    <div className="flex items-center gap-5 md:gap-10 animate-pulse opacity-50">
      <div className="flex flex-col items-end">
        <div className="w-8 h-2.5 bg-[var(--bg-overlay)] rounded mb-1" />
        <div className="w-14 h-7 bg-[var(--bg-overlay)] rounded" />
        <div className="w-16 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5" />
      </div>
      <div className="flex flex-col items-end">
        <div className="w-12 h-2.5 bg-[var(--bg-overlay)] rounded mb-1" />
        <div className="w-14 h-7 bg-[var(--bg-overlay)] rounded" />
        <div className="w-16 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1.5" />
      </div>
    </div>
  )

  const isWeeklyLoading = isLoading && !metrics

  return (
    <div className="flex flex-col items-end gap-2 md:gap-3.5">
      <div className="flex items-center gap-5 md:gap-10">
        {/* Daily */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">HOJE</span>
            <Target size={12} className="text-[var(--text-muted)]" />
          </div>
          <span className={cn(
            "text-2xl md:text-3xl font-black tracking-tighter text-[var(--text-primary)]",
            daily < 50 && "opacity-50"
          )}>{daily}%</span>
          <div className="w-16 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${daily}%` }}
              className="h-full bg-[var(--text-primary)] transition-all duration-1000"
            />
          </div>
        </div>

        {/* Weekly */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">SEMANA</span>
            <TrendingUp size={12} className={cn(weekly >= threshold ? "text-green-500" : "text-[var(--text-muted)]")} />
          </div>
          {isWeeklyLoading ? (
            <span className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--text-muted)] opacity-50 animate-pulse">--%</span>
          ) : (
            <span className={cn(
              "text-2xl md:text-3xl font-black tracking-tighter text-[var(--text-primary)]",
              weekly < 50 && "opacity-50"
            )}>{weekly}%</span>
          )}
          <div className="w-16 h-1.5 bg-[var(--bg-overlay)] rounded-full mt-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weekly}%` }}
              className={cn(
                "h-full transition-all duration-1000",
                weekly >= threshold ? "bg-green-500" : "bg-[var(--text-primary)]/60"
              )}
            />
          </div>
        </div>
      </div>

      {/* Pareto Message — hidden on very small screens */}
      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden sm:block text-[11px] md:text-[13px] font-black text-[var(--text-primary)] italic text-right leading-snug tracking-tightest bg-[var(--bg-overlay)] px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-[var(--border-subtle)] shadow-xl max-w-[240px] md:max-w-none"
      >
        {paretoMessage}
      </motion.p>
    </div>
  )
}
