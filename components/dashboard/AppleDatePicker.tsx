import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, getYear, getMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AppleDatePickerProps {
  value: string // yyyy-MM-dd
  onChange: (date: string) => void
  onClose: () => void
  direction?: 'up' | 'down'
}

export function AppleDatePicker({ value, onChange, onClose, direction = 'down' }: AppleDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())
  const selectedDate = value ? new Date(value) : null

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'yyyy-MM-dd')
        const isSelected = selectedDate && isSameDay(day, selectedDate)
        const isCurrentMonth = isSameMonth(day, monthStart)

        days.push(
          <button
            key={day.toString()}
            type="button"
            onClick={() => {
              onChange(formattedDate)
              onClose()
            }}
            className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs sm:text-sm rounded-full transition-all",
              isSelected ? "bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold scale-110" : "hover:bg-[var(--bg-overlay)]",
              !isCurrentMonth && "opacity-20"
            )}
          >
            {format(day, 'd')}
          </button>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      )
      days = []
    }
    return <div className="space-y-1">{rows}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 10 : -10 }}
      className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[32px] p-4 sm:p-6 shadow-2xl w-[320px] max-w-[95vw] overflow-hidden transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-bold text-[var(--text-primary)] capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[var(--bg-overlay)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
          <div key={i} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {renderDays()}

      <div className="mt-6 flex justify-between gap-4">
        <button 
          onClick={() => {
            onChange(format(new Date(), 'yyyy-MM-dd'))
            onClose()
          }}
          className="flex-1 py-3 text-xs font-black uppercase tracking-widest bg-[var(--bg-overlay)] text-[var(--text-primary)] rounded-2xl hover:bg-[var(--bg-overlay)]/80 transition-all font-sans"
        >
          Hoje
        </button>
        <button 
          onClick={onClose}
          className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors font-sans"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  )
}
