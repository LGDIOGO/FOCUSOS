'use client'

import { useState, useRef, useLayoutEffect } from 'react'
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
  isOpen?: boolean
  onToggle?: () => void
}

export function CustomDateTimePicker({
  label,
  type,
  value,
  onChange,
  align = 'left',
  direction = 'down',
  isOpen: isOpenProp,
  onToggle: onToggleProp
}: CustomDateTimePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = isOpenProp !== undefined
  const isOpen = isControlled ? isOpenProp : internalOpen
  const onToggle = isControlled ? onToggleProp! : () => setInternalOpen(v => !v)
  const containerRef = useRef<HTMLDivElement>(null)

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
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
        className={cn(
          "relative flex items-center bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 cursor-pointer hover:opacity-80 transition-all group select-none touch-none",
          isOpen && "border-[var(--text-primary)]/30 bg-[var(--bg-overlay)]/80 ring-2 ring-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
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
        {isOpen && (
          <PickerPortal 
            anchorRef={containerRef}
            type={type}
            value={value}
            onChange={onChange}
            onClose={onToggle}
            align={align}
            direction={direction}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PickerPortal({ 
  anchorRef, 
  type, 
  value, 
  onChange, 
  onClose,
  align,
  direction
}: {
  anchorRef: React.RefObject<HTMLDivElement>
  type: 'date' | 'time'
  value: string
  onChange: (val: string) => void
  onClose: () => void
  align: 'left' | 'right'
  direction: 'up' | 'down'
}) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, position: 'fixed', zIndex: 99999 })

  useLayoutEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const pickerWidth = 320
      const pickerHeight = 400

      let left = rect.left
      if (align === 'right') {
        left = rect.left + rect.width - pickerWidth
      }

      // Horizontal flip/clamping
      if (left < 10) left = 10
      if (left + pickerWidth > window.innerWidth - 10) {
        left = window.innerWidth - pickerWidth - 10
      }

      const newStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${left}px`,
        width: `${pickerWidth}px`,
        zIndex: 99999,
        opacity: 1
      }

      // Vertical auto-flip
      const spaceBelow = window.innerHeight - (rect.top + rect.height)
      const spaceAbove = rect.top
      
      let finalDirection = direction
      if (finalDirection === 'down' && spaceBelow < pickerHeight && spaceAbove > spaceBelow) {
        finalDirection = 'up'
      } else if (finalDirection === 'up' && spaceAbove < pickerHeight && spaceBelow > spaceAbove) {
        finalDirection = 'down'
      }

      if (finalDirection === 'up') {
        newStyle.top = `${rect.top - pickerHeight - 8}px`
      } else {
        newStyle.top = `${rect.top + rect.height + 8}px`
      }

      setStyle(newStyle)
    }
  }, [anchorRef, align, direction])

  return createPortal(
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-md" 
        onPointerDown={(e) => {
          e.stopPropagation()
          onClose()
        }}
      />
      <div style={style}>
        {type === 'date' ? (
          <AppleDatePicker value={value} onChange={onChange} onClose={onClose} direction={direction} />
        ) : (
          <AppleTimePicker value={value} onChange={onChange} onClose={onClose} direction={direction} />
        )}
      </div>
    </>,
    document.body
  )
}
