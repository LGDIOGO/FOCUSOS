'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CalendarEvent } from '@/types'
import { CustomDateTimePicker } from './CustomDateTimePicker'

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newDate: string) => void
  event: CalendarEvent | null
}

export function RescheduleModal({ isOpen, onClose, onConfirm, event }: RescheduleModalProps) {
  const [newDate, setNewDate] = useState(event?.date || '')

  if (!isOpen || !event) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[32px] shadow-2xl overflow-hidden p-6 transition-colors duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center border border-amber-400/20">
                <Calendar className="text-amber-400 w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-black tracking-tightest leading-none text-[var(--text-primary)]">Remarcar</h2>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black mt-1">Compromisso Parcial</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-overlay)] rounded-xl transition-all">
            <X className="text-[var(--text-muted)]" size={20} />
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6 italic transition-colors">
          &quot;O que foi feito é importante, mas o que falta precisa de um novo momento.&quot;
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
              onClick={() => onConfirm(newDate)}
              className="w-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black py-4 rounded-[18px] hover:opacity-90 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 group"
            >
              Confirmar Reagendamento
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-[var(--bg-overlay)] text-[var(--text-muted)] font-black py-4 rounded-[18px] hover:bg-[var(--bg-overlay)]/80 hover:text-[var(--text-primary)] transition-all text-sm"
            >
               Depois
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
