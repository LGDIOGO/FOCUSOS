'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Minus, X, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StatusOption {
  id: string
  label: string
  icon: any
  color: string
  bg: string
}

interface StatusChoiceBubbleProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (status: any) => void
  options: StatusOption[]
  position: { x: number; y: number }
  width?: number
}

export function StatusChoiceBubble({
  isOpen,
  onClose,
  onSelect,
  options,
  position
}: StatusChoiceBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y })

  useEffect(() => {
    if (isOpen && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const padding = 16 // Margin from screen edge
      
      let x = position.x
      
      // Calculate horizontal clamping
      const halfWidth = rect.width / 2
      if (x - halfWidth < padding) {
        x = halfWidth + padding
      } else if (x + halfWidth > viewportWidth - padding) {
        x = viewportWidth - halfWidth - padding
      }
      
      setAdjustedPosition({ x, y: position.y })
    }
  }, [isOpen, position.x, position.y])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="fixed inset-0 z-[1000] bg-black/[0.1] backdrop-blur-[2px] cursor-default pointer-events-auto"
          />

          {/* Bubble Menu */}
          <motion.div
            ref={bubbleRef}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 10 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            style={{ 
              top: `calc(${adjustedPosition.y}px - 140px)`,
              left: `${adjustedPosition.x}px`,
              transform: 'translateX(-50%)'
            }}
            className="fixed z-[1001] bg-[var(--bg-card)] backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[32px] p-2 flex items-center gap-1.5 shadow-2xl max-w-[95vw]"
          >
            <div className="flex items-center gap-1.5 max-w-full overflow-x-auto scrollbar-none px-1">
              {options.map((opt) => (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(opt.id)
                    onClose()
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-[24px] transition-all group flex-shrink-0",
                    opt.bg
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-white/5 transition-all text-sm sm:text-base",
                    "bg-white/5 group-hover:bg-white group-hover:text-black",
                    opt.color
                  )}>
                    <opt.icon size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-opacity">
                    {opt.label}
                  </span>
                </motion.button>
              ))}

              <div className="w-px h-10 bg-white/10 mx-1 flex-shrink-0" />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-[24px] transition-all group flex-shrink-0 hover:bg-white/5"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                  <X size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-opacity">
                  Cancelar
                </span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
