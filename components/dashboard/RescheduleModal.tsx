'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X, Calendar, ChevronRight } from 'lucide-react'
import { CalendarEvent } from '@/types'
import { CustomDateTimePicker } from './CustomDateTimePicker'

interface RescheduleModalProps {
  onClose: () => void
  onConfirm: (newDate: string) => void
  event: CalendarEvent
}

export function RescheduleModal({ onClose, onConfirm, event }: RescheduleModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [newDate, setNewDate] = useState(event.date || '')

  useEffect(() => { setIsMounted(true) }, [])

  // Sync date when a different event is scheduled for reschedule
  useEffect(() => {
    setNewDate(event.date || '')
  }, [event.id, event.date])

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    onConfirm(newDate)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  if (!isMounted) return null

  return createPortal(
    <>
      {/* Backdrop — stays visible during exit animation, blocks tap-through */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
        className="fixed inset-0 z-[29998] bg-black/60 backdrop-blur-md cursor-default"
      />

      {/* Modal card wrapper — pointer-events-none so only the card itself is interactive */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 z-[29999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full sm:max-w-sm bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden p-6 transition-colors duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile only) */}
          <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mb-5 sm:hidden" />

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center border border-amber-400/20">
                <Calendar className="text-amber-400 w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tightest leading-none text-[var(--text-primary)]">Remarcar</h2>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black mt-0.5">Reagendar Compromisso</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[var(--bg-overlay)] rounded-xl transition-all"
            >
              <X className="text-[var(--text-muted)]" size={20} />
            </button>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-6 italic transition-colors">
            &quot;{event.title}&quot;
          </p>

          <div className="space-y-4">
            <CustomDateTimePicker
              label="Escolha a Nova Data"
              type="date"
              value={newDate}
              onChange={setNewDate}
            />

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleConfirm}
                className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black py-4 rounded-[18px] hover:opacity-90 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 group"
              >
                Confirmar Reagendamento
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleClose}
                className="w-full bg-[var(--bg-overlay)] text-[var(--text-muted)] font-black py-4 rounded-[18px] hover:bg-[var(--bg-overlay)]/80 hover:text-[var(--text-primary)] transition-all text-sm"
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  )
}
