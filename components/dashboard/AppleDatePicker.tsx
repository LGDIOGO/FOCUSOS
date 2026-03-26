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
              "w-9 h-9 flex items-center justify-center text-sm rounded-full transition-all",
              isSelected ? "bg-white text-black font-bold scale-110" : "hover:bg-white/10",
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
      className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 shadow-2xl w-[320px] max-w-[90vw] overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-bold text-white capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white"
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
          <div key={i} className="w-9 h-9 flex items-center justify-center text-[10px] font-black text-white/20 uppercase tracking-widest">
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
          className="flex-1 py-3 text-xs font-black uppercase tracking-widest bg-white/5 rounded-2xl hover:bg-white/10"
        >
          Hoje
        </button>
        <button 
          onClick={onClose}
          className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  )
}
