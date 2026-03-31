import { useState, useRef } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { AnimatePresence } from 'framer-motion'
import { AppleDatePicker } from './AppleDatePicker'
import { AppleTimePicker } from './AppleTimePicker'

interface CustomDateTimePickerProps {
  label: string
  type: 'date' | 'time'
  value: string
  onChange: (val: string) => void
  align?: 'left' | 'right'
  direction?: 'up' | 'down'
}

export function CustomDateTimePicker({ 
  label, 
  type, 
  value, 
  onChange, 
  align = 'left',
  direction = 'down'
}: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getDisplayValue = () => {
    if (!value) return type === 'date' ? '00/00/0000' : '00:00'
    try {
      if (type === 'date') {
        const date = parseISO(value)
        return format(date, 'dd/MM/yyyy')
      }
      return value // Already in HH:mm
    } catch (e) {
      return value
    }
  }

  return (
    <div className="space-y-2 flex-1 relative">
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 cursor-pointer hover:opacity-80 transition-all group",
          isOpen && "border-[var(--text-primary)]/30 bg-[var(--bg-overlay)]/80"
        )}
      >
        <span className={cn(
          "text-[var(--text-primary)] font-bold text-lg flex-1 transition-colors",
          !value && "text-[var(--text-muted)]"
        )}>
          {getDisplayValue()}
        </span>
        
        {type === 'date' ? (
          <Calendar className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" size={20} />
        ) : (
          <Clock className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" size={20} />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile/tablet */}
            <div 
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm lg:hidden" 
              onClick={() => setIsOpen(false)} 
            />
            {/* Click area for desktop absolute positioning */}
            <div 
              className="fixed inset-0 z-[90] hidden lg:block" 
              onClick={() => setIsOpen(false)} 
            />

            <div className={cn(
              "z-[100]",
              // Mobile/Tablet: Fixed Centered
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:absolute lg:top-auto lg:left-auto lg:translate-x-0 lg:translate-y-0",
              // Desktop: Absolute Positioning
              direction === 'up' ? "lg:bottom-full lg:mb-4" : "lg:top-full lg:mt-4",
              align === 'right' ? "lg:right-0" : "lg:left-0"
            )}>
              {type === 'date' ? (
                <AppleDatePicker 
                  value={value} 
                  onChange={onChange} 
                  onClose={() => setIsOpen(false)} 
                  direction={direction}
                />
              ) : (
                <AppleTimePicker 
                  value={value} 
                  onChange={onChange} 
                  onClose={() => setIsOpen(false)} 
                  direction={direction}
                />
              )}
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
