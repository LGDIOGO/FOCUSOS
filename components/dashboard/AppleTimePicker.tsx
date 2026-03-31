import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface AppleTimePickerProps {
  value: string // HH:mm
  onChange: (time: string) => void
  onClose: () => void
  direction?: 'up' | 'down'
}

export function AppleTimePicker({ value, onChange, onClose, direction = 'down' }: AppleTimePickerProps) {
  const [h, m] = value.split(':')

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const mins = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: direction === 'up' ? 10 : -10 }}
      className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[32px] p-4 sm:p-6 shadow-2xl w-[260px] max-w-[95vw] transition-colors duration-300"
    >
      <div className="flex justify-between items-center mb-6 px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Escolher Horário</span>
        <span className="text-[var(--text-primary)] font-black text-xl tracking-tighter">{value}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 h-[200px]">
        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {hours.map(hour => (
            <button
              key={hour}
              type="button"
              onClick={() => onChange(`${hour}:${m}`)}
              className={cn(
                "w-full py-3 rounded-2xl text-lg font-bold transition-all",
                h === hour ? "bg-[var(--text-primary)] text-[var(--bg-primary)] scale-[1.05]" : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
              )}
            >
              {hour}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {mins.map(min => (
            <button
              key={min}
              type="button"
              onClick={() => onChange(`${h}:${min}`)}
              className={cn(
                "w-full py-3 rounded-2xl text-lg font-bold transition-all",
                m === min ? "bg-[var(--text-primary)] text-[var(--bg-primary)] scale-[1.05]" : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
              )}
            >
              {min}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-[var(--bg-overlay)] text-[var(--text-muted)] rounded-2xl hover:bg-[var(--bg-overlay)]/80 active:scale-95 transition-all text-center"
        >
          Cancelar
        </button>
        <button 
          onClick={onClose}
          className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl hover:opacity-90 active:scale-95 transition-all text-center"
        >
          Confirmar
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-subtle);
          border-radius: 10px;
        }
      `}</style>
    </motion.div>
  )
}
