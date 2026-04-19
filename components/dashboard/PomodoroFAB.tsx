'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Timer } from 'lucide-react'
import { usePomodoroStore, PHASE_COLORS } from '@/lib/stores/pomodoroStore'

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

export function PomodoroFAB() {
  const { toggle, isRunning, isOpen, phase, secondsLeft } = usePomodoroStore()

  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      className="lg:hidden fixed bottom-24 right-4 z-[150] flex items-center gap-2 px-4 py-3 rounded-2xl border border-[var(--border-subtle)] shadow-2xl backdrop-blur-xl transition-all"
      style={{
        backgroundColor: isRunning ? `${PHASE_COLORS[phase]}18` : 'var(--bg-primary)',
        borderColor: isRunning ? `${PHASE_COLORS[phase]}40` : undefined,
      }}
    >
      <div className="relative">
        <Timer size={18} className="text-[var(--text-secondary)]" style={{ color: isRunning ? PHASE_COLORS[phase] : undefined }} />
        {isRunning && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: PHASE_COLORS[phase] }}
          />
        )}
      </div>
      <AnimatePresence mode="wait">
        {isRunning ? (
          <motion.span
            key="running"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="text-sm font-black tabular-nums overflow-hidden whitespace-nowrap"
            style={{ color: PHASE_COLORS[phase] }}
          >
            {formatTime(secondsLeft)}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="text-sm font-black text-[var(--text-muted)] overflow-hidden whitespace-nowrap"
          >
            Foco
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
