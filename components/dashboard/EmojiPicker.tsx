import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Smile, X, Heart, Dog, Pizza, Zap, Briefcase, Settings } from 'lucide-react'

const EMOJI_CATEGORIES = [
  { 
    id: 'smileys', 
    label: 'Smileys', 
    icon: Smile, 
    emojis: [
      '🎯', '✨', '🌟', '🔥', '⚡️', '🌈', '❤️', '😊', '😎', '🤩', '🥳', '🤫', '🤔', '💪', '🧠', '🙌', '🙏', '🤝', '👋', '✌️',
      '😂', '🤣', '🥹', '🥰', '😍', '😌', '😋', '😜', '👻', '👽', '🤖', '👾', '👐', '🤲', '💅', '💍', '👑', '💄', '👀', '👅'
    ]
  },
  { 
    id: 'activities', 
    label: 'Atividades', 
    icon: Zap, 
    emojis: [
      '🏃', '🧘', '🏋️', '🚴', '🚶', '⚽️', '🏀', '🎾', '🎮', '🎸', '🎧', '🎬', '🎨', '📸', '📚', '✏️', '💻', '💡', '⏰', '⌛️',
      '🏊', '🚣', '🧗', '🥊', '🥋', '🛹', '🎹', '🎻', '🎤', '🎟', '🎭', '🧶', '🧵', '♟', '🧩', '🚀', '⛵️', '🏹', '💎', '🧪'
    ]
  },
  { 
    id: 'animals', 
    label: 'Natureza', 
    icon: Dog, 
    emojis: [
      '🐶', '🐱', '🐼', '🦁', '🐷', '🐸', '🐨', '🐵', '🐣', '🦋', '🌱', '🌿', '☘️', '🍀', '🌵', '🌴', '🌸', '🌼', '🌞', '🌙',
      '🦊', '🐰', '🐯', '🐮', '🐑', '🐧', '🦆', '🐝', '🐞', '🦗', '🌲', '🌳', '🌊', '🍄', '🌍', '🌋', '⛺️', '🏔', '❄️', '🔥'
    ]
  },
  { 
    id: 'food', 
    label: 'Comida', 
    icon: Pizza, 
    emojis: [
      '🍎', '🥦', '🥕', '🥑', '🍳', '🥞', '🍕', '🍣', '🥙', '🍚', '🍫', '🍿', '☕️', '🍵', '🥤', '🍷', '🍺', '🧉', '🍼',
      '🍓', '🍉', '🍌', '🍍', '🍔', '🍟', '🍜', '🍲', '🥡', '🥧', '🍦', '🍩', '🍪', '🍯', '🥃', '🍹', '🧉', '🧂', '🥢', '🥄'
    ]
  },
  { 
    id: 'objects', 
    label: 'Objetos', 
    icon: Briefcase, 
    emojis: [
      '💼', '💰', '💳', '🛒', '🛍', '🎁', '🎈', '🔑', '🔒', '📞', '📧', '📦', '🏠', '🚗', '✈️', '🏝', '🚿', '🧼', '💊', '🪥',
      '🖥', '🖱', '⌨️', '📱', '⌚️', '📷', '🎥', '🔦', '📕', '🗞', '🏷', '✉️', '📪', '🔨', '🪛', '🪚', '🩹', '🩺', '🪞', '🪑'
    ]
  },
  { 
    id: 'symbols', 
    label: 'Símbolos', 
    icon: Settings, 
    emojis: [
      '📅', '📝', '📌', '📍', '📈', '📉', '📊', '🛠', '⚙️', '⚖️', '⛓', '🧲', '🧪', '🔭', '📡', '📢', '🔔', '💬', '🗯', '💭',
      '✅', '❌', '⚠️', '🚫', '💯', '🆘', '♻️', '🌐', '🏧', '♿️', '🚾', '🚻', '🚹', '🚺', '⚧', '🏳️', '🏴', '🏁', '🚩', '🃏'
    ]
  }
]

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('smileys')

  const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-white/10 rounded-[28px] text-3xl flex items-center justify-center hover:bg-white/10 transition-all shadow-xl",
          isOpen && "border-white/30 bg-white/10 ring-4 ring-white/5"
        )}
      >
        {value || <Smile className="text-white/20" size={32} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, x: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, x: -20 }}
              className="absolute bottom-full left-0 mb-6 z-[1001] bg-[#1A1A1A] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] w-[320px]"
            >
              {/* Tabs Header */}
              <div className="flex bg-white/2 p-2 gap-1 overflow-x-auto scrollbar-none border-b border-white/5 no-scrollbar">
                {EMOJI_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-2xl transition-all relative flex-1 flex justify-center",
                      activeCategory === cat.id ? "bg-white text-black shadow-lg shadow-white/10" : "text-white/40 hover:bg-white/5"
                    )}
                  >
                    <cat.icon size={16} strokeWidth={2.5} />
                  </button>
                ))}
              </div>

              <div className="p-5">
                <div className="flex justify-between items-center mb-4 px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{currentCategory.label}</span>
                  <button 
                    type="button"
                    onClick={() => { onChange(''); setIsOpen(false); }} 
                    className="text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
                
                <div className="grid grid-cols-5 gap-1 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentCategory.emojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onChange(emoji)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-12 h-12 flex items-center justify-center text-2xl rounded-2xl transition-all duration-200",
                        "hover:bg-white/10 hover:scale-110 active:scale-90",
                        value === emoji ? "bg-white/10 ring-2 ring-white/20" : "hover:shadow-xl"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page indicator dots */}
              <div className="flex justify-center gap-1.5 pb-4">
                {EMOJI_CATEGORIES.map(cat => (
                  <div 
                    key={cat.id} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      activeCategory === cat.id ? "bg-white w-4" : "bg-white/10 w-1"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
