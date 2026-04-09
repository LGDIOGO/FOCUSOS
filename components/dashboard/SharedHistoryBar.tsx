'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Calendar, Filter } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type PeriodFilter = 'current_month' | 'last_month' | 'this_year' | 'all_time' | 'custom'

export interface DateRange {
  start: string
  end: string
}

interface SharedHistoryBarProps {
  icon: React.ElementType
  title: string
  subtitle: string
  badgeText?: string | React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  
  // Date Filtering Props
  filterValue: PeriodFilter
  onFilterChange: (filter: PeriodFilter) => void
  customRange: DateRange
  onCustomRangeChange: (range: DateRange) => void
}

export function SharedHistoryBar({
  icon: Icon,
  title,
  subtitle,
  badgeText,
  isOpen,
  onToggle,
  children,
  filterValue,
  onFilterChange,
  customRange,
  onCustomRangeChange
}: SharedHistoryBarProps) {
  return (
    <div className="pt-8">
      {/* Premium History Header */}
      <button 
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-6 md:py-8 group bg-gradient-to-r from-[var(--bg-overlay)] to-transparent rounded-[32px] border border-[var(--border-subtle)] hover:border-[var(--text-primary)]/20 transition-all shadow-sm shadow-black/10"
      >
        <div className="flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white group-hover:text-black transition-colors">
          <Icon size={20} />
        </div>
        
        <div className="flex flex-col items-start text-left flex-1 min-w-0 pr-2">
          <span className="text-lg md:text-xl font-black text-[var(--text-primary)] truncate w-full">{title}</span>
          <span className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] group-hover:text-white/50 transition-colors line-clamp-1">{subtitle}</span>
        </div>
        
        <div className="flex flex-shrink-0 items-center gap-3">
          {badgeText && (
             <span className="hidden sm:inline-flex text-[10px] uppercase font-black text-[var(--text-primary)]/80 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
               {badgeText}
             </span>
          )}
          <ChevronRight 
            size={24} 
            className={cn(
              "text-[var(--text-muted)] transition-transform duration-500",
              isOpen ? "rotate-90" : ""
            )} 
          />
        </div>
      </button>

      {/* Expanded Content Wrapper */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-6 pb-2">
              {/* Toolbar -> Date Filters */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-white/5 border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                   <Filter size={16} />
                   <span className="text-xs font-bold uppercase tracking-widest">Filtrar Período</span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <select 
                      value={filterValue}
                      onChange={(e) => onFilterChange(e.target.value as PeriodFilter)}
                      className="w-full sm:w-[180px] appearance-none bg-[var(--bg-workspace)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl px-4 py-2 outline-none focus:border-white/30 transition-colors font-medium cursor-pointer"
                    >
                      <option value="current_month">Este Mês</option>
                      <option value="last_month">Mês Passado</option>
                      <option value="this_year">Este Ano</option>
                      <option value="all_time">Todo o Histórico</option>
                      <option value="custom">Personalizado...</option>
                    </select>
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={14} />
                  </div>

                  {filterValue === 'custom' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <input 
                        type="date"
                        value={customRange.start}
                        onChange={(e) => onCustomRangeChange({ ...customRange, start: e.target.value })}
                        className="w-full sm:w-auto bg-[var(--bg-workspace)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl px-3 py-2 outline-none focus:border-white/30 transition-colors minimal-date-input"
                      />
                      <span className="text-[var(--text-muted)] text-xs">até</span>
                      <input 
                        type="date"
                        value={customRange.end}
                        onChange={(e) => onCustomRangeChange({ ...customRange, end: e.target.value })}
                        className="w-full sm:w-auto bg-[var(--bg-workspace)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl px-3 py-2 outline-none focus:border-white/30 transition-colors minimal-date-input"
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Dynamic External Content */}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
