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
      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 cursor-pointer hover:bg-white/[0.06] hover:border-white/20 transition-all group",
          isOpen && "border-white/30 bg-white/[0.08]"
        )}
      >
        <span className={cn(
          "text-white font-bold text-lg flex-1",
          !value && "text-white/20"
        )}>
          {getDisplayValue()}
        </span>
        
        {type === 'date' ? (
          <Calendar className="text-white/40 group-hover:text-white transition-colors" size={20} />
        ) : (
          <Clock className="text-white/40 group-hover:text-white transition-colors" size={20} />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />
            <div className={cn(
              "absolute z-[100]",
              direction === 'up' ? "bottom-full mb-4" : "top-full mt-4",
              align === 'right' ? "right-0" : "left-0"
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
