'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
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
  const lastActivationRef = useRef(0)
  const openedAtRef = useRef(0)
  const [isMounted, setIsMounted] = useState(false)
  const [backdropReady, setBackdropReady] = useState(false)
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: `${Math.max(8, position.y - 150)}px`,
    left: `${position.x}px`,
    transform: 'translateX(-50%)',
    zIndex: 30000,
    opacity: 0
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setBackdropReady(false)
      return
    }

    openedAtRef.current = Date.now()
    const timeoutId = setTimeout(() => setBackdropReady(true), 80)
    return () => clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !bubbleRef.current) {
      return
    }

    const rect = bubbleRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 12

    let nextX = position.x
    const halfWidth = rect.width / 2
    if (nextX - halfWidth < padding) {
      nextX = halfWidth + padding
    } else if (nextX + halfWidth > viewportWidth - padding) {
      nextX = viewportWidth - halfWidth - padding
    }

    const bubbleHeight = rect.height || 100
    const topAbove = position.y - bubbleHeight - 16
    const topBelow = position.y + 16
    const top =
      position.y - padding >= bubbleHeight
        ? topAbove
        : topBelow

    setBubbleStyle({
      position: 'fixed',
      top: `${Math.min(Math.max(top, padding), viewportHeight - bubbleHeight - padding)}px`,
      left: `${nextX}px`,
      transform: 'translateX(-50%)',
      zIndex: 30000,
      opacity: 1
    })
  }, [isOpen, position.x, position.y, options.length])

  const shouldSkipDuplicateActivation = () => {
    const now = Date.now()
    if (now - lastActivationRef.current < 350) {
      return true
    }

    lastActivationRef.current = now
    return false
  }

  const handleOptionSelect = (event: React.SyntheticEvent, status: string) => {
    event.stopPropagation()
    if (shouldSkipDuplicateActivation()) {
      return
    }

    onSelect(status)
    onClose()
  }

  const handleCloseBubble = (event: React.SyntheticEvent) => {
    event.stopPropagation()
    if (Date.now() - openedAtRef.current < 250) {
      return
    }

    if (shouldSkipDuplicateActivation()) {
      return
    }

    onClose()
  }

  if (!isOpen || !isMounted) {
    return null
  }

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleCloseBubble}
        className={cn(
          'fixed inset-0 z-[29999] bg-black/[0.1] backdrop-blur-[2px] cursor-default',
          backdropReady ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      />

      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, scale: 0.5, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
        style={bubbleStyle}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        data-status-bubble="true"
        className="z-[30000] pointer-events-auto bg-[var(--bg-card)] backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[32px] p-2 flex items-center gap-1.5 shadow-2xl max-w-[95vw]"
      >
        <div className="flex items-center gap-1.5 max-w-full overflow-x-auto scrollbar-none px-1">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={(event) => handleOptionSelect(event, opt.id)}
              onTouchEnd={(event) => {
                event.preventDefault()
                handleOptionSelect(event, opt.id)
              }}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-[24px] transition-all group flex-shrink-0 hover:scale-105 active:scale-95',
                opt.bg
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-white/5 transition-all text-sm sm:text-base',
                  'bg-white/5 group-hover:bg-white group-hover:text-black',
                  opt.color
                )}
              >
                <opt.icon size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-opacity">
                {opt.label}
              </span>
            </button>
          ))}

          <div className="w-px h-10 bg-white/10 mx-1 flex-shrink-0" />

          <button
            type="button"
            onClick={handleCloseBubble}
            onTouchEnd={(event) => {
              event.preventDefault()
              handleCloseBubble(event)
            }}
            className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-[24px] transition-all group flex-shrink-0 hover:bg-white/5 hover:scale-105 active:scale-95"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
              <X size={18} strokeWidth={2.5} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-opacity">
              Cancelar
            </span>
          </button>
        </div>
      </motion.div>
    </>,
    document.body
  )
}
