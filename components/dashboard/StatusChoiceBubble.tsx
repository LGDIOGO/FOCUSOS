'use client'

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
}

export function StatusChoiceBubble({
  isOpen,
  onClose,
  onSelect,
  options,
  position
}: StatusChoiceBubbleProps) {
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
            className="fixed inset-0 z-[1000] bg-black/[0.01] cursor-default pointer-events-auto"
          />

          {/* Bubble Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -20, x: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: -100 }}
            exit={{ opacity: 0, scale: 0.5, y: -20, x: -100 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
            style={{ 
              top: position.y - 120, // Aparecer acima do ponto de clique
              left: position.x 
            }}
            className="fixed z-[1001] bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 flex items-center gap-1.5 shadow-2xl"
          >
            {options.map((opt) => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(opt.id)
                  onClose()
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-[24px] transition-all group",
                  opt.bg
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border border-white/5 transition-all",
                  "bg-white/5 group-hover:bg-white group-hover:text-black",
                  opt.color
                )}>
                  <opt.icon size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-opacity">
                  {opt.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
