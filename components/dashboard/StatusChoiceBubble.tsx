'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
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
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: `${Math.max(8, position.y - 150)}px`,
    left: `${position.x}px`,
    transform: 'translateX(-50%)',
    zIndex: 30000,
    opacity: 0
  })
  // Delay backdrop pointer-events so it never captures the same click that opened the bubble
  const [backdropReady, setBackdropReady] = useState(false)

  useEffect(() => {
    if (!isOpen) { setBackdropReady(false); return }
    const t = setTimeout(() => setBackdropReady(true), 80)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const padding = 12

      // Horizontal clamping
      let x = position.x
      const halfW = rect.width / 2
      if (x - halfW < padding) x = halfW + padding
      else if (x + halfW > vw - padding) x = vw - halfW - padding

      // Vertical: prefer above click, flip below if not enough space
      const bubbleH = rect.height || 100
      const spaceAbove = position.y - padding
      const topAbove = position.y - bubbleH - 16
      const topBelow = position.y + 16

      const top = spaceAbove >= bubbleH ? topAbove : topBelow

      setBubbleStyle({
        position: 'fixed',
        top: `${Math.min(Math.max(top, padding), vh - bubbleH - padding)}px`,
        left: `${x}px`,
        transform: 'translateX(-50%)',
        zIndex: 30000,
        opacity: 1
      })
    }
  }, [isOpen, position.x, position.y])

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <>
          {/* Transparent Overlay — só captura eventos após 80ms para não fechar com o mesmo clique */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className={cn(
              "fixed inset-0 z-[10000] bg-black/[0.1] backdrop-blur-[2px] cursor-default",
              backdropReady ? "pointer-events-auto" : "pointer-events-none"
            )}
          />

          {/* Bubble Menu */}
          <motion.div
            ref={bubbleRef}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 10 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            style={bubbleStyle}
            className="bg-[var(--bg-card)] backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[32px] p-2 flex items-center gap-1.5 shadow-2xl max-w-[95vw]"
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
        </>,
        document.body
      )}
    </AnimatePresence>
  )
}
