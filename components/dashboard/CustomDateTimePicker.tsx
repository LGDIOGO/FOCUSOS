import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { AnimatePresence } from 'framer-motion'
import { AppleDatePicker } from './AppleDatePicker'
import { AppleTimePicker } from './AppleTimePicker'
import { createPortal } from 'react-dom'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 })

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      })
    }
  }, [isOpen])

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

  const getPositionStyle = () => {
    const style: React.CSSProperties = {
      position: 'fixed',
      left: align === 'right' ? `${coords.left + coords.width - 300}px` : `${coords.left}px`,
      zIndex: 10000
    }

    if (direction === 'up') {
      style.bottom = `${window.innerHeight - coords.top}px`
    } else {
      style.top = `${coords.top + coords.height + 8}px`
    }

    return style
  }

  return (
    <div className="space-y-2 flex-1" ref={containerRef}>
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
        {isOpen && createPortal(
          <>
            <div 
              className="fixed inset-0 z-[19999]" 
              onClick={() => setIsOpen(false)} 
            />
            <div style={{ ...getPositionStyle(), zIndex: 20000 }}>
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
          </>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}
