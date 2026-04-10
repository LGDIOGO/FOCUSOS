'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { AnimatePresence, motion } from 'framer-motion'
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
  isOpen: boolean
  onToggle: () => void
}

export function CustomDateTimePicker({ 
  label, 
  type, 
  value, 
  onChange, 
  align = 'left',
  direction = 'down',
  isOpen,
  onToggle
}: CustomDateTimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 })

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      })
    }
  }

  const handleToggle = (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    updateCoords()
    onToggle()
  }

  const getPositionStyle = () => {
    if (!coords.width) return { opacity: 0 }

    const pickerWidth = 320
    const pickerHeight = 400
    
    let left = coords.left
    if (align === 'right') {
      left = coords.left + coords.width - pickerWidth
    }
    
    // Horizontal boundary check
    if (left < 10) left = 10
    if (left + pickerWidth > window.innerWidth - 10) {
      left = window.innerWidth - pickerWidth - 10
    }

    const style: React.CSSProperties = {
      position: 'fixed',
      left: `${left}px`,
      width: `${pickerWidth}px`,
      zIndex: 20000
    }

    // Vertical Positioning
    if (direction === 'up') {
      style.top = `${coords.top - pickerHeight - 8}px`
      if (coords.top - pickerHeight < 10) {
        style.top = `${coords.top + coords.height + 8}px`
      }
    } else {
      style.top = `${coords.top + coords.height + 8}px`
      if (coords.top + coords.height + pickerHeight + 10 > window.innerHeight) {
        style.top = `${coords.top - pickerHeight - 8}px`
      }
    }

    return style
  }

  const getDisplayValue = () => {
    if (!value) return type === 'date' ? '00/00/0000' : '00:00'
    try {
      if (type === 'date') {
        return format(new Date(value), "dd/MM/yyyy")
      }
      return value
    } catch (e) {
      return value
    }
  }

  return (
    <div className="space-y-2 flex-1" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">{label}</label>
      <div 
        onPointerDown={handleToggle}
        onMouseDown={handleToggle}
        className={cn(
          "relative flex items-center bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 cursor-pointer hover:opacity-80 transition-all group select-none touch-none",
          isOpen && "border-[var(--text-primary)]/30 bg-[var(--bg-overlay)]/80 ring-2 ring-[var(--text-primary)]/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
        )}
      >
        <span className={cn(
          "text-[var(--text-primary)] font-bold text-lg flex-1 transition-colors pointer-events-none",
          !value && "text-[var(--text-muted)]"
        )}>
          {getDisplayValue()}
        </span>
        
        {type === 'date' ? (
          <Calendar className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors pointer-events-none" size={20} />
        ) : (
          <Clock className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors pointer-events-none" size={20} />
        )}
      </div>

      <AnimatePresence>
        {isOpen && createPortal(
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[19999] bg-black/40 backdrop-blur-sm" 
              onPointerDown={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            />
            <div style={{ ...getPositionStyle() }}>
              {type === 'date' ? (
                <AppleDatePicker 
                  value={value} 
                  onChange={onChange} 
                  onClose={onToggle} 
                  direction={direction}
                />
              ) : (
                <AppleTimePicker 
                  value={value} 
                  onChange={onChange} 
                  onClose={onToggle} 
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
