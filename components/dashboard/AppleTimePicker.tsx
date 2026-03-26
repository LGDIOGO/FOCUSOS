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
      className="bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 shadow-2xl w-[260px] max-w-[90vw]"
    >
      <div className="flex justify-between items-center mb-6 px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Escolher Horário</span>
        <span className="text-white font-black text-xl tracking-tighter">{value}</span>
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
                h === hour ? "bg-white text-black scale-[1.05]" : "text-white/40 hover:bg-white/5 hover:text-white"
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
                m === min ? "bg-white text-black scale-[1.05]" : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              {min}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button 
          onClick={onClose}
          className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-white text-black rounded-2xl hover:opacity-90 active:scale-95 transition-all"
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
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </motion.div>
  )
}
